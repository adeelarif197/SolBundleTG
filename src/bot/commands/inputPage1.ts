import { CallbackQueryContext, CommandContext, Context } from "grammy";
import { BOT_USERNAME } from "../../utils/env";
import {
  bundlerStatePage1,
  bundlerStatePage2,
  updateBundlerStatePage1,
} from "../../vars/bundlerState";
import { teleBot } from "../../index";
import {
  Page1Fields,
  generatePage1Keyboard,
  generatePage1Text,
  page1Fields,
} from "../../utils/bot";

export async function inputPage1(
  ctx: CommandContext<Context> | CallbackQueryContext<Context>
) {
  const userId = ctx.chat?.id as number;
  const msgText = ctx.message?.text;

  // Reset everything if a new /start
  if (
    msgText === "/start" &&
    (bundlerStatePage1[userId] || bundlerStatePage2[userId])
  ) {
    const { messageId } = bundlerStatePage1[userId];

    if (messageId) ctx.deleteMessages([messageId]);

    delete bundlerStatePage1[userId];
    delete bundlerStatePage2[userId];
  }

  // Fill up states for the user
  if (!bundlerStatePage1[userId]) {
    bundlerStatePage1[userId] = {};
    for (const field in page1Fields) {
      bundlerStatePage1[userId][field as Page1Fields] = undefined;
    }
  }

  const userPage1BundlerData = bundlerStatePage1[userId];
  const dataText = generatePage1Text(ctx);
  const keyboard = generatePage1Keyboard(ctx);

  let text = `*Welcome to ${BOT_USERNAME}\\!*
  
Please provide all the required information:

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
  } else {
    const message = await ctx.reply(text, {
      parse_mode: "MarkdownV2",
      reply_markup: keyboard,
    });
    const messageId = message.message_id;
    updateBundlerStatePage1(userId, { messageId });
  }
}
