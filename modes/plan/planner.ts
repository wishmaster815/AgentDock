import {
    Output,
    extractJsonMiddleware,
    generateText,
    stepCountIs,
    tool,
    wrapLanguageModel,
} from "ai";
import { z } from "zod";
import chalk from "chalk";
import ora from "ora";
import { getAgentModel } from "../../ai/ai.config.ts";
import { defaultAgentConfig } from "../agent/types.ts";
import type { Plan, PlanStep } from "./types.ts";
import { actionTracker } from "../agent/actionTracker.ts";
import { ToolExecutor } from "../agent/toolExecutor.ts";
import { createPlanTools } from "./planTools.ts";
import { createWebTools } from "./webTools.ts";

const MAX_STEPS = 20;

const planSchema = z.object({
    researchSummary: z.string().optional(),
    steps: z
        .array(
            z.object({
                title: z.string(),
                description: z.string(),
                hints: z.array(z.string()).optional(),
                complexity: z.enum(["low", "medium", "high"]).optional(),
            }),
        )
        .min(1)
        .max(15),
});

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

const PLAN_INSTRUCTIONS = (codebase: string, hasWeb: boolean) =>
    [
        "You are a Plan-Mode planner. You DO NOT modify files.",
        `Workspace: ${codebase}`,
        "Use read-only tools for codebase/skills research.",
        hasWeb
            ? "Web tools are available (web_search/web_crawl/fetch_url). Use only when needed."
            : "Web tools are unavailable (no FIRECRAWL_API_KEY).",
        "Output must match the provided JSON schema.",
        "Keep it short: 1–15 steps.",
    ].join("\n");

export const generatePlan = async (goal: string) => {
    const config = defaultAgentConfig();
    const tracker = new actionTracker();
    const executor = new ToolExecutor(tracker, config);

    const hasWeb = !!process.env.FIRECRAWL_API_KEY;
    const model = wrapLanguageModel({
        model: getAgentModel(),
        middleware: extractJsonMiddleware(),
    });

    const tools = {
        ...createPlanTools(executor),
        ...createWebTools(tracker),
    };

    const spin = ora({
        text: "Researching & drafting a plan (step 1)...",
        color: "cyan",
    });
    let stepNo = 0;
    let totalTokens = 0;

    // Print log lines above the spinner without garbling it
    const log = (...lines: string[]) => {
        spin.clear();
        for (const l of lines) console.log(l);
        spin.render();
    };

    spin.start();
    let output: z.infer<typeof planSchema> | undefined;
    try {
        const result = await generateText({
            model,
            tools,
            stopWhen: stepCountIs(MAX_STEPS),
            system: PLAN_INSTRUCTIONS(config.codebasePath, hasWeb),
            prompt: `User goal: \n${goal}`,
            output: Output.object({ schema: planSchema }),
            onStepFinish: (step) => {
                stepNo++;
                const { toolCalls, toolResults, finishReason, usage } = step;

                const tokens = usage?.totalTokens ?? 0;
                totalTokens += tokens;

                const out: string[] = [
                    chalk.cyan.bold(`\n● Step ${stepNo}`) +
                        chalk.dim(
                            ` (${finishReason}${tokens ? `, ${tokens} tokens` : ""})`,
                        ),
                ];

                for (const tc of toolCalls ?? []) {
                    out.push(
                        chalk.yellow("  → ") +
                            chalk.bold(String(tc.toolName)) +
                            chalk.dim(" " + truncate(tc.input)),
                    );
                }

                for (const tr of toolResults ?? []) {
                    out.push(
                        chalk.green("  ✓ ") +
                            chalk.bold(String(tr.toolName)) +
                            chalk.dim(" → " + truncate(tr.output)),
                    );
                }

                log(...out);
                spin.text = `Researching & drafting a plan (step ${stepNo + 1})...`;
            },
        });
        spin.text = "Validating plan...";
        output = result.output;
    } catch (err) {
        spin.fail(`Planning failed at step ${stepNo + 1}`);
        throw err;
    }

    let validated: z.infer<typeof planSchema>;
    try {
        validated = planSchema.parse(output);
    } catch (err) {
        spin.fail("Plan did not match the expected format");
        throw err;
    }

    spin.succeed(
        `Plan ready in ${stepNo} step${stepNo === 1 ? "" : "s"}` +
            (totalTokens ? chalk.dim(` · ${totalTokens} tokens`) : ""),
    );

    const steps: PlanStep[] = validated.steps.map((s, i) => ({
        id: `step-${i + 1}`,
        title: s.title,
        description: s.description,
        hints: s.hints,
        complexity: s.complexity,
    }));

    return { goal, researchSummary: validated.researchSummary, steps };
};
