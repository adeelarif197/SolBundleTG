import * as dotenv from "dotenv";
import path from "path";
import bs58 from "bs58";
import fs from "fs";

import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  VersionedTransaction,
} from "@solana/web3.js";
import { Token, TokenAmount, TOKEN_PROGRAM_ID } from "@raydium-io/raydium-sdk";
import { createToken } from "./spltoken";
import { createOpenBookMarket } from "./raydium/market";
import { createPoolTxBuild } from "./raydium/pool";
import { buildSwapTransactions } from "./raydium/swap";
import { sendAndConfirmJitoBundle } from "./bundle/bundle";
import { waitForTransaction } from "./utils/web3";
import { sleep } from "./utils";
import { drainLP } from "./strategy/removelp";
import { getPoolInfo, getPooledSOL } from "./strategy/pool";
import { sellALL } from "./strategy/sell";
import { BN } from "bn.js";
import { BundlerData } from "./types";
import { bundlerState } from "./vars/bundlerState";

dotenv.config();
if (process.env.NODE_ENV == ("development" || "development ")) {
  dotenv.config({ path: path.join(__dirname, "..", ".env.development") });
} else if (process.env.NODE_ENV == ("production" || "production ")) {
  dotenv.config({ path: path.join(__dirname, "..", ".env") });
} else if (process.env.NODE_ENV == ("staging" || "staging ")) {
  dotenv.config({ path: path.join(__dirname, "..", ".env.staging") });
}

