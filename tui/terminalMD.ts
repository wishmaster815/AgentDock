import { marked } from "marked";
import { markedTerminal } from "marked-terminal";

let ready = false;

const ensureMarked = (): void => {
    if (ready) return;
    const w = Math.max(40, Math.min(process.stdout.columns || 80, 120));
    //   @ts-ignore
    marked.use(markedTerminal({ width: w, reflowText: true }, {}));
    ready = true;
};

export const renderTerminalMarkDown = (source: string): string => {
    return marked.parse(source.trimEnd(), { async: false });
};
