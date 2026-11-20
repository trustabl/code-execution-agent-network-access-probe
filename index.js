// Trustabl Probe as plain functions, for agents that write and run code in a
// sandbox. Call scan(), filter the result in your own code, and print only what
// the request needs.

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { SANDBOX_IMAGES, checkSetup, nextSteps } from "./lib/environment.js";
import { ensureProbe, probeVersion } from "./lib/probe-bin.js";

export { SANDBOX_IMAGES, checkSetup, ensureProbe, nextSteps };

/** Probe's severities, most severe first. */
export const SEVERITIES = ["critical", "warning", "info"];
const RANK = { critical: 3, warning: 2, info: 1 };
const TIMEOUT_MS = 10 * 60 * 1000;

// eslint-disable-next-line no-control-regex
const stripAnsi = (s) => s.replace(/\x1b\[[0-9;?]*[A-Za-z]/g, "").replace(/\r/g, "");

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

/**
 * Download and verify the Probe binary and, when Docker is running, pull the
 * sandbox images. Never installs system software: nextSteps() in the returned
 * setup lists the commands for the user to run.
 */
export async function install({ languages, pullImages = true } = {}) {
  const binary = await ensureProbe();
  const pulled = [];
  let setup = checkSetup();
  if (setup.docker.daemon && pullImages) {
    for (const lang of languages ?? Object.keys(SANDBOX_IMAGES)) {
      const image = SANDBOX_IMAGES[lang];
      if (!image) throw new Error(`Unknown language ${lang}; use one of ${Object.keys(SANDBOX_IMAGES).join(", ")}`);
      if (setup.images[image]) continue;
      const r = spawnSync("docker", ["pull", image], { encoding: "utf8", timeout: TIMEOUT_MS, windowsHide: true });
      pulled.push({ image, ok: r.status === 0, error: r.status === 0 ? undefined : stripAnsi(r.stderr || r.error?.message || "").trim() });
    }
    setup = checkSetup();
  }
  return { binary, version: probeVersion(binary), pulled, setup, nextSteps: nextSteps(setup) };
}

/**
 * Scan a directory of agent tool code. Static analysis always runs; with
 * sandbox "auto" (default) the tool also runs in a network-blocked sandbox when
 * Docker or OpenShell is ready. Probe writes its reports into the directory.
 */
export async function scan(dir, { entrypoints = [], sandbox = "auto", allowWriteTools = false } = {}) {
  const target = path.resolve(dir ?? ".");
  if (!fs.existsSync(target) || !fs.statSync(target).isDirectory()) throw new Error(`scan(dir): not a directory: ${target}`);
  if (!["auto", "on", "off"].includes(sandbox)) throw new Error(`scan(dir, { sandbox }): use "auto", "on" or "off", not ${sandbox}`);
  const bin = await ensureProbe();

  let runner = null;
  if (sandbox !== "off") {
    runner = checkSetup().sandbox.runner;
    if (!runner && sandbox === "on") throw new Error("No sandbox runner is ready. Check checkSetup() and nextSteps().");
  }

  const args = ["fix", "--source", target, "--no-sign", "--output", "json"];
  for (const ep of entrypoints) args.push("--entrypoint", ep);
  if (runner) args.push("--sandbox", "--runner", runner);
  if (allowWriteTools) args.push("--allow-write-tools");

  const r = spawnSync(bin, args, { encoding: "utf8", timeout: TIMEOUT_MS, maxBuffer: 64 * 1024 * 1024, windowsHide: true });
  const stderr = stripAnsi(r.stderr ?? "");
  if (r.error) throw new Error(`Probe did not finish: ${r.error.message}`);
  if (r.status !== 0) throw new Error(`Probe failed on ${target} (exit ${r.status}):\n${stderr.trim().split("\n").slice(-30).join("\n")}`);

  const files = {
    findings: path.join(target, "probe.findings.json"),
    attestation: path.join(target, "autofix-attestation.json"),
    profile: path.join(target, "probe.profile.json"),
    policy: path.join(target, "network_policies.draft.yaml"),
  };
  const report = readJson(files.findings);
  const attestation = readJson(files.attestation);
  const profile = readJson(files.profile);
  if (!report || !attestation) throw new Error(`Probe ran but did not write its reports to ${target}.\n${stderr.trim().slice(-2000)}`);

  const findings = [...(report.findings ?? [])].sort((a, b) => (RANK[b.severity] ?? 0) - (RANK[a.severity] ?? 0));
  return {
    dir: target,
    readinessScore: attestation.production_readiness_score,
    findings,
    allowList: (attestation.network_calls ?? []).map((c) => `${c.host}:${c.port}`),
    languages: attestation.languages_detected ?? [],
    sandbox: { requested: sandbox, runner, ran: (profile?.tools ?? []).some((t) => t.harness_id) },
    notes: [...new Set(stderr.split("\n").map((l) => l.trim()).filter((l) => /sandbox skipped|sandbox unavailable|warning:/i.test(l)))],
    files,
    report,
    attestation,
    profile,
  };
}

/** A few numbers instead of the whole result: score, findings per severity, allow list, sandbox state. */
export function summarize(result) {
  const findings = Object.fromEntries(SEVERITIES.map((s) => [s, 0]));
  for (const f of result.findings ?? []) findings[f.severity] = (findings[f.severity] ?? 0) + 1;
  return {
    readinessScore: result.readinessScore,
    findings,
    allowList: result.allowList,
    sandboxRan: result.sandbox.ran,
    languages: result.languages,
  };
}

/** The Probe binary's version. */
export async function version() {
  return probeVersion(await ensureProbe());
}
