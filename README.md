# Code execution for Trustabl Probe

[Trustabl Probe](https://github.com/trustabl/agent-network-access-probe) as
plain functions, for agents that write and run code in a sandbox.

Instead of calling a tool and receiving Probe's whole report into its context,
an agent writes a short script: it scans, filters the result in code, and
prints only what the request needs. The full result stays in the sandbox.

```js
import { scan, summarize } from "@trustabl/code-execution-agent-network-access-probe";

const result = await scan("./tools/weather");
console.log(summarize(result));       // readiness score, findings per severity, allow list
console.log(result.allowList);        // e.g. ["api.example.com:443"]
```

On the one-file tool in `test/fixture`, the full result is 6,434 characters; a
summary plus the critical findings' titles is 284.

This package sits alongside Probe's CLI, MCP server and plugins. It does not
replace any of them.

## Install

```bash
npm install @trustabl/code-execution-agent-network-access-probe
```

Node 20 or later. On first use the package downloads the pinned Probe release
for your OS and architecture from GitHub Releases, checks it against the
release's `checksums.txt`, and caches it in `~/.trustabl-code-execution/probe/`.
A binary that does not match is never run.

| Variable | Effect |
| --- | --- |
| `PROBE_BIN` | Use this Probe binary instead of downloading one. |
| `PROBE_VERSION` | Download this release tag instead of the pinned one. |
| `GITHUB_TOKEN` | Authenticate the download, to avoid GitHub's anonymous rate limit. |

## API

- `scan(dir, options?)`: scan a directory of agent tool code (Python, Go,
  JavaScript/TypeScript, Ruby, Shell). Static analysis always runs. With
  `sandbox: "auto"` (default) the tool also runs in a network-blocked sandbox
  when Docker or OpenShell is ready; `"off"` is static only; `"on"` fails
  without a runner. Other options: `entrypoints`, `allowWriteTools`.
  Resolves to `readinessScore`, `findings` (worst first, each with a
  `fix_hint`), `allowList`, `languages`, `sandbox`, `notes`, `files`, and the
  raw `report`, `attestation` and `profile`. Probe writes
  `network_policies.draft.yaml` and its reports into the scanned directory.
- `summarize(result)`: score, findings per severity, allow list, whether the
  sandbox ran.
- `checkSetup()`: read-only check of the binary, Docker, sandbox images,
  OpenShell and Python. `nextSteps(setup)` lists what is missing; steps with
  `who: "you"` are commands for the user to run, with their permission.
- `install(options?)`: downloads the binary and pulls the sandbox images. It
  never installs system software.
- `version()`: the Probe binary's version.

Types ship in `index.d.ts`.

## Skill

`skills/code-execution-agent-network-access-probe/SKILL.md` teaches an agent
this workflow. Copy it into your agent's skills folder.

## Sandbox

The `Dockerfile` builds a reference sandbox with Node, this package and a
verified binary. Inside it Probe runs static analysis; its own sandbox runs
need Docker or OpenShell on the host.

```bash
docker build -t code-execution-agent-network-access-probe .
docker run --rm -v "$PWD:/workspace" code-execution-agent-network-access-probe node script.mjs
```

## License

Apache-2.0
