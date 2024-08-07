import {
  ComputeBudgetProgram,
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import { sleep } from "../utils";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  Account,
  AuthorityType,
  MINT_SIZE,
  TOKEN_PROGRAM_ID,
  TokenAccountNotFoundError,
  TokenInvalidAccountOwnerError,
  TokenInvalidMintError,
  TokenInvalidOwnerError,
  createAssociatedTokenAccountInstruction,
  createInitializeMintInstruction,
  createMintToInstruction,
  getAccount,
  getAssociatedTokenAddressSync,
  getMinimumBalanceForRentExemptMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  setAuthority,
} from "@solana/spl-token";
import bs58 from "bs58";
import { sendSignedTransaction } from "../utils/web3";
import { createMetadata } from "./metadata";

export const createTokenMint = async (
  connection: Connection,
  payer: Keypair,
  {
    mintAuthority,
    freezeAuthority,
    decimals,
  }: {
    mintAuthority: PublicKey;
    freezeAuthority: any;
    decimals: number;
  }
): Promise<any> => {
  const keypair = Keypair.generate();
  const lamports = await getMinimumBalanceForRentExemptMint(connection);

  const instructions = [
    SystemProgram.createAccount({
      fromPubkey: payer.publicKey,
      newAccountPubkey: keypair.publicKey,
      space: MINT_SIZE,
      lamports,
      programId: TOKEN_PROGRAM_ID,
    }),
    createInitializeMintInstruction(
      keypair.publicKey,
      decimals,
      mintAuthority,
      freezeAuthority,
      TOKEN_PROGRAM_ID
    ),
  ];

  const recentBlockhash = await connection.getLatestBlockhash("finalized");
  const cu = 100000;
  const modifyComputeUnits = ComputeBudgetProgram.setComputeUnitLimit({
    units: cu,
  });
  const addPriorityFee = ComputeBudgetProgram.setComputeUnitPrice({
    microLamports: 100000,
  });

  const message = new TransactionMessage({
    payerKey: payer.publicKey,
    recentBlockhash: recentBlockhash.blockhash,
    instructions: [modifyComputeUnits, addPriorityFee, ...instructions],
  }).compileToV0Message();

  const newTransaction = new VersionedTransaction(message);

  newTransaction.sign([payer, keypair]);

  await sendSignedTransaction(connection, newTransaction);
  return keypair.publicKey;
};

export const mintToken = async (
  connection: Connection,
  payer: Keypair,
  mint: PublicKey,
  mintAuthority: any,
  mintAmount: bigint,
  decimals: number
) => {
  let tokenAccount;
  {
    const associatedToken = getAssociatedTokenAddressSync(
      mint,
      payer.publicKey,
      false,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    // This is the optimal logic, considering TX fee, client-side computation, RPC roundtrips and guaranteed idempotent.
    // Sadly we can't do this atomically.
    let account: Account;
    try {
      account = await getAccount(
        connection,
        associatedToken,
        undefined,
        TOKEN_PROGRAM_ID
      );
    } catch (error: unknown) {
      // TokenAccountNotFoundError can be possible if the associated address has already received some lamports,
      // becoming a system account. Assuming program derived addressing is safe, this is the only case for the
      // TokenInvalidAccountOwnerError in this code path.
      if (
        error instanceof TokenAccountNotFoundError ||
        error instanceof TokenInvalidAccountOwnerError
      ) {
        // As this isn't atomic, it's possible others can create associated accounts meanwhile.
        try {
          const recentBlockhash =
            await connection.getLatestBlockhash("finalized");
          const cu = 100000;
          const modifyComputeUnits = ComputeBudgetProgram.setComputeUnitLimit({
            units: cu,
          });
          const addPriorityFee = ComputeBudgetProgram.setComputeUnitPrice({
            microLamports: 100000,
          });

          const message = new TransactionMessage({
            payerKey: payer.publicKey,
            recentBlockhash: recentBlockhash.blockhash,
            instructions: [
              modifyComputeUnits,
              addPriorityFee,
              createAssociatedTokenAccountInstruction(
                payer.publicKey,
                associatedToken,
                payer.publicKey,
                mint,
                TOKEN_PROGRAM_ID,
                ASSOCIATED_TOKEN_PROGRAM_ID
              ),
            ],
          }).compileToV0Message();

          const newTransaction = new VersionedTransaction(message);

          newTransaction.sign([payer]);

          await sendSignedTransaction(connection, newTransaction);
        } catch (error: unknown) {
          // Ignore all errors; for now there is no API-compatible way to selectively ignore the expected
          // instruction error if the associated account exists already.
        }

        // Now this should always succeed
        account = await getAccount(
          connection,
          associatedToken,
          undefined,
          TOKEN_PROGRAM_ID
        );
      } else {
        throw error;
      }
    }

    if (!account.mint.equals(mint)) throw new TokenInvalidMintError();
    if (!account.owner.equals(payer.publicKey))
      throw new TokenInvalidOwnerError();

    tokenAccount = account;
  }
  // const tokenAccount = await getOrCreateAssociatedTokenAccount(
  // 	connection,
  // 	payer,
  // 	mint,
  // 	payer.publicKey
  // );

  const tokenAmount = mintAmount * BigInt(10 ** decimals);
  console.log(
    "ATA address",
    tokenAccount.address.toString(),
    tokenAmount.toString()
  );

  const recentBlockhash = await connection.getLatestBlockhash("finalized");
  const cu = 100000;
  const modifyComputeUnits = ComputeBudgetProgram.setComputeUnitLimit({
    units: cu,
  });
  const addPriorityFee = ComputeBudgetProgram.setComputeUnitPrice({
    microLamports: 100000,
  });

  const message = new TransactionMessage({
    payerKey: payer.publicKey,
    recentBlockhash: recentBlockhash.blockhash,
    instructions: [
      modifyComputeUnits,
      addPriorityFee,
      createMintToInstruction(
        mint,
        tokenAccount.address,
        mintAuthority,
        tokenAmount,
        [],
        TOKEN_PROGRAM_ID
      ),
    ],
  }).compileToV0Message();

  const newTransaction = new VersionedTransaction(message);

  newTransaction.sign([payer]);

  return await sendSignedTransaction(connection, newTransaction);
};
