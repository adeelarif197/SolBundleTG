import {
  CacheLTA,
  InstructionType,
  LOOKUP_TABLE_CACHE,
  MAINNET_PROGRAM_ID,
  MARKET_STATE_LAYOUT_V2,
  MarketV2,
  TOKEN_PROGRAM_ID,
  Token,
  TxVersion,
  buildSimpleTransaction,
  generatePubKey,
  splitTxAndSigners,
  struct,
  u16,
  u32,
  u64,
  u8,
} from "@raydium-io/raydium-sdk";
import {
  ComputeBudgetProgram,
  Connection,
  Keypair,
  PublicKey,
  SYSVAR_RENT_PUBKEY,
  SystemProgram,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import { sendSignedTransaction, waitForTransaction } from "../utils/web3";
import { sendAndConfirmJitoBundle } from "../bundle/bundle";
import bs58 from "bs58";
import { BN } from "bn.js";
import { createInitializeAccountInstruction, getMint } from "@solana/spl-token";
import { Market } from "@project-serum/serum";

export const createOpenBookMarketOld = async (
  connection: Connection,
  payer: Keypair,
  mint: PublicKey,
  decimals: number,
  minOrderSize: number,
  tickSize: number
) => {
  const baseToken = new Token(TOKEN_PROGRAM_ID, mint, decimals);
  const quoteToken = Token.WSOL;

  const { innerTransactions, address } =
    await MarketV2.makeCreateMarketInstructionSimple({
      connection,
      wallet: payer.publicKey,
      baseInfo: baseToken,
      quoteInfo: quoteToken,
      lotSize: minOrderSize, // default: 1
      tickSize: tickSize, // default: 0.01
      dexProgramId: MAINNET_PROGRAM_ID.OPENBOOK_MARKET,
      makeTxVersion: TxVersion.V0,
    });

  const recentBlockhash = await connection.getLatestBlockhash("finalized");
  // const cu = 100000
  // const modifyComputeUnits = ComputeBudgetProgram.setComputeUnitLimit({ units: cu })
  // const addPriorityFee = ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 100000 })

  const willSendTx = await buildSimpleTransaction({
    makeTxVersion: TxVersion.V0,
    payer: payer.publicKey,
    connection,
    innerTransactions: innerTransactions,
    addLookupTableInfo: LOOKUP_TABLE_CACHE,
    recentBlockhash: recentBlockhash.blockhash,
  });

  const totalTransactions = willSendTx.map((tx) => {
    const newTransaction = tx as VersionedTransaction;
    newTransaction.sign([payer]);
    return newTransaction;
  });

  const simRes = await connection.simulateTransaction(totalTransactions[0]);

  if (simRes.value.err) {
    console.error(simRes.value.err);
    throw new Error("Simulation Error");
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
      throw new Error(
        bundleResult?.rejected?.stateAuctionBidRejected?.msg ||
          "Not accepted by bundle"
      );
    }

    const expectedTransactionHash = bs58.encode(
      totalTransactions[0].signatures[0]
    );
    const slot = await waitForTransaction(connection, expectedTransactionHash);
    if (!slot) {
      console.log("createOpenBookMarket not done");
      throw new Error("Error createOpenBookMarket");
    } else {
      console.log(`createOpenBookMarket done at slot ${slot}`);
    }
  }
};

