import chalk from "chalk";
import { select, isCancel } from "@clack/prompts";

export const runCliMode = async () => {
    while (true) {

        const mode = await select({
            message: "Select cli sub mode",
            options: [
                { value: "agent", label: "AGENT" },
                { value: "plan", label: "PLAN" },
                { value: "ask", label: "ASK" },
                { value: "back", label: "BACK TO MAIN MENU" }
            ]
        })

        if (isCancel(mode) || (mode === "back")) return;

        if (mode === "agent") { }
        if (mode === "plan") { }
        if (mode === "ask") { }
        if (mode !== "agent" && mode !== "plan" && mode !== "ask") {
            console.log(chalk.red("Choose from the given options only"));
        }
    }
}