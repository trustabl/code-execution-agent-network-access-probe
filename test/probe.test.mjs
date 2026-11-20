import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import { checkSetup, nextSteps, scan, summarize, version } from "../index.js";
import { assetName, expectedChecksum, normalizeTag, platformTarget, setting } from "../lib/probe-bin.js";

const fixture = path.join(path.dirname(fileURLToPath(import.meta.url)), "fixture");

test("asset names match the release matrix", () => {
  assert.equal(assetName("v0.5.0", platformTarget("linux", "x64")), "autofix_0.5.0_linux_amd64.tar.gz");
  assert.equal(assetName("v0.5.0", platformTarget("darwin", "arm64")), "autofix_0.5.0_darwin_arm64.tar.gz");
  assert.equal(assetName("v0.5.0", platformTarget("win32", "arm64")), "autofix_0.5.0_windows_amd64.zip");
  assert.throws(() => platformTarget("aix", "x64"));
});

test("checksum lookup matches the exact asset only", () => {
  const sums = "aaa  autofix_0.5.0_linux_amd64.tar.gz\nbbb  autofix_0.5.0_linux_amd64.tar.gz.sbom\n";
  assert.equal(expectedChecksum(sums, "autofix_0.5.0_linux_amd64.tar.gz"), "aaa");
  assert.equal(expectedChecksum(sums, "autofix_0.5.0_darwin_arm64.tar.gz"), null);
});

test("settings ignore unsubstituted placeholders", () => {
  assert.equal(setting("${PROBE_VERSION}"), undefined);
  assert.equal(normalizeTag("0.5.0"), "v0.5.0");
});

test("summarize counts findings", () => {
  const s = summarize({ readinessScore: 80, findings: [{ severity: "warning" }, { severity: "critical" }], allowList: ["a:443"], sandbox: { ran: false }, languages: ["python"] });
  assert.deepEqual(s.findings, { critical: 1, warning: 1, info: 0 });
  assert.deepEqual(s.allowList, ["a:443"]);
});

test("scan() rejects a missing directory", async () => {
  await assert.rejects(scan(path.join(fixture, "nope")), /not a directory/);
});

test("checkSetup() reports every piece without changing anything", () => {
  const s = checkSetup();
  for (const key of ["probe", "docker", "images", "openshell", "python", "sandbox"]) assert.ok(key in s, key);
  assert.ok(Array.isArray(nextSteps(s)));
});

// Downloads and verifies the real release binary, then scans a copy of the fixture (Probe writes reports into it).
test("scans a real tool end to end, static only", { timeout: 300_000 }, async () => {
  assert.ok(await version());
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "probe-fixture-"));
  fs.cpSync(fixture, dir, { recursive: true });
  try {
    const result = await scan(dir, { sandbox: "off" });
    assert.ok(result.allowList.some((h) => h.startsWith("api.example.com")), `allow list: ${result.allowList}`);
    assert.ok(result.findings.length > 0, "expected a finding for the call with no timeout");
    assert.equal(typeof result.readinessScore, "number");
    assert.equal(result.sandbox.ran, false);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
