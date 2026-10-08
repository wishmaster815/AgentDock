import chalk from "chalk";
import ora from "ora";
import { isCancel, text } from "@clack/prompts";
import { defaultAgentConfig } from "./types";
import { actionTracker } from "./actionTracker";
import { ToolExecutor } from "./toolExecutor";
import { createAgentTools } from "./agentTools";
import { stepCountIs, ToolLoopAgent } from "ai";
import { getAgentModel } from "../../ai";
import { renderTerminalMarkDown } from "../../tui/terminalMD";
import { runApprovalFlow } from "./runApproval";

const MAX_STEPS = 30;

const truncate = (value: unknown, max = 200): string => {
    let raw: string;
    try {
        raw = typeof value === "string" ? value : (JSON.stringify(value) ?? "");
    } catch {
        raw = String(value);
    }
    raw = raw.replace(/\s+/g, " ").trim();
    return raw.length > max ? raw.slice(0, max) + "..." : raw;
};

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
        stopWhen: stepCountIs(MAX_STEPS),
        instructions: [
            `Workspace root: ${config.codebasePath}`,
            "All mutations are staged until approval.",
        ].join("\n"),
        tools,
    });

    const spin = ora({ text: "Step 1: thinking...", color: "cyan" });
    let stepNo = 0;
    let totalTokens = 0;

    // Print log lines above the spinner without garbling it
    const log = (...lines: string[]) => {
        spin.clear();
        for (const l of lines) console.log(l);
        spin.render();
    };

    let result: Awaited<ReturnType<typeof agent.generate>>;
    spin.start();
    try {
        result = await agent.generate({
            prompt: goal.trim(),
            onStepFinish: (step) => {
                stepNo++;
                const {
                    toolCalls,
                    toolResults,
                    text: stepText,
                    finishReason,
                    usage,
                } = step;

                const tokens = usage?.totalTokens ?? 0;
                totalTokens += tokens;

                const out: string[] = [];
                out.push(
                    chalk.cyan.bold(`\n● Step ${stepNo}`) +
                        chalk.dim(
                            ` (${finishReason}${tokens ? `, ${tokens} tokens` : ""})`,
                        ),
                );

                // Model's own text/reasoning for this step
                if (stepText?.trim()) {
                    out.push(chalk.dim("  💬 ") + truncate(stepText, 300));
                }

                // Tool calls
                for (const tc of toolCalls ?? []) {
                    out.push(
                        chalk.yellow("  → ") +
                            chalk.bold(String(tc.toolName)) +
                            chalk.dim(" " + truncate(tc.input, 160)),
                    );
                }

                // Tool results
                for (const tr of toolResults ?? []) {
                    out.push(
                        chalk.green("  ✓ ") +
                            chalk.bold(String(tr.toolName)) +
                            chalk.dim(" → " + truncate(tr.output, 160)),
                    );
                }

                log(...out);
                spin.text = `Step ${stepNo + 1}: thinking...`;
            },
        });
        spin.succeed(
            `Agent finished in ${stepNo} step${stepNo === 1 ? "" : "s"}` +
                (totalTokens ? chalk.dim(` · ${totalTokens} tokens`) : ""),
        );
    } catch (err) {
        spin.fail(`Agent failed at step ${stepNo + 1}`);
        throw err;
    }

    if (result.text?.trim()) {
        console.log("\n" + renderTerminalMarkDown(result.text));
    }

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
