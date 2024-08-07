import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";

const main = async () => {
  {
    let idx = 0;
    for (idx = 0; idx < 4; idx++) {
      const keypair = Keypair.generate();
      console.log(bs58.encode(keypair.secretKey));
    }
  }
  process.exit(0);
};

main();
