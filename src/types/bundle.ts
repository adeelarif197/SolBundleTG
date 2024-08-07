export interface Page1BundlerData {
  messageId: number;

  owner: string;
  ownerPk: string;

  buyer1: string;
  buyer1Pk: string;
  buyer2: string;
  buyer2Pk: string;
  buyer3: string;
  buyer3Pk: string;

  baseLiqudity: number;
  quoteLiqudity: number;

  buyer1BuyAmount: number;
  buyer2BuyAmount: number;
  buyer3BuyAmount: number;
}

export interface Page2BundlerData {
  tokenName: string;
  symbol: string;
  decimals: number;
  description: string;
  image: string;
}

export interface BundlerData extends Page1BundlerData, Page2BundlerData {}
