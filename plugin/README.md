# code-execution-agent-network-access-probe

Trustabl Probe, by code execution. This plugin gives your coding agent one skill:
it installs the npm package [`@trustabl/code-execution-agent-network-access-probe`](https://www.npmjs.com/package/@trustabl/code-execution-agent-network-access-probe),
writes a short script against it, runs it, and reports only what you asked for.
The full result stays on your machine instead of filling the conversation.

It is a separate plugin from Trustabl's MCP-server plugins and sits alongside them.

## What it does on your machine

- **Installs the npm package** `@trustabl/code-execution-agent-network-access-probe` (no runtime dependencies) when the agent first needs it.
- **Downloads the pinned Probe release from [trustabl/agent-network-access-probe](https://github.com/trustabl/agent-network-access-probe/releases)** on first use, verifies it against the release `checksums.txt`, and refuses to run a binary that does not match. It is cached under `~/.trustabl-code-execution/`.
- **Sandbox runs are optional.** When Docker or OpenShell is ready, Probe runs the tool in a network-blocked sandbox and may pull the sandbox base images. It never installs system software; it tells you the command to run.
- **Probe writes its reports** (`network_policies.draft.yaml`, `probe.findings.json` and others) into the scanned directory.
- **Everything runs locally.** No account, no API key, no source code upload, and no model in the analysis.

The plugin ships no scripts, hooks or MCP servers: only the skill (Markdown) and a logo.

## Requirements

Node 20 or later, and network access to npmjs.com and github.com for the first install.

## Privacy

The plugin does not collect personal data and sends nothing to Trustabl. The
only network calls are the package install from npm and the release and rules
downloads from GitHub described above. See the
[privacy policy](https://trustabl.ai/privacy) · privacy@trustabl.ai

## License

Apache-2.0
