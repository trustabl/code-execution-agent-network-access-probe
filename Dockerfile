# Reference sandbox: Node, the package and a verified Probe binary, ready for an
# agent to run scripts against. Scripts anywhere under / can
# `import ... from "@trustabl/code-execution-agent-network-access-probe"`.
#
# Inside this image Probe runs static analysis (scan(dir, { sandbox: "off" })):
# its own sandbox runs need Docker or OpenShell on the host.
#
#   docker build -t code-execution-agent-network-access-probe .
#   docker run --rm -v "$PWD:/workspace" code-execution-agent-network-access-probe node script.mjs
FROM node:22-slim

RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates \
 && rm -rf /var/lib/apt/lists/*

# ESM resolution walks up to /node_modules, so every script in the container finds the package.
COPY package.json index.js index.d.ts /node_modules/@trustabl/code-execution-agent-network-access-probe/
COPY lib /node_modules/@trustabl/code-execution-agent-network-access-probe/lib

# Download and verify the binary at build time, so the sandbox needs no GitHub access to start scanning.
RUN cd / && node --input-type=module -e "import { version } from '@trustabl/code-execution-agent-network-access-probe'; console.log(await version())"

WORKDIR /workspace
