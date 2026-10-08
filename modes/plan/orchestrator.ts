import chalk from "chalk";
import { confirm, isCancel, text } from "@clack/prompts";
import ora from "ora";
import { ToolLoopAgent, stepCountIs } from "ai";
import { getAgentModel } from "../../ai";
import { actionTracker } from "../agent/actionTracker";
import { defaultAgentConfig } from "../agent/types";
import { renderTerminalMarkDown } from "../../tui/terminalMD";
import { runApprovalFlow } from "../agent/runApproval";
import { ToolExecutor } from "../agent/toolExecutor";
import { generatePlan } from "./planner";
import { printPlan, selectSteps } from "./selction";
import { createPlanTools } from "./planTools";
import type { PlanStep } from "./types";
import { createWebTools } from "./webTools";

const MAX_STEPS = 30;

const stepPrompt = (
    goal: string,
    step: PlanStep,
    done: string[] = [],
): string =>
    [
        `Overall goal: ${goal}`,
        `Current step: ${step.title}`,
        step.description,
        step.hints?.length ? `Hints:\n- ${step.hints.join("\n- ")}` : "",
        done.length ? `Already completed:\n- ${done.join("\n- ")}` : "",
        "",
        "Carry out this step now using the available tools. Do not ask the user questions or offer further help; just do the work and report briefly what you did.",
    ]
        .filter(Boolean)
        .join("\n");

// Turns any value into a short single-line preview for logging
const truncate = (value: unknown, max = 160): string => {
    let raw: string;
    try {
        raw = typeof value === "string" ? value : (JSON.stringify(value) ?? "");
    } catch {
        raw = String(value);
    }
    raw = raw.replace(/\s+/g, " ").trim();
    return raw.length > max ? raw.slice(0, max) + "..." : raw;
};

export const runPlanMode = async () => {
    console.log("Running Plan Mode!");
    const goal = await text({
        message: "What is your goal",
    });
    if (isCancel(goal) || !goal.trim()) return;

    const plan = await generatePlan(goal);

    printPlan(plan);
    const selected = await selectSteps(plan);
    if (selected.length === 0) return;

    const proceed = await confirm({
        message: `Execute ${selected.length} step(s)?`,
        initialValue: true,
    });
    if (isCancel(proceed) || !proceed) return;

    const config = defaultAgentConfig();
    config.tools.allowFileCreation = true;
    // config.tools.allowFileModification = true; // enable if steps should edit existing files
    const tracker = new actionTracker();
    const executor = new ToolExecutor(tracker, config);

    const tools = {
        ...createWebTools(tracker),
        ...createPlanTools(executor),
    };

    const completed: string[] = [];

    for (const [index, step] of selected.entries()) {
        const label = `[${index + 1}/${selected.length}] ${step.title}`;
        console.log(chalk.bold(`\n🔧 ${label}\n`));

        const agent = new ToolLoopAgent({
            model: getAgentModel(),
            stopWhen: stepCountIs(MAX_STEPS),
            instructions: [
                `Workspace root: ${config.codebasePath}`,
                "You are executing one step of an approved plan.",
                "Use the tools to make the changes. All mutations are staged until the user approves them.",
                "Never end by asking questions; finish the step and summarize.",
            ].join("\n"),
            tools,
        });

        const spin = ora({ text: `${label}: thinking...`, color: "cyan" });
        let stepNo = 0;
        let totalTokens = 0;

        // Print log lines above the spinner without garbling it
        const log = (...lines: string[]) => {
            spin.clear();
            for (const l of lines) console.log(l);
            spin.render();
        };

        spin.start();
        try {
            const r = await agent.generate({
                prompt: stepPrompt(plan.goal, step, completed),
                onStepFinish: (s) => {
                    stepNo++;
                    const { toolCalls, toolResults, finishReason, usage } = s;

                    const tokens = usage?.totalTokens ?? 0;
                    totalTokens += tokens;

                    const out: string[] = [
                        chalk.cyan.bold(`  ● Step ${stepNo}`) +
                            chalk.dim(
                                ` (${finishReason}${tokens ? `, ${tokens} tokens` : ""})`,
                            ),
                    ];

                    for (const tc of toolCalls ?? []) {
                        out.push(
                            chalk.yellow("    → ") +
                                chalk.bold(String(tc.toolName)) +
                                chalk.dim(" " + truncate(tc.input)),
                        );
                    }

                    for (const tr of toolResults ?? []) {
                        out.push(
                            chalk.green("    ✓ ") +
                                chalk.bold(String(tr.toolName)) +
                                chalk.dim(" → " + truncate(tr.output)),
                        );
                    }

                    log(...out);
                    spin.text = `${label}: working (step ${stepNo + 1})...`;
                },
            });

            completed.push(step.title);

            spin.succeed(
                `${label} done in ${stepNo} step${stepNo === 1 ? "" : "s"}` +
                    (totalTokens ? chalk.dim(` · ${totalTokens} tokens`) : ""),
            );

            if (r.text?.trim()) {
                console.log("\n" + renderTerminalMarkDown(r.text) + "\n");
            }
        } catch (err) {
            spin.fail(`${label} failed at step ${stepNo + 1}`);
            throw err;
        }
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
