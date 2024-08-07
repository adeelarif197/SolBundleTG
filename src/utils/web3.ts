import {
  Connection,
  Context,
  PublicKey,
  SignatureResult,
  VersionedTransaction,
} from "@solana/web3.js";
import * as dotenv from "dotenv";
import path from "path";
import bs58 from "bs58";
import nacl from "tweetnacl";

dotenv.config();
if (process.env.NODE_ENV == ("development" || "development ")) {
  dotenv.config({ path: path.join(__dirname, "..", ".env.development") });
} else if (process.env.NODE_ENV == ("production" || "production ")) {
  dotenv.config({ path: path.join(__dirname, "..", ".env") });
} else if (process.env.NODE_ENV == ("staging" || "staging ")) {
  dotenv.config({ path: path.join(__dirname, "..", ".env.staging") });
}

export async function sendSignedTransaction(
  connection: Connection,
  newTransaction: VersionedTransaction
) {
  const rawTransaction = newTransaction.serialize();
  const expectedTransactionHash = bs58.encode(newTransaction.signatures[0]);

  let receipt;
  const simRes = await connection.simulateTransaction(newTransaction);
  if (simRes.value.err !== null) {
    console.error(simRes.value.err);
    throw new Error(`Error simulating ${expectedTransactionHash}`);
  }

  let count = 50;
  let retryCount = 0;

  while (count > 0) {
    count--;
    retryCount++;

    for (let cnt = 0; cnt < 10; cnt++) {
      await connection.sendRawTransaction(rawTransaction, {
        // preflightCommitment: 'processed',
        skipPreflight: true,
        maxRetries: 0,
      });
    }
    console.log("Transaction sent", retryCount, expectedTransactionHash);
    // const result = await connection.confirmTransaction(hash)
    // if (result.value.err) {
    // 	if (count === 0) throw new Error(TX_FAILED_CONFIRM)
    // 	continue
    // }

    let slot;
    try {
      slot = await waitForTransaction(
        connection,
        expectedTransactionHash,
        3000
      );
    } catch {}

    if (!slot) {
      if (count === 0)
        throw new Error(
          `Error fetching transaction ${expectedTransactionHash}`
        );
      continue;
    }

    receipt = {
      transactionHash: expectedTransactionHash,
      blockNumber: slot,
    };
    count = 0;
  }
  // }

  return receipt?.transactionHash;
}

export async function waitForTransaction(
  connection: Connection,
  hash: string,
  timeout: number = 30000
) {
  let sigMonitorId;
  const ret: any = await new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve({ error: "Error timeout" });
    }, timeout);
    sigMonitorId = connection.onSignature(
      hash,
      (signatureResult: SignatureResult, context: Context) => {
        resolve({ error: signatureResult.err, ...context });
      },
      "processed"
    );
  });

  if (!ret.slot && sigMonitorId !== undefined) {
    connection.removeSignatureListener(sigMonitorId);
    throw new Error(JSON.stringify(ret.error));
  }
  return ret.slot;
}

export function isValidSolanaPrivateKey(key: string) {
  try {
    // Decode the base58 string
    const decoded = bs58.decode(key);

    // A valid Solana private key should be 64 bytes long
    if (decoded.length !== 64) {
      return false;
    }

    // Check if the decoded key can generate a valid key pair
    const keyPair = nacl.sign.keyPair.fromSecretKey(decoded);
    const publicKey = new PublicKey(keyPair.publicKey).toString();

    // If we can generate a key pair without error, the private key is valid
    return publicKey;
  } catch (e) {
    // If there's any error during decoding or key pair generation, the key is invalid
    return false;
  }
}
