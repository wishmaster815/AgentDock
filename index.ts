#!/usr/bin/env bun

import { argv } from "bun";
import { Command } from "commander";
import { runWakeUp } from "./tui/wakeup";
const program = new Command;

program
    .name("agent-dock")
    .description("AgentDock cli project")
    .version("0.0.1");

program
    .command("wakeup")
    .description("Show the banner and pick cli or telegram mode")
    .action(async () => {
        await (runWakeUp())
    });
await program.parseAsync(process.argv)