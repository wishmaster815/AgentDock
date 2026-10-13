import { Markup } from "telegraf";

import { clip } from "./text.ts";
import type { ActionLog } from "../agent/types.ts";
import type { ToolExecutor } from "../agent/toolExecutor.ts";
import type { actionTracker } from "../agent/actionTracker.ts";
import { composeBeforeAfter, formatPatch } from "../agent/diffView.ts";

export interface ApprovalSession {
    tracker: actionTracker;
    executor: ToolExecutor;
    pending: ActionLog[];
}

export const approvalSessions = new Map<number, ApprovalSession>();

const groupPending = (pending: ActionLog[]) => {
    const files = new Map<string, ActionLog[]>();
    const shells: ActionLog[] = [];
    for (const a of pending) {
        if (a.type === "tool_execute") shells.push(a);
        else {
            if (!files.has(a.path)) files.set(a.path, []);
            files.get(a.path)!.push(a);
        }
    }
    return { files, shells };
};

export const approvalSummary = (pending: ActionLog[]): string => {
    const { files, shells } = groupPending(pending);
    const fileLines = [...files].map(([path, actions]) => {
        const types = [
            ...new Set(actions.map((a) => a.type.replace(/_/g, " "))),
        ].join(", ");
        return `📄 ${path} (${types})`;
    });
    const shellLines = shells.map((s) => `🖥 Shell: ${s.details.command}`);
    return [
        "Staged changes — review before applying",
        "",
        ...fileLines,
        ...shellLines,
        "",
        `Total: ${pending.length} change(s)`,
    ].join("\n");
};

export const approvalDiff = (pending: ActionLog[]): string => {
    const { files, shells } = groupPending(pending);
    const parts: string[] = [];
    for (const [filePath, actions] of files) {
        const sorted = [...actions].sort(
            (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
        );
        const { before, after } = composeBeforeAfter(sorted);
        parts.push(clip(formatPatch(filePath, before, after), 1500));
    }
    for (const s of shells) parts.push(`🖥 Shell: ${s.details.command}`);
    return parts.join("\n\n").trim();
};

const promptApproval = async (
    ctx: { reply: (t: string, o?: object) => Promise<unknown> },
    chatId: number,
    session: ApprovalSession,
) => {
    approvalSessions.set(chatId, session);
    await ctx.reply(approvalSummary(session.pending), {
        ...Markup.inlineKeyboard([
            [Markup.button.callback("📋 Show Diff", "approval_diff")],
            [
                Markup.button.callback("✅ Accept All", "approval_accept"),
                Markup.button.callback("❌ Reject All", "approval_reject"),
            ],
        ]),
    });
};

export const finishOrApprove = async (
    ctx: { reply: (t: string, o?: object) => Promise<unknown> },
    chatId: number,
    tracker: actionTracker,
    executor: ToolExecutor,
    noChangesMsg: string,
) => {
    const pending = tracker.getPendingMutations();
    if (pending.length === 0) {
        await ctx.reply(noChangesMsg);
        return;
    }
    await promptApproval(ctx, chatId, { tracker, executor, pending });
};
