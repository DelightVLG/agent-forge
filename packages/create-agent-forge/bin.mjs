#!/usr/bin/env node
// Thin initializer so that `pnpm create @delightvlg/agent-forge my-app` works.
// It simply forwards its arguments to `agentforge new ...`.
import { main } from "@delightvlg/agent-forge";

const forwarded = ["new", ...process.argv.slice(2)];
await main([process.argv[0], "agentforge", ...forwarded]);
