#!/usr/bin/env node
// Thin initializer so that `pnpm create agentforge my-app` works.
// It simply forwards its arguments to `agentforge new ...`.
import { main } from "agentforge";

const forwarded = ["new", ...process.argv.slice(2)];
await main([process.argv[0], "agentforge", ...forwarded]);
