import chalk from "chalk";
import { isCancel, text } from "@clack/prompts";
import { defaultAgentConfig } from "./types";
import { actionTracker } from "./actionTracker";
import { ToolExecutor } from "./toolExecutor";
import { createAgentTools } from "./agentTools";
import { stepCountIs, ToolLoopAgent } from "ai";
import { getAgentModel } from "../../ai";
import { renderTerminalMarkDown } from "../../tui/terminalMD";
import { runApprovalFlow } from "./runApproval";

export const runAgentMode = async () => {
    console.log("Agent mode activated");
    const goal = await text({
        message: "What would you like the agent to do for you",
        placeholder: "Test the file for potential bugs",
    });
    if (isCancel(goal) || !goal.trim()) return;

    const config = defaultAgentConfig();
    const tracker = new actionTracker();
    const executor = new ToolExecutor(tracker, config);
    const tools = createAgentTools(executor);
    const agent = new ToolLoopAgent({
        model: getAgentModel(),
        stopWhen: stepCountIs(30),
        instructions: [
            `Workspace root: ${config.codebasePath}`,
            "All mutations are staged until approval.",
        ].join("\n"),
        tools,
    });

    const result = await agent.generate({
        prompt: goal.trim(),
        onStepFinish: ({ toolCalls }) => {
            for (const tc of toolCalls) {
                const preview = JSON.stringify(tc.input).slice(0, 160);
                console.log(
                    chalk.green("  ✓"),
                    chalk.bold(String(tc.toolName)),
                    chalk.dim(preview + (preview.length >= 160 ? "..." : "")),
                );
            }
        },
    });
    if (result.text?.trim()) console.log(renderTerminalMarkDown(result.text));
    const ok = await runApprovalFlow(tracker);
    if (!ok) return executor.clearStaging();

    const { errors } = executor.applyApprovedFromTracker();

    if (errors.length) {
        console.log(chalk.red("\nSome operations reported errors:\n"));
        for (const e of errors) console.log(chalk.red(`  • ${e}`));
    } else {
        console.log(chalk.green("\n✓ Applied.\n"));
    }

    executor.clearStaging();
};
