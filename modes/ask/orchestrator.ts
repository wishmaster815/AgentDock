import chalk from "chalk";
import { confirm, isCancel, log, text } from "@clack/prompts";
import { ToolLoopAgent, stepCountIs } from "ai";
import { getAgentModel } from "../../ai";
import { createAskTools } from "./askTools";
import { actionTracker } from "../agent/actionTracker";
import { defaultAgentConfig } from "../agent/types";
import { renderTerminalMarkDown } from "../../tui/terminalMD";
import { runApprovalFlow } from "../agent/runApproval";
import { ToolExecutor } from "../agent/toolExecutor";

const asMd = (question: string, answer: string): string => {
    return `# Ask Mode\n\n## Question\n\n${question.trim()}\n\n## Answer\n\n${answer.trim()}\n`;
};

export const runAskMode = async () => {
    console.log(chalk.bold("\n❓ Ask Mode\n"));

    const question = await text({
        message: "What do you want to ask?",
    });
    if (isCancel(question) || !question.trim()) return;

    const config = defaultAgentConfig();
    config.tools.allowFileCreation = true;
    config.tools.allowFolderCreation = false;
    config.tools.allowShellExecution = false;
    config.tools.allowFileModification = false;

    const tracker = new actionTracker();
    const executor = new ToolExecutor(tracker, config);

    const tools = {
        ...createAskTools(executor),
        // TODO: will add web search funcitonality tool as well therefore did spread here
    };

    const agent = new ToolLoopAgent({
        model: getAgentModel(),
        stopWhen: stepCountIs(20),
        tools,
    });

    const result = await agent.generate({
        prompt: question.trim(),
    });
    const answer = result.text?.trim() || "(no answer)";
    console.log("\n" + renderTerminalMarkDown(answer) + "\n");
    const wantsSave = await confirm({
        message: "Save this answer to a .md file in the current directory?",
        initialValue: false,
    });
    if (isCancel(wantsSave) || !wantsSave) return;

    const filename = await text({
        message: "Filename",
        defaultValue: "ask.md",
        validate: (v) => {
            const s = (v ?? "").trim();
            if (!s) return "Required";
            if (s.includes("..") || s.includes("/") || s.includes("\\"))
                return "No paths";
            if (!s.toLowerCase().endsWith(".md")) return "Must end with .md";
        },
    });
    if (isCancel(filename)) return;
    executor.createFile(filename, asMd(question, answer));
    const ok = await runApprovalFlow(tracker);
    if (!ok) return executor.clearStaging();

    executor.applyApprovedFromTracker();
    executor.clearStaging();
};
