import { CallbackQueryContext, CommandContext, Context } from "grammy";
import { bundlerStatePage1, bundlerStatePage2 } from "../../vars/bundlerState";
import {
  Page2Fields,
  generatePage2Keyboard,
  generatePage2Text,
  page2Fields,
} from "../../utils/bot";
import { teleBot } from "../..";

export async function inputPage2(
  ctx: CallbackQueryContext<Context> | CommandContext<Context>
) {
  const userId = ctx.chat?.id as number;
  if (!bundlerStatePage2[userId]) {
    bundlerStatePage2[userId] = {};
    for (const field in page2Fields) {
      bundlerStatePage2[userId][field as Page2Fields] = undefined;
    }
  }

  const userPage1BundlerData = bundlerStatePage1[userId];
  const dataText = generatePage2Text(ctx);
  const keyboard = generatePage2Keyboard(ctx);

  let text = `Please provide the token metadata:

${dataText}`;

  if (userPage1BundlerData.messageId && ctx.chatId) {
    try {
      await teleBot.api.editMessageText(
        ctx.chatId,
        userPage1BundlerData.messageId,
        text,
        {
          parse_mode: "MarkdownV2",
          reply_markup: keyboard,
        }
      );
    } catch (error) {}
  }
}
