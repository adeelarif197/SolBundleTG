import { BundlerData, Page1BundlerData, Page2BundlerData } from "../types";

// Page 1
export const bundlerStatePage1: { [key: number]: Partial<Page1BundlerData> } =
  {};
export function updateBundlerStatePage1(
  userId: number,
  fields: Partial<Page1BundlerData>
) {
  bundlerStatePage1[userId] = { ...bundlerStatePage1[userId], ...fields };
}

// Page 2
export const bundlerStatePage2: { [key: number]: Partial<Page2BundlerData> } =
  {};
export function updateBundlerStatePage2(
  userId: number,
  fields: Partial<Page2BundlerData>
) {
  bundlerStatePage2[userId] = { ...bundlerStatePage2[userId], ...fields };
}

// All input
export const bundlerState: { [key: number]: BundlerData } = {};
