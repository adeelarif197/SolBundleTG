import { CallbackQueryContext, CommandContext, Context } from "grammy";
import { userState } from "../../vars/userState";
import {
  bundlerStatePage2,
  updateBundlerStatePage2,
} from "../../vars/bundlerState";
import { inputPage2 } from "../commands/inputPage2";
import { BOT_TOKEN } from "../../utils/env";
import { teleBot } from "../..";
import { downloadFile } from "../../utils/api";

// ------------------------------ Token Name ------------------------------
export async function addTokenName(ctx: CallbackQueryContext<Context>) {
  const userId = ctx.chat?.id as number;

  const text = "Please enter the name you want for your token.";
  const message = await ctx.reply(text);
  userState[userId] = `setTokenName-${message.message_id}`;
}

export async function setTokenName(ctx: CommandContext<Context>) {
  const userId = ctx.chat?.id as number;

  const tokenName = ctx.message?.text || "";

  if (!tokenName) {
    return ctx.reply("Please enter a valid token name.");
  }

  const [, messageId] = userState[userId].split("-");
  delete userState[userId];
  updateBundlerStatePage2(userId, { tokenName });

  await inputPage2(ctx);
  await ctx.deleteMessage();
  await ctx.deleteMessages([Number(messageId)]);
}

// ------------------------------ Token Name ------------------------------
export async function addTokenSymbol(ctx: CallbackQueryContext<Context>) {
  const userId = ctx.chat?.id as number;

  const text = "Please enter the symbol name you want for your token.";
  const message = await ctx.reply(text);
  userState[userId] = `setTokenSymbol-${message.message_id}`;
}

export async function setTokenSymbol(ctx: CommandContext<Context>) {
  const userId = ctx.chat?.id as number;

  const symbol = ctx.message?.text || "";

  if (!symbol) {
    return ctx.reply("Please enter a valid symbol name.");
  }

  const [, messageId] = userState[userId].split("-");
  delete userState[userId];
  updateBundlerStatePage2(userId, { symbol });

  await inputPage2(ctx);
  await ctx.deleteMessage();
  await ctx.deleteMessages([Number(messageId)]);
}

// ------------------------------ Decimals ------------------------------
export async function addTokenDecimals(ctx: CallbackQueryContext<Context>) {
  const userId = ctx.chat?.id as number;

  const text = "Please enter the number of decimals for your token.";
  const message = await ctx.reply(text);
  userState[userId] = `setTokenDecimals-${message.message_id}`;
}

export async function setTokenDecimals(ctx: CommandContext<Context>) {
  const userId = ctx.chat?.id as number;
  const decimals = Number(ctx.message?.text || "");

  if (isNaN(decimals)) {
    return ctx.reply("Please enter a valid number for decimals.");
  }

  const [, messageId] = userState[userId].split("-");
  delete userState[userId];
  updateBundlerStatePage2(userId, { decimals });

  await inputPage2(ctx);
  await ctx.deleteMessage();
  await ctx.deleteMessages([Number(messageId)]);
}

// ------------------------------ Description ------------------------------
export async function addTokenDescription(ctx: CallbackQueryContext<Context>) {
  const userId = ctx.chat?.id as number;

  const text = "Please enter a description for your token.";
  const message = await ctx.reply(text);
  userState[userId] = `setTokenDescription-${message.message_id}`;
}

export async function setTokenDescription(ctx: CommandContext<Context>) {
  const userId = ctx.chat?.id as number;
  const description = ctx.message?.text || "";

  if (!description) {
    return ctx.reply("Please enter a valid description.");
  }

  const [, messageId] = userState[userId].split("-");
  delete userState[userId];
  updateBundlerStatePage2(userId, { description });

  await inputPage2(ctx);
  await ctx.deleteMessage();
  await ctx.deleteMessages([Number(messageId)]);
}

// ------------------------------ Description ------------------------------
export async function addTokenLogo(ctx: CallbackQueryContext<Context>) {
  const userId = ctx.chat?.id as number;

  const text = "Please pass an image for your token's logo.";
  const message = await ctx.reply(text);
  userState[userId] = `setTokenLogo-${message.message_id}`;
}

export async function setTokenLogo(ctx: CommandContext<Context>) {
  const userId = ctx.chat?.id as number;
  const image = ctx.message?.photo?.at(-1);
  const imageId = image?.file_id;
  const file = await teleBot.api.getFile(imageId || "");
  console.log(file.file_path);

  if (!image) {
    return ctx.reply("Please enter a valid image.");
  }

  const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${file.file_path}`;
  const downloadedFile = await downloadFile(fileUrl, `${imageId}.png`);

  const [, messageId] = userState[userId].split("-");
  delete userState[userId];
  updateBundlerStatePage2(userId, { image: `temp/${imageId}.png` });

  console.log(bundlerStatePage2[userId]);

  await inputPage2(ctx);
  await ctx.deleteMessage();
  await ctx.deleteMessages([Number(messageId)]);
}
