import {
  CallbackQueryContext,
  CommandContext,
  Context,
  InlineKeyboard,
} from "grammy";
import { bundlerStatePage1, bundlerStatePage2 } from "../vars/bundlerState";
import { Page1BundlerData, Page2BundlerData } from "../types";

export type Page1Fields = keyof Pick<
  Page1BundlerData,
  | "owner"
  | "buyer1"
  | "buyer2"
  | "buyer3"
  | "baseLiqudity"
  | "quoteLiqudity"
  | "buyer1BuyAmount"
  | "buyer2BuyAmount"
  | "buyer3BuyAmount"
>;

export type Page2Fields = keyof Pick<
  Page2BundlerData,
  "tokenName" | "symbol" | "decimals" | "description" | "image"
>;

export const page1Fields: { [key in Page1Fields]: string } = {
  owner: "Deployer wallet",
  buyer1: "Buyer 1 wallet",
  buyer2: "Buyer 2 wallet",
  buyer3: "Buyer 3 wallet",
  baseLiqudity: "Initial Base Token Liquidity",
  quoteLiqudity: "Initial Quote Token Liquidity",
  buyer1BuyAmount: "Buyer 1 buy amount",
  buyer2BuyAmount: "Buyer 2 buy amount",
  buyer3BuyAmount: "Buyer 3 buy amount",
};

export const page2Fields: { [key in Page2Fields]: string } = {
  tokenName: "Token Name",
  symbol: "Token Symbol",
  decimals: "Token decimals",
  description: "Token description",
  image: "Token logo",
};

// Page 1
export function generatePage1Text(
  ctx: CallbackQueryContext<Context> | CommandContext<Context>
) {
  let text = "";
  const userId = ctx.chat?.id as number;
  const userPage1BundlerData = bundlerStatePage1[userId];

  for (const key in page1Fields) {
    const field = key as Page1Fields;
    let value = userPage1BundlerData[field] || "";

    let fieldText = page1Fields[field];
    const symbol = value ? "✅" : "❔";
    value =
      fieldText.includes("wallet") && value ? `\n\`${value}\`` : ` ${value}`;

    fieldText = `${symbol} *${fieldText}:*${value}\n`;

    if (field === "baseLiqudity") fieldText = `\n${fieldText}`;
    else if (field === "buyer1BuyAmount") fieldText = `\n${fieldText}`;

    text += fieldText;
  }

  return text;
}

export function generatePage1Keyboard(
  ctx: CallbackQueryContext<Context> | CommandContext<Context>
) {
  const userId = ctx.chat?.id as number;
  const userPage1BundlerData = bundlerStatePage1[userId];

  const keyboard = new InlineKeyboard()
    .text(
      `${userPage1BundlerData.owner ? "✏️" : "➕"} Deployment Wallet`,
      "addDeployer"
    ) // prettier-ignore
    .row()
    .text(
      `${userPage1BundlerData.buyer1 ? "✏️" : "➕"} Buyer 1 Wallet`,
      "addBuyer1"
    ) // prettier-ignore
    .text(
      `${userPage1BundlerData.buyer2 ? "✏️" : "➕"} Buyer 2 Wallet`,
      "addBuyer2"
    ) // prettier-ignore
    .text(
      `${userPage1BundlerData.buyer3 ? "✏️" : "➕"} Buyer 3 Wallet`,
      "addBuyer3"
    ) // prettier-ignore
    .row()
    .text(
      `${userPage1BundlerData.baseLiqudity ? "✏️" : "➕"} Initial Base Liquidity`,
      "baseLiquidity"
    ) // prettier-ignore
    .text(
      `${userPage1BundlerData.quoteLiqudity ? "✏️" : "➕"} Initial Quote Liquidity`,
      "quoteLiquidity"
    ) // prettier-ignore
    .row()
    .text(
      `${userPage1BundlerData.buyer1BuyAmount ? "✏️" : "➕"} Buyer 1 buy amount`,
      "addBuyer1Buy"
    ) // prettier-ignore
    .row()
    .text(
      `${userPage1BundlerData.buyer2BuyAmount ? "✏️" : "➕"} Buyer 2 buy amount`,
      "addBuyer2Buy"
    ) // prettier-ignore
    .row()
    .text(
      `${userPage1BundlerData.buyer3BuyAmount ? "✏️" : "➕"} Buyer 3 buy amount`,
      "addBuyer3Buy"
    ) // prettier-ignore
    .row()
    .text("🔄️ Reset", "reset")
    .text("➡️ Next", "inputPage2");

  return keyboard;
}

// Page 2
export function generatePage2Text(
  ctx: CallbackQueryContext<Context> | CommandContext<Context>
) {
  let text = "";
  const userId = ctx.chat?.id as number;
  const userPage2BundlerData = bundlerStatePage2[userId];

  for (const key in page2Fields) {
    const field = key as Page2Fields;
    let value = userPage2BundlerData[field] || "";

    let fieldText = page2Fields[field];
    const symbol = value ? "✅" : "❔";
    fieldText = `${symbol} *${fieldText}: *${value}\n`;
    text += fieldText;
  }

  return text;
}

export function generatePage2Keyboard(
  ctx: CallbackQueryContext<Context> | CommandContext<Context>
) {
  const userId = ctx.chat?.id as number;
  const userPage2BundlerData = bundlerStatePage2[userId];

  const keyboard = new InlineKeyboard()
    .text(
      `${userPage2BundlerData.tokenName ? "✏️" : "➕"} Token Name`,
      "addTokenName"
    ) // prettier-ignore
    .text(
      `${userPage2BundlerData.symbol ? "✏️" : "➕"} Token Symbol`,
      "addTokenSymbol"
    ) // prettier-ignore
    .row()
    .text(
      `${userPage2BundlerData.decimals ? "✏️" : "➕"} Token Decimals`,
      "addTokenDecimals"
    ) // prettier-ignore
    .text(
      `${userPage2BundlerData.description ? "✏️" : "➕"} Token Description`,
      "addTokenDescription"
    ) // prettier-ignore
    .row()
    .text(
      `${userPage2BundlerData.image ? "✏️" : "➕"} Token Logo`,
      "addTokenLogo"
    )
    .row()
    .text("🔄️ Reset", "reset")
    .text("⬅️ Previous", "inputPage1")
    .row()
    .text("Deploy and Buy", "deployAndBuy");

  return keyboard;
}
