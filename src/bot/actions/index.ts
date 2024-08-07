import { CallbackQueryContext, Context } from "grammy";
import { teleBot } from "../..";
import { log } from "../../utils/handlers";
import { executeStep } from "../executeStep";

export function initiateCallbackQueries() {
  teleBot.on("callback_query:data", (ctx) =>
    executeStep(ctx as CallbackQueryContext<Context>)
  );

  log("Bot callback queries up");
}
