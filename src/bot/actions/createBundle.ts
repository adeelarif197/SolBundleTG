import { CallbackQueryContext, CommandContext, Context } from "grammy";
import { userState } from "../../vars/userState";
import { isValidSolanaPrivateKey } from "../../utils/web3";
import { updateBundlerStatePage1 } from "../../vars/bundlerState";
import { inputPage1 } from "../commands/inputPage1";

// ------------------------------ Owner ------------------------------
export async function addDeployer(ctx: CallbackQueryContext<Context>) {
  const userId = ctx.chat?.id as number;

  const text = "Please enter the deployer wallet private key.";
  const message = await ctx.reply(text);
  userState[userId] = `deployerPk-${message.message_id}`;
}

export async function deployerPk(ctx: CommandContext<Context>) {
  const userId = ctx.chat?.id as number;

  const ownerPk = ctx.message?.text || "";
  const owner = isValidSolanaPrivateKey(ownerPk);

  if (!owner) {
    return ctx.reply("Please enter a valid solana private key.");
  }

  const [, messageId] = userState[userId].split("-");
  delete userState[userId];
  updateBundlerStatePage1(userId, { owner, ownerPk });

  await inputPage1(ctx);
  await ctx.deleteMessage();
  await ctx.deleteMessages([Number(messageId)]);
}

// ------------------------------ Buyer 1 ------------------------------
export async function addBuyer1(ctx: CallbackQueryContext<Context>) {
  const userId = ctx.chat?.id as number;

  const text = "Please enter buyer 1's wallet private key.";
  const message = await ctx.reply(text);
  userState[userId] = `buyer1Pk-${message.message_id}`;
}

export async function buyer1Pk(ctx: CommandContext<Context>) {
  const userId = ctx.chat?.id as number;

  const buyer1Pk = ctx.message?.text || "";
  const buyer1 = isValidSolanaPrivateKey(buyer1Pk);

  if (!buyer1) {
    return ctx.reply("Please enter a valid solana private key.");
  }

  const [, messageId] = userState[userId].split("-");
  delete userState[userId];
  updateBundlerStatePage1(userId, { buyer1, buyer1Pk });

  await inputPage1(ctx);
  await ctx.deleteMessage();
  await ctx.deleteMessages([Number(messageId)]);
}

// ------------------------------ Buyer 2 ------------------------------
export async function addBuyer2(ctx: CallbackQueryContext<Context>) {
  const userId = ctx.chat?.id as number;

  const text = "Please enter buyer 2's wallet private key.";
  const message = await ctx.reply(text);
  userState[userId] = `buyer2Pk-${message.message_id}`;
}

export async function buyer2Pk(ctx: CommandContext<Context>) {
  const userId = ctx.chat?.id as number;

  const buyer2Pk = ctx.message?.text || "";
  const buyer2 = isValidSolanaPrivateKey(buyer2Pk);

  if (!buyer2) {
    return ctx.reply("Please enter a valid solana private key.");
  }

  const [, messageId] = userState[userId].split("-");
  delete userState[userId];
  updateBundlerStatePage1(userId, { buyer2, buyer2Pk });

  await inputPage1(ctx);
  await ctx.deleteMessage();
  await ctx.deleteMessages([Number(messageId)]);
}

// ------------------------------ Buyer 3 ------------------------------
export async function addBuyer3(ctx: CallbackQueryContext<Context>) {
  const userId = ctx.chat?.id as number;

  const text = "Please enter buyer 3's wallet private key.";
  const message = await ctx.reply(text);
  userState[userId] = `buyer3Pk-${message.message_id}`;
}

export async function buyer3Pk(ctx: CommandContext<Context>) {
  const userId = ctx.chat?.id as number;

  const buyer3Pk = ctx.message?.text || "";
  const buyer3 = isValidSolanaPrivateKey(buyer3Pk);

  if (!buyer3) {
    return ctx.reply("Please enter a valid solana private key.");
  }

  const [, messageId] = userState[userId].split("-");
  delete userState[userId];
  updateBundlerStatePage1(userId, { buyer3, buyer3Pk });

  await inputPage1(ctx);
  await ctx.deleteMessage();
  await ctx.deleteMessages([Number(messageId)]);
}

// ------------------------------ Base liquidity ------------------------------
export async function baseLiquidity(ctx: CallbackQueryContext<Context>) {
  const userId = ctx.chat?.id as number;

  const text = "Please enter the initial liquidity for the base token.";
  const message = await ctx.reply(text);
  userState[userId] = `setBaseLiquidity-${message.message_id}`;
}

