import * as dotenv from 'dotenv';
import path from 'path';
import bs58 from 'bs58'
import fs from 'fs'

import { Connection, Keypair, PublicKey, Transaction, VersionedTransaction } from "@solana/web3.js";
import {
	Token,
	TokenAmount,
	TOKEN_PROGRAM_ID,
	ASSOCIATED_TOKEN_PROGRAM_ID,
	SPL_ACCOUNT_LAYOUT
} from "@raydium-io/raydium-sdk";
import { getAssociatedTokenAddressSync } from '@solana/spl-token';
import { sendAndConfirmJitoBundle } from '../bundle/bundle';
import { waitForTransaction } from '../utils/web3';
import { buildSwapTransactions } from '../raydium/swap';

dotenv.config();
if (process.env.NODE_ENV == ('development' || 'development ')) {
	dotenv.config({ path: path.join(__dirname, '..', '.env.development') });
} else if (process.env.NODE_ENV == ('production' || 'production ')) {
	dotenv.config({ path: path.join(__dirname, '..', '.env') });
} else if (process.env.NODE_ENV == ('staging' || 'staging ')) {
	dotenv.config({ path: path.join(__dirname, '..', '.env.staging') });
}

export const sellALL = async () => {
	const DECIMALS = 9
	const connection = new Connection(process.env.MAINNET_RPC || '', { commitment: 'processed' })
	const payer = Keypair.fromSecretKey(bs58.decode(process.env.OWNER_PK || ''))

	{
		const allkeypairs = [
			Keypair.fromSecretKey(bs58.decode(process.env.OWNER_PK || '')),
			Keypair.fromSecretKey(bs58.decode(process.env.BUYER1_PK || '')),
			Keypair.fromSecretKey(bs58.decode(process.env.BUYER2_PK || '')),
			Keypair.fromSecretKey(bs58.decode(process.env.BUYER3_PK || '')),
		]
		console.log('')
		console.log('All Wallets')
		allkeypairs.forEach(k => {
			console.log(k.publicKey.toString())
		})
		console.log('')
		console.log('')
	}

	console.log(process.env.MAINNET_RPC)
	console.log(payer.publicKey.toString())

	const bal = await connection.getBalance(payer.publicKey)
	if (bal === 0) return

	let tokenAddress
	try {
		const textRead: string = fs.readFileSync('1.json').toString()
		const objRead = JSON.parse(textRead)
		console.log(objRead)
		tokenAddress = objRead.token
	} catch (err) {
	}

	if (tokenAddress) {
		const tokenMint = new PublicKey(tokenAddress)
		const sellList = [
			{
				signer: Keypair.fromSecretKey(bs58.decode(process.env.BUYER1_PK || '')),
			},
			{
				signer: Keypair.fromSecretKey(bs58.decode(process.env.BUYER2_PK || '')),
			},
			{
				signer: Keypair.fromSecretKey(bs58.decode(process.env.BUYER3_PK || '')),
			},
		]

		const buyPromises = sellList.map(async seller => {
			const token = new Token(TOKEN_PROGRAM_ID, tokenMint, DECIMALS)
			const associatedToken = getAssociatedTokenAddressSync(
				tokenMint,
				seller.signer.publicKey,
				false,
				TOKEN_PROGRAM_ID,
				ASSOCIATED_TOKEN_PROGRAM_ID
			);

			const accountInfo = await connection.getAccountInfo(associatedToken)
			if (accountInfo === null) {
				return null
			}

			const tokenATA = SPL_ACCOUNT_LAYOUT.decode(accountInfo.data)

			const inputTokenAmount = new TokenAmount(token, tokenATA.amount);
			const outputToken = new Token(TOKEN_PROGRAM_ID, Token.WSOL.mint, DECIMALS);
			const sell1Array: (VersionedTransaction | Transaction)[] = await buildSwapTransactions(connection, seller.signer, inputTokenAmount, outputToken, false)
			if (sell1Array === null || sell1Array.length !== 1) {
				return null
			} else {
				const txn = sell1Array[0] as VersionedTransaction
				txn.sign([seller.signer])
				console.log(`bundle tx ${seller.signer.publicKey.toString()}`, bs58.encode(txn.signatures[0]))
				return txn
			}
		})

		console.log('Building transactions...')
		const txnRets = await Promise.all(buyPromises)
		const totalTransactions: VersionedTransaction[] = txnRets.filter(t => t !== null).map(t => { return t as VersionedTransaction })
		const simRes = await connection.simulateTransaction(totalTransactions[0])

		if (simRes.value.err) {
			console.log('sell simulation', simRes)
			process.exit(1)
		} else {
			const tipAmount = (10 ** 9) * 5 / 100
			for (let cnt = 0; cnt < 3; cnt ++) {
				const bundleResult = await sendAndConfirmJitoBundle(connection, totalTransactions, payer, tipAmount)
				if (bundleResult && !bundleResult?.accepted) {
					console.log(bundleResult)
					continue
					// throw new Error(bundleResult?.rejected?.stateAuctionBidRejected?.msg || 'Not accepted by bundle')
				}

				const expectedTransactionHash = bs58.encode(totalTransactions[0].signatures[0])
				try {
					const slot = await waitForTransaction(connection, expectedTransactionHash)
					console.log("Sold at", slot)
				} catch (err) {
					console.error(err)
				}
			}
		}
	} else {
		console.log('Sell token is not defined')
	}
}
