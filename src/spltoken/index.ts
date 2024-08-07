import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { createTokenMint, mintToken } from "./mint";
import { sleep } from "../utils";
import { createMetadata } from "./metadata";
import { AuthorityType, setAuthority } from "@solana/spl-token";
import { renounceAuthority } from "./authority";

export const createToken = async (
	connection: Connection,
	payer: Keypair,
	{
		name,
		symbol,
		decimals,
		totalSupply,
		imgName,
		description,
		mintAuthority,
		updateAuthority,
	} : {
		name: string,
		symbol: string,
		decimals: number,
		totalSupply: number,
		imgName: string,
		description: string,
		mintAuthority: PublicKey,
		updateAuthority: PublicKey,
	}
) => {
	// const mint = new PublicKey('CLZjNUHKJ2iDbDudGfGvJMdSp4T9vZJPts2v88HyagZo')
	/* Step 1 - Create a new token */
	console.log('Creating token...')
	const mint: PublicKey = await createTokenMint(connection, payer, {mintAuthority, freezeAuthority: null, decimals});
	if (mint === null) {
		return null;
	}
	console.log(`Token minted at ${mint.toString()}`)
	await sleep(3000);

	/* Step 2 - Create metadata */
	console.log('Creating metadata...')
	const created = await createMetadata(connection, payer, mint, {name, symbol, imgName, description, mintAuthority, updateAuthority});
	if (!created) {
		return null;
	}

	/* Step 3 - Mint tokens to owner */
	console.log('Minting token...')
	const minted = await mintToken(connection, payer, mint, mintAuthority, BigInt(totalSupply), decimals);
	if (!minted) {
		return null;
	}
	await sleep(3000);

	/* Last Step - Revoke mint authority */
	console.log('Renouncing...')
	const disableMintSig = await renounceAuthority(
		connection,
		payer,
		mint,
		mintAuthority,
		AuthorityType.MintTokens
	);
	if (!disableMintSig) {
		return null
	}

	return mint
}

