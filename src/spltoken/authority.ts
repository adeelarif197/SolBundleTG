import { PublicKey } from "@metaplex-foundation/js";
import { AuthorityType, TOKEN_PROGRAM_ID, createSetAuthorityInstruction } from "@solana/spl-token";
import { ComputeBudgetProgram, ConfirmOptions, Connection, Signer, TransactionMessage, VersionedTransaction } from "@solana/web3.js";
import { sendSignedTransaction } from "../utils/web3";

export async function renounceAuthority(
	connection: Connection,
	payer: Signer,
	account: PublicKey,
	currentAuthority: PublicKey,
	authorityType: AuthorityType,
) {
	const recentBlockhash = await connection.getLatestBlockhash('finalized');
	const cu = 100000
	const modifyComputeUnits = ComputeBudgetProgram.setComputeUnitLimit({ units: cu })
	const addPriorityFee = ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 100000 })

	const message = new TransactionMessage({
		payerKey: payer.publicKey,
		recentBlockhash: recentBlockhash.blockhash,
		instructions: [
			modifyComputeUnits,
			addPriorityFee,
			createSetAuthorityInstruction(
				account,
				currentAuthority,
				authorityType,
				null,
				[],
				TOKEN_PROGRAM_ID
			)
		]
	}).compileToV0Message();

	const newTransaction = new VersionedTransaction(message);

	newTransaction.sign([payer])

	return await sendSignedTransaction(connection, newTransaction)
}