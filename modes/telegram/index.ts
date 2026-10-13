import { Telegraf } from "telegraf";
import chalk from "chalk";
import { WELCOME } from "./constants";
import { registerHandlers } from "./handlers";

export const runTelegramMode = async () => {
    const token = process.env.TELEGRAM_API_TOKEN;
    const ownerId = process.env.TELEGRAM_USER_TOKEN;

    const bot = new Telegraf(token!);
    registerHandlers(bot);

    await bot.telegram.sendMessage(ownerId!, WELCOME, {
        parse_mode: "Markdown",
    });
    bot.launch();
    console.log(
        chalk.green(
            "Telegram bot is running!, press CTRL + C to terminate the bot",
        ),
    );

    await new Promise<void>((resolve) => {
        const stop = () => {
            bot.stop("SIGINT");
            resolve();
        };
        process.once("SIGINT", stop);
        process.once("SIGTERM", stop);
    });
};