export async function setBaseLiquidity(ctx: CommandContext<Context>) {
  const userId = ctx.chat?.id as number;

  const baseLiqudity = Number(ctx.message?.text || "");
  if (isNaN(baseLiqudity)) {
    return ctx.reply("Please enter a valid number");
  }

  const [, messageId] = userState[userId].split("-");
  delete userState[userId];
  updateBundlerStatePage1(userId, { baseLiqudity });

  await inputPage1(ctx);
  await ctx.deleteMessage();
  await ctx.deleteMessages([Number(messageId)]);
}

// ------------------------------ Quote liquidity ------------------------------
export async function quoteLiquidity(ctx: CallbackQueryContext<Context>) {
  const userId = ctx.chat?.id as number;

  const text = "Please enter the initial liquidity for the quote token.";
  const message = await ctx.reply(text);
  userState[userId] = `setQuoteLiquidity-${message.message_id}`;
}

export async function setQuoteLiquidity(ctx: CommandContext<Context>) {
  const userId = ctx.chat?.id as number;

  const quoteLiqudity = Number(ctx.message?.text || "");
  if (isNaN(quoteLiqudity)) {
    return ctx.reply("Please enter a valid number");
  }

  const [, messageId] = userState[userId].split("-");
  delete userState[userId];
  updateBundlerStatePage1(userId, { quoteLiqudity });

  await inputPage1(ctx);
  await ctx.deleteMessage();
  await ctx.deleteMessages([Number(messageId)]);
}

// ------------------------------ Buyer 1 amount ------------------------------
export async function addBuyer1Buy(ctx: CallbackQueryContext<Context>) {
  const userId = ctx.chat?.id as number;

  const text =
    "Please enter the amount of quote token, buyer 1's buy will be for.";
  const message = await ctx.reply(text);
  userState[userId] = `buyer1Amount-${message.message_id}`;
}

export async function buyer1Amount(ctx: CommandContext<Context>) {
  const userId = ctx.chat?.id as number;

  const buyer1BuyAmount = Number(ctx.message?.text || "");
  if (isNaN(buyer1BuyAmount)) {
    return ctx.reply("Please enter a valid number");
  }

  const [, messageId] = userState[userId].split("-");
  delete userState[userId];
  updateBundlerStatePage1(userId, { buyer1BuyAmount });

  await inputPage1(ctx);
  await ctx.deleteMessage();
  await ctx.deleteMessages([Number(messageId)]);
}

// ------------------------------ Buyer 2 amount ------------------------------
export async function addBuyer2Buy(ctx: CallbackQueryContext<Context>) {
  const userId = ctx.chat?.id as number;

  const text =
    "Please enter the amount of quote token, buyer 2's buy will be for.";
  const message = await ctx.reply(text);
  userState[userId] = `buyer2Amount-${message.message_id}`;
}

export async function buyer2Amount(ctx: CommandContext<Context>) {
  const userId = ctx.chat?.id as number;

  const buyer2BuyAmount = Number(ctx.message?.text || "");
  if (isNaN(buyer2BuyAmount)) {
    return ctx.reply("Please enter a valid number");
  }

  const [, messageId] = userState[userId].split("-");
  delete userState[userId];
  updateBundlerStatePage1(userId, { buyer2BuyAmount });

  await inputPage1(ctx);
  await ctx.deleteMessage();
  await ctx.deleteMessages([Number(messageId)]);
}

// ------------------------------ Buyer 3 amount ------------------------------
export async function addBuyer3Buy(ctx: CallbackQueryContext<Context>) {
  const userId = ctx.chat?.id as number;

  const text =
    "Please enter the amount of quote token, buyer 3's buy will be for.";
  const message = await ctx.reply(text);
  userState[userId] = `buyer3Amount-${message.message_id}`;
}

export async function buyer3Amount(ctx: CommandContext<Context>) {
  const userId = ctx.chat?.id as number;

  const buyer3BuyAmount = Number(ctx.message?.text || "");
  if (isNaN(buyer3BuyAmount)) {
    return ctx.reply("Please enter a valid number");
  }

  const [, messageId] = userState[userId].split("-");
  delete userState[userId];
  updateBundlerStatePage1(userId, { buyer3BuyAmount });

  await inputPage1(ctx);
  await ctx.deleteMessage();
  await ctx.deleteMessages([Number(messageId)]);
}
