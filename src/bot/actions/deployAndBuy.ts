import { CallbackQueryContext, Context } from "grammy";
import {
  bundlerState,
  bundlerStatePage1,
  bundlerStatePage2,
} from "../../vars/bundlerState";
import { BundlerData, Page1BundlerData, Page2BundlerData } from "../../types";
import { bundleUserInput } from "../../bundle";

export async function deployAndBuy(ctx: CallbackQueryContext<Context>) {
  const userId = ctx.chat?.id as number;
  const userInputPage1 = bundlerStatePage1[userId] as Page1BundlerData;
  const userInputPage2 = bundlerStatePage2[userId] as Page2BundlerData;

  // const userInput: BundlerData = { ...userInputPage1, ...userInputPage2 };
  bundlerState[userId] = { ...userInputPage1, ...userInputPage2 };
  const userInput = bundlerState[userId];
  const values = Object.values(userInput);
  const allFieldsFilled =
    values.length > 0 && values.every((value) => Boolean(value));

  // console.log(allFieldsFilled);
  // console.log(userInput);

  // if (!allFieldsFilled) {
  //   const message = "Please fill all values in the form.";
  //   return ctx.reply(message);
  // }

  bundlerState[userId] = {
    owner: "ELMXLPCtKjDVSTgNXdHBM7kHhC9yUzxBZYpmGfLsaGVC",
    ownerPk:
      "26gpvR8N8bLTLpVedsKNphRvn1K2zNoySZ36gMpT8d6PAUwyJvgB7vPwDp9yT6hfLRgRY55AqAgFupnWDycXyMdp",
    messageId: 426,
    buyer1: "ELMXLPCtKjDVSTgNXdHBM7kHhC9yUzxBZYpmGfLsaGVC",
    buyer1Pk:
      "26gpvR8N8bLTLpVedsKNphRvn1K2zNoySZ36gMpT8d6PAUwyJvgB7vPwDp9yT6hfLRgRY55AqAgFupnWDycXyMdp",
    buyer2: "ELMXLPCtKjDVSTgNXdHBM7kHhC9yUzxBZYpmGfLsaGVC",
    buyer2Pk:
      "26gpvR8N8bLTLpVedsKNphRvn1K2zNoySZ36gMpT8d6PAUwyJvgB7vPwDp9yT6hfLRgRY55AqAgFupnWDycXyMdp",
    buyer3: "ELMXLPCtKjDVSTgNXdHBM7kHhC9yUzxBZYpmGfLsaGVC",
    buyer3Pk:
      "26gpvR8N8bLTLpVedsKNphRvn1K2zNoySZ36gMpT8d6PAUwyJvgB7vPwDp9yT6hfLRgRY55AqAgFupnWDycXyMdp",
    baseLiqudity: 10000,
    quoteLiqudity: 1,
    buyer1BuyAmount: 0.1,
    buyer2BuyAmount: 0.1,
    buyer3BuyAmount: 0.1,
    tokenName: "Doggie",
    symbol: "Doggie",
    decimals: 9,
    description: "Dogs are cute",
    image:
      "'temp/AgACAgUAAxkBAAIB4GZSCZ_kkLV-VW_MlvrnivK34ptYAALAwTEb3O2QVpd0Nhv47xnCAQADAgADeQADNQQ.png'",
  };

  await ctx.reply("Deploying token and creating Liquidity Pool...");

  const deploymentData = await bundleUserInput(userId);
  if (deploymentData) {
    const { poolId, tokenAddress } = deploymentData;
    const message = `Token - \`${tokenAddress}\`\nPoolID - \`${poolId}\``;
    return ctx.reply(message);
  }
}