export const bundleUserInput = async (userId: number) => {
  const userInput = bundlerState[userId];
  // const TOKEN_NAME = "Catena";
  // const TOKEN_SYMBOL = "$CTN";
  // const DECIMALS = 9;
  // const TOTAL_SUPPLY = 1000000;
  // const TOKEN_IMG_NAME = "test.png";
  // const TOKEN_DESCRIPTION = "Catena Decentralized";
  const TOKEN_NAME = userInput.tokenName;
  const TOKEN_SYMBOL = userInput.symbol;
  const DECIMALS = userInput.decimals;
  const TOTAL_SUPPLY = userInput.baseLiqudity;
  const TOKEN_IMG_NAME = userInput.image;
  const TOKEN_DESCRIPTION = userInput.description;

  const connection = new Connection(process.env.MAINNET_RPC || "", {
    commitment: "processed",
  });
  const payer = Keypair.fromSecretKey(bs58.decode(userInput.ownerPk || ""));

  console.log(process.env.MAINNET_RPC);
  console.log(payer.publicKey.toString());

  const allkeypairs = [
    Keypair.fromSecretKey(bs58.decode(userInput.ownerPk || "")),
    Keypair.fromSecretKey(bs58.decode(userInput.buyer1Pk || "")),
    Keypair.fromSecretKey(bs58.decode(userInput.buyer2Pk || "")),
    Keypair.fromSecretKey(bs58.decode(userInput.buyer3Pk || "")),
  ];
  console.log("");
  console.log("All Wallets");
  allkeypairs.forEach((k) => {
    console.log(k.publicKey.toString());
  });
  console.log("");
  console.log("");

  const bals = await Promise.all(
    allkeypairs.map(async (k) => {
      return await connection.getBalance(k.publicKey);
    })
  );
  if (bals.find((b) => b === 0)) return;

  console.log("xxx");
  // return;

  let tokenAddress: string | undefined = "";
  try {
    const textRead: string = fs.readFileSync("1.json").toString();
    const objRead = JSON.parse(textRead);
    console.log(objRead);
    tokenAddress = objRead.token;
  } catch (err) {}

  if (!tokenAddress) {
    const tRet = await createToken(connection, payer, {
      name: TOKEN_NAME,
      symbol: TOKEN_SYMBOL,
      decimals: DECIMALS,
      totalSupply: TOTAL_SUPPLY,
      imgName: TOKEN_IMG_NAME,
      description: TOKEN_DESCRIPTION,
      mintAuthority: payer.publicKey,
      updateAuthority: payer.publicKey,
    });
    fs.writeFileSync(
      "1.json",
      JSON.stringify({ token: tRet?.toString() }, null, "\t")
    );
    tokenAddress = tRet?.toString();

    console.log("New minted token:", tokenAddress);

    if (tokenAddress) {
      try {
        await createOpenBookMarket(
          connection,
          payer,
          tokenAddress,
          Token.WSOL.mint.toString(),
          1,
          0.000001
        );
      } catch (err) {
        console.error("  Failed to create OpenBook market, error:", err);
        return null;
      }
    } else {
      return;
    }
  }

  const tokenMint = new PublicKey(tokenAddress);
  const totalTokenAmountToPool = TOTAL_SUPPLY;
  const totalSolAmountToPool = userInput.quoteLiqudity;
  // const totalSolAmountToPool = 3;
  const buyList = [
    {
      signer: Keypair.fromSecretKey(bs58.decode(userInput.buyer1Pk || "")),
      solAmount: 1.05,
    },
    {
      signer: Keypair.fromSecretKey(bs58.decode(userInput.buyer2Pk || "")),
      solAmount: 0.96,
    },
    {
      signer: Keypair.fromSecretKey(bs58.decode(userInput.buyer3Pk || "")),
      solAmount: 0.97,
    },
  ];

  const poolCreationPromise = new Promise((resolve, reject) => {
    /// pool creation
    createPoolTxBuild(
      connection,
      payer,
      tokenMint as PublicKey,
      BigInt(totalTokenAmountToPool * 10 ** DECIMALS),
      BigInt(Math.floor(totalSolAmountToPool * 10 ** 9))
    ).then((txArray: VersionedTransaction[] | null) => {
      if (txArray === null || txArray.length !== 1) {
        resolve(null);
        // throw new Error('Error building a transaction to create a pool in Raydium')
      } else {
        const txn = txArray[0];
        txn.sign([payer]);
        console.log("pool creation", bs58.encode(txn.signatures[0]));
        resolve(txn);
      }
    });
  });

  const buyPromises = buyList.map(async (buyer) => {
    const inputTokenAmount = new TokenAmount(
      Token.WSOL,
      BigInt(buyer.solAmount * 10 ** 9)
    );
    const outputToken = new Token(
      TOKEN_PROGRAM_ID,
      tokenMint as PublicKey,
      DECIMALS
    );
    const buy1Array: (VersionedTransaction | Transaction)[] =
      await buildSwapTransactions(
        connection,
        buyer.signer,
        inputTokenAmount,
        outputToken,
        true
      );
    if (buy1Array === null || buy1Array.length !== 1) {
      return null;
    } else {
      const txn = buy1Array[0] as VersionedTransaction;
      txn.sign([buyer.signer]);
      console.log(
        `buy ${buyer.signer.publicKey.toString()}`,
        bs58.encode(txn.signatures[0])
      );
      return txn;
    }
  });

  console.log("Building transactions...");
  const txnRets = await Promise.all([poolCreationPromise, ...buyPromises]);
  const totalTransactions: VersionedTransaction[] = txnRets
    .filter((t) => t !== null)
    .map((t) => {
      return t as VersionedTransaction;
    });
  const simRes = await connection.simulateTransaction(totalTransactions[0]);

  if (simRes.value.err) {
    console.log("pool creation simulation", simRes);
    process.exit(1);
  } else {
    const tipAmount = 10 ** 9 / 100;
    const bundleResult = await sendAndConfirmJitoBundle(
      connection,
      totalTransactions,
      payer,
      tipAmount
    );
    if (bundleResult && !bundleResult?.accepted) {
      console.log(bundleResult);
      // throw new Error(bundleResult?.rejected?.stateAuctionBidRejected?.msg || 'Not accepted by bundle')
    }

    const expectedTransactionHash = bs58.encode(
      totalTransactions[0].signatures[0]
    );
    try {
      const slot = await waitForTransaction(
        connection,
        expectedTransactionHash
      );
      console.log("Launched at", slot);
    } catch (err) {
      console.error(err);
    }

    const poolInfo = await getPoolInfo(tokenAddress);
    console.log("Pool added", poolInfo.id);

    // const pooledSOL = await getPooledSOL(connection, tokenAddress, totalSolAmountToPool * 3 * (10 ** 9))
    // await sellALL()
    return { tokenAddress, poolId: poolInfo.id };
  }
  process.exit(0);
};

// main();
