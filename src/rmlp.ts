import { drainLP } from "./strategy/removelp";

const main = async () => {
  await drainLP();
  process.exit(0);
};

main();