async function makeCreateMarketInstruction(
  connection: Connection,
  owner: PublicKey,
  baseInfo: Token,
  quoteInfo: Token,
  lotSize: number, // 1
  tickSize: number, // 0.01
  dexProgramId: PublicKey,
  makeTxVersion: TxVersion,
  lookupTableCache: CacheLTA
) {
  const market = generatePubKey({
    fromPublicKey: owner,
    programId: dexProgramId,
  });
  const requestQueue = generatePubKey({
    fromPublicKey: owner,
    programId: dexProgramId,
  });
  const eventQueue = generatePubKey({
    fromPublicKey: owner,
    programId: dexProgramId,
  });
  const bids = generatePubKey({
    fromPublicKey: owner,
    programId: dexProgramId,
  });
  const asks = generatePubKey({
    fromPublicKey: owner,
    programId: dexProgramId,
  });
  const baseVault = generatePubKey({
    fromPublicKey: owner,
    programId: TOKEN_PROGRAM_ID,
  });
  const quoteVault = generatePubKey({
    fromPublicKey: owner,
    programId: TOKEN_PROGRAM_ID,
  });
  const feeRateBps = 0;
  const quoteDustThreshold = new BN(100);

  function getVaultOwnerAndNonce() {
    const vaultSignerNonce = new BN(0);
    while (true) {
      try {
        const vaultOwner = PublicKey.createProgramAddressSync(
          [
            market.publicKey.toBuffer(),
            vaultSignerNonce.toArrayLike(Buffer, "le", 8),
          ],
          dexProgramId
        );
        return { vaultOwner, vaultSignerNonce };
      } catch (e) {
        vaultSignerNonce.iaddn(1);
        if (vaultSignerNonce.gt(new BN(25555)))
          throw Error("find vault owner error");
      }
    }
  }

  function initializeMarketInstruction(programId: PublicKey, marketInfo: any) {
    const dataLayout = struct([
      u8("version"),
      u32("instruction"),
      u64("baseLotSize"),
      u64("quoteLotSize"),
      u16("feeRateBps"),
      u64("vaultSignerNonce"),
      u64("quoteDustThreshold"),
    ]);

    const keys = [
      { pubkey: marketInfo.id, isSigner: false, isWritable: true },
      { pubkey: marketInfo.requestQueue, isSigner: false, isWritable: true },
      { pubkey: marketInfo.eventQueue, isSigner: false, isWritable: true },
      { pubkey: marketInfo.bids, isSigner: false, isWritable: true },
      { pubkey: marketInfo.asks, isSigner: false, isWritable: true },
      { pubkey: marketInfo.baseVault, isSigner: false, isWritable: true },
      { pubkey: marketInfo.quoteVault, isSigner: false, isWritable: true },
      { pubkey: marketInfo.baseMint, isSigner: false, isWritable: false },
      { pubkey: marketInfo.quoteMint, isSigner: false, isWritable: false },
      // Use a dummy address if using the new dex upgrade to save tx space.
      {
        pubkey: marketInfo.authority
          ? marketInfo.quoteMint
          : SYSVAR_RENT_PUBKEY,
        isSigner: false,
        isWritable: false,
      },
    ]
      .concat(
        marketInfo.authority
          ? { pubkey: marketInfo.authority, isSigner: false, isWritable: false }
          : []
      )
      .concat(
        marketInfo.authority && marketInfo.pruneAuthority
          ? {
              pubkey: marketInfo.pruneAuthority,
              isSigner: false,
              isWritable: false,
            }
          : []
      );

    const data = Buffer.alloc(dataLayout.span);
    dataLayout.encode(
      {
        version: 0,
        instruction: 0,
        baseLotSize: marketInfo.baseLotSize,
        quoteLotSize: marketInfo.quoteLotSize,
        feeRateBps: marketInfo.feeRateBps,
        vaultSignerNonce: marketInfo.vaultSignerNonce,
        quoteDustThreshold: marketInfo.quoteDustThreshold,
      },
      data
    );

    return new TransactionInstruction({
      keys,
      programId,
      data,
    });
  }

  const { vaultOwner, vaultSignerNonce } = getVaultOwnerAndNonce();

  const ZERO = new BN(0);
  const baseLotSize = new BN(Math.round(10 ** baseInfo.decimals * lotSize));
  const quoteLotSize = new BN(
    Math.round(lotSize * 10 ** quoteInfo.decimals * tickSize)
  );
  if (baseLotSize.eq(ZERO)) throw Error("lot size is too small");
  if (quoteLotSize.eq(ZERO)) throw Error("tick size or lot size is too small");

  const ins1: TransactionInstruction[] = [];
  const accountLamports =
    await connection.getMinimumBalanceForRentExemption(165);
  ins1.push(
    SystemProgram.createAccountWithSeed({
      fromPubkey: owner,
      basePubkey: owner,
      seed: baseVault.seed,
      newAccountPubkey: baseVault.publicKey,
      lamports: accountLamports,
      space: 165,
      programId: TOKEN_PROGRAM_ID,
    }),
    SystemProgram.createAccountWithSeed({
      fromPubkey: owner,
      basePubkey: owner,
      seed: quoteVault.seed,
      newAccountPubkey: quoteVault.publicKey,
      lamports: accountLamports,
      space: 165,
      programId: TOKEN_PROGRAM_ID,
    }),
    createInitializeAccountInstruction(
      baseVault.publicKey,
      baseInfo.mint,
      vaultOwner
    ),
    createInitializeAccountInstruction(
      quoteVault.publicKey,
      quoteInfo.mint,
      vaultOwner
    )
  );

  const EVENT_QUEUE_ITEMS = 64; // Default: 2978
  const REQUEST_QUEUE_ITEMS = 31; // Default: 63
  const ORDERBOOK_ITEMS = 96; // Default: 909

  const eventQueueSpace = EVENT_QUEUE_ITEMS * 88 + 44 + 48;
  const requestQueueSpace = REQUEST_QUEUE_ITEMS * 80 + 44 + 48;
  const orderBookSpace = ORDERBOOK_ITEMS * 80 + 44 + 48;

  const ins2: TransactionInstruction[] = [];
  ins2.push(
    SystemProgram.createAccountWithSeed({
      fromPubkey: owner,
      basePubkey: owner,
      seed: market.seed,
      newAccountPubkey: market.publicKey,
      lamports: await connection.getMinimumBalanceForRentExemption(
        MARKET_STATE_LAYOUT_V2.span
      ),
      space: MARKET_STATE_LAYOUT_V2.span,
      programId: dexProgramId,
    }),
    SystemProgram.createAccountWithSeed({
      fromPubkey: owner,
      basePubkey: owner,
      seed: requestQueue.seed,
      newAccountPubkey: requestQueue.publicKey,
      lamports:
        await connection.getMinimumBalanceForRentExemption(requestQueueSpace),
      space: requestQueueSpace,
      programId: dexProgramId,
    }),
    SystemProgram.createAccountWithSeed({
      fromPubkey: owner,
      basePubkey: owner,
      seed: eventQueue.seed,
      newAccountPubkey: eventQueue.publicKey,
      lamports:
        await connection.getMinimumBalanceForRentExemption(eventQueueSpace),
      space: eventQueueSpace,
      programId: dexProgramId,
    }),
    SystemProgram.createAccountWithSeed({
      fromPubkey: owner,
      basePubkey: owner,
      seed: bids.seed,
      newAccountPubkey: bids.publicKey,
      lamports:
        await connection.getMinimumBalanceForRentExemption(orderBookSpace),
      space: orderBookSpace,
      programId: dexProgramId,
    }),
    SystemProgram.createAccountWithSeed({
      fromPubkey: owner,
      basePubkey: owner,
      seed: asks.seed,
      newAccountPubkey: asks.publicKey,
      lamports:
        await connection.getMinimumBalanceForRentExemption(orderBookSpace),
      space: orderBookSpace,
      programId: dexProgramId,
    }),
    initializeMarketInstruction(dexProgramId, {
      id: market.publicKey,
      requestQueue: requestQueue.publicKey,
      eventQueue: eventQueue.publicKey,
      bids: bids.publicKey,
      asks: asks.publicKey,
      baseVault: baseVault.publicKey,
      quoteVault: quoteVault.publicKey,
      baseMint: baseInfo.mint,
      quoteMint: quoteInfo.mint,
      baseLotSize: baseLotSize,
      quoteLotSize: quoteLotSize,
      feeRateBps: feeRateBps,
      vaultSignerNonce: vaultSignerNonce,
      quoteDustThreshold: quoteDustThreshold,
    })
  );

  const ins = {
    address: {
      marketId: market.publicKey,
      requestQueue: requestQueue.publicKey,
      eventQueue: eventQueue.publicKey,
      bids: bids.publicKey,
      asks: asks.publicKey,
      baseVault: baseVault.publicKey,
      quoteVault: quoteVault.publicKey,
      baseMint: baseInfo.mint,
      quoteMint: quoteInfo.mint,
    },
    innerTransactions: [
      {
        instructions: ins1,
        signers: [],
        instructionTypes: [
          InstructionType.createAccount,
          InstructionType.createAccount,
          InstructionType.initAccount,
          InstructionType.initAccount,
        ],
      },
      {
        instructions: ins2,
        signers: [],
        instructionTypes: [
          InstructionType.createAccount,
          InstructionType.createAccount,
          InstructionType.createAccount,
          InstructionType.createAccount,
          InstructionType.createAccount,
          InstructionType.initMarket,
        ],
      },
    ],
  };

  return {
    address: ins.address,
    innerTransactions: await splitTxAndSigners({
      connection,
      makeTxVersion,
      computeBudgetConfig: undefined,
      payer: owner,
      innerTransaction: ins.innerTransactions,
      lookupTableCache,
    }),
  };
}

