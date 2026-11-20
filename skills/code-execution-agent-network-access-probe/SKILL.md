---
name: code-execution-agent-network-access-probe
description: Check an agent tool's network access and runtime behaviour with Trustabl Probe by writing and running a short script, then report only what the user asked for. Use when the user wants to know which hosts a tool calls, draft a network allow list (an OpenShell network policy), or find tool problems such as calls with no timeout, and you can run code (a sandbox, a container, or a terminal).
---

# Trustabl Probe, by code execution

Do not paste the full Probe result into the conversation. Write a script that
scans, filters in code, and prints only what the request needs.

## Setup (once per sandbox)

```bash
npm install @trustabl/code-execution-agent-network-access-probe
```

Needs Node 20+ and network access to github.com: the first call downloads the
pinned Probe release and verifies it against the release `checksums.txt`. It
refuses to run a binary that does not match. Set `GITHUB_TOKEN` if GitHub
rate-limits the download.

## The API

```js
import { scan, summarize, checkSetup, nextSteps, install } from "@trustabl/code-execution-agent-network-access-probe";

const result = await scan("./tools/weather");   // a directory of tool code
const s = summarize(result);                     // { readinessScore, findings: {critical, warning, info}, allowList, sandboxRan, languages }
```

`scan(dir, options)` options:
- `sandbox`: `"auto"` (default) also runs the tool in a network-blocked sandbox
  when Docker or OpenShell is ready; `"off"` is static analysis only; `"on"`
  fails without a runner.
- `entrypoints`: files to treat as entry points, e.g. `["tool.py"]`.
- `allowWriteTools`: also run tools that look destructive in the sandbox. Only
  when the user asks.

The result has `readinessScore` (0-100), `findings` (worst first; each has
`severity`, `title`, `file`, `fix_hint`, `evidence`), `allowList`
(`host:port`), `languages`, `sandbox`, `notes` and `files`. Probe writes
`network_policies.draft.yaml`, `probe.findings.json`, `probe.profile.json` and
`autofix-attestation.json` into the scanned directory.

`checkSetup()` is read-only. `nextSteps(checkSetup())` lists what is missing;
steps with `who: "you"` install system software (Docker, OpenShell, Python):
show them to the user and run them only with their permission. `install()`
downloads the binary and pulls sandbox images; it never installs system
software.

## Patterns

Allow list only:

```js
console.log((await scan(".")).allowList.join("\n"));
```

Critical findings with their fixes:

```js
const r = await scan(".");
for (const f of r.findings.filter((f) => f.severity === "critical")) {
  console.log(`${f.title} (${f.file})\n  fix: ${f.fix_hint}`);
}
```

## Reading results honestly

- Check `result.sandbox.ran`: when false, only static analysis ran and
  runtime-only problems were not checked. Say so.
- Probe does not change code. Apply each `fix_hint` yourself, then scan again.
- The allow list is a draft policy, unsigned. Review it before enforcing it.
