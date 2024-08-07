import { CommandContext, Context } from "grammy";
import { teleBot } from "../..";
import { log } from "../../utils/handlers";
import { executeStep } from "../executeStep";
import { inputPage1 } from "./inputPage1";

export function initiateBotCommands() {
  teleBot.api.setMyCommands([
    { command: "start", description: "Start the bot" },
  ]);

  teleBot.command("start", (ctx) => inputPage1(ctx));

  teleBot.on([":photo"], (ctx) => {
    executeStep(ctx as CommandContext<Context>);
  });

  teleBot.on(["message"], (ctx) => {
    executeStep(ctx as CommandContext<Context>);
  });

  log("Bot commands up");
}
