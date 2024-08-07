import { CallbackQueryContext, CommandContext, Context } from "grammy";
import { GenericFunc } from "../types";
import { userState } from "../vars/userState";
import { errorHandler, log } from "../utils/handlers";
import {
  addBuyer1,
  addBuyer1Buy,
  addBuyer2,
  addBuyer2Buy,
  addBuyer3,
  addBuyer3Buy,
  addDeployer,
  baseLiquidity,
  buyer1Amount,
  buyer1Pk,
  buyer2Amount,
  buyer2Pk,
  buyer3Amount,
  buyer3Pk,
  deployerPk,
  quoteLiquidity,
  setBaseLiquidity,
  setQuoteLiquidity,
} from "./actions/createBundle";
import { inputPage2 } from "./commands/inputPage2";
import { inputPage1 } from "./commands/inputPage1";
import {
  addTokenDecimals,
  addTokenDescription,
  addTokenLogo,
  addTokenName,
  addTokenSymbol,
  setTokenDecimals,
  setTokenDescription,
  setTokenLogo,
  setTokenName,
  setTokenSymbol,
} from "./actions/tokenMetadata";
import { deployAndBuy } from "./actions/deployAndBuy";

const steps: { [key: string]: GenericFunc | GenericFunc[] } = {
  inputPage1,

  addDeployer,
  deployerPk,

  addBuyer1,
  buyer1Pk,

  addBuyer2,
  buyer2Pk,

  addBuyer3,
  buyer3Pk,

  baseLiquidity,
  setBaseLiquidity,

  quoteLiquidity,
  setQuoteLiquidity,

  addBuyer1Buy,
  buyer1Amount,

  addBuyer2Buy,
  buyer2Amount,

  addBuyer3Buy,
  buyer3Amount,

  // Page 2
  inputPage2,

  addTokenName,
  setTokenName,

  addTokenSymbol,
  setTokenSymbol,

  addTokenDecimals,
  setTokenDecimals,

  addTokenDescription,
  setTokenDescription,

  addTokenLogo,
  setTokenLogo,

  deployAndBuy,
};

export async function executeStep(
  ctx: CommandContext<Context> | CallbackQueryContext<Context>
) {
  const chatId = ctx.chat?.id;
  if (!chatId) return ctx.reply("Please redo your action");

  const queryCategory = ctx.callbackQuery?.data;
  if (queryCategory) delete userState[chatId];
  let step = userState[chatId] || queryCategory || "";
  step = step.split("-").at(0) || "";
  const stepFunction = steps[step] as GenericFunc | GenericFunc[] | undefined;

  try {
    // If we have a callback function
    if (Array.isArray(stepFunction)) {
      const [callbackFunc, highOrderFunc] = stepFunction;
      await highOrderFunc(callbackFunc, ctx);
    }
    // If we have a stand alone function
    else if (typeof stepFunction === "function") {
      await stepFunction(ctx);
    }
    // If we have a random action
    else {
      log(`No step function for ${queryCategory} ${userState[chatId]}`);
    }
  } catch (error) {
    errorHandler(error, true);
    ctx.reply("An error occurred while doing the task.");
  }
}
