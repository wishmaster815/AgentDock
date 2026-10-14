#!/usr/bin/env bun

import { Command } from "commander";
import { runWakeUp } from "./tui/wakeup";

const program = new Command();

program
    .name("agent-dock")
    .description("AgentDock CLI project")
    .version("0.0.1");

program
    .command("wakeup")
    .description("Show the banner and pick CLI or Telegram mode")
    .action(async () => {
        await runWakeUp();
    });

program.action(async () => {
    await runWakeUp();
});

await program.parseAsync(process.argv);