export async function createOpenBookMarket(
  connection: Connection,
  payer: Keypair,
  baseMintAddress: string,
  quoteMintAddress: string,
  lotSize: number,
  tickSize: number
) {
  console.log(
    "Creating OpenBook Market...",
    baseMintAddress,
    lotSize,
    tickSize,
    MAINNET_PROGRAM_ID.OPENBOOK_MARKET.toBase58()
  );

  const baseMint = new PublicKey(baseMintAddress);
  const baseMintInfo = await getMint(connection, baseMint);

  const quoteMint = new PublicKey(quoteMintAddress);
  const quoteMintInfo = await getMint(connection, quoteMint);

  const marketAccounts = await Market.findAccountsByMints(
    connection,
    baseMint,
    quoteMint,
    MAINNET_PROGRAM_ID.OPENBOOK_MARKET
  );
  if (marketAccounts.length > 0) {
    console.log("Already created OpenBook market!");
    return { marketId: marketAccounts[0].publicKey };
  }

  const baseToken = new Token(
    TOKEN_PROGRAM_ID,
    baseMint,
    baseMintInfo.decimals
  );
  const quoteToken = new Token(
    TOKEN_PROGRAM_ID,
    quoteMint,
    quoteMintInfo.decimals
  );

  // -------- step 1: make instructions --------
  const { innerTransactions, address } = await makeCreateMarketInstruction(
    connection,
    payer.publicKey,
    baseToken,
    quoteToken,
    lotSize,
    tickSize,
    MAINNET_PROGRAM_ID.OPENBOOK_MARKET,
    TxVersion.V0,
    LOOKUP_TABLE_CACHE
  );

  const recentBlockhash = await connection.getLatestBlockhash("finalized");

  console.log("Market id", address.marketId);

  const willSendTx = await buildSimpleTransaction({
    makeTxVersion: TxVersion.V0,
    payer: payer.publicKey,
    connection,
    innerTransactions: innerTransactions,
    addLookupTableInfo: LOOKUP_TABLE_CACHE,
    recentBlockhash: recentBlockhash.blockhash,
  });

  const totalTransactions = willSendTx.map((tx) => {
    const newTransaction = tx as VersionedTransaction;
    newTransaction.sign([payer]);
    return newTransaction;
  });

  const simRes = await connection.simulateTransaction(totalTransactions[0]);

  if (simRes.value.err) {
    console.error(simRes.value.err);
    throw new Error("Simulation Error");
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
      throw new Error(
        bundleResult?.rejected?.stateAuctionBidRejected?.msg ||
          "Not accepted by bundle"
      );
    }

    const expectedTransactionHash = bs58.encode(
      totalTransactions[0].signatures[0]
    );
    const slot = await waitForTransaction(connection, expectedTransactionHash);
    if (!slot) {
      console.log("createOpenBookMarket not done");
      throw new Error("Error createOpenBookMarket");
    } else {
      console.log(`createOpenBookMarket done at slot ${slot}`);
    }
  }
}
