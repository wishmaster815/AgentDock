import chalk from "chalk";
import { isCancel, text } from "@clack/prompts";
import { defaultAgentConfig } from "./types";
import { actionTracker } from "./actionTracker";
import { ToolExecutor } from "./toolExecutor";

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
};
