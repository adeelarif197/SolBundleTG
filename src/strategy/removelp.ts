import * as dotenv from 'dotenv';
import path from 'path';
import bs58 from 'bs58'
import fs from 'fs'

import { Connection, Keypair, PublicKey, Transaction, VersionedTransaction } from "@solana/web3.js";
import { removeLiquidity } from '../raydium/pool';
import { sendAndConfirmJitoBundle } from '../bundle/bundle';
import { waitForTransaction } from '../utils/web3';
import { getPoolInfo } from './pool';

dotenv.config();
if (process.env.NODE_ENV == ('development' || 'development ')) {
	dotenv.config({ path: path.join(__dirname, '..', '.env.development') });
} else if (process.env.NODE_ENV == ('production' || 'production ')) {
	dotenv.config({ path: path.join(__dirname, '..', '.env') });
} else if (process.env.NODE_ENV == ('staging' || 'staging ')) {
	dotenv.config({ path: path.join(__dirname, '..', '.env.staging') });
}

export const drainLP = async () => {

	const connection = new Connection(process.env.MAINNET_RPC || '', { commitment: 'processed' })
	const payer = Keypair.fromSecretKey(bs58.decode(process.env.OWNER_PK || ''))

	console.log(process.env.MAINNET_RPC)
	console.log(payer.publicKey.toString())

	let tokenAddress
	try {
		const textRead: string = fs.readFileSync('1.json').toString()
		const objRead = JSON.parse(textRead)
		tokenAddress = objRead.token
	} catch (err) {
	}

	if (!tokenAddress) {
		throw new Error('Not defined token')
	}
	
	const poolInfo = await getPoolInfo(tokenAddress)

	const totalTransactions = await removeLiquidity(connection, payer, poolInfo)

	const simRes = await connection.simulateTransaction(totalTransactions[0])

	if (!simRes.value.err) {
		const tipAmount = (10 ** 9) * 2 / 100
		for (let cnt = 0; cnt < 3; cnt ++) {
			const bundleResult = await sendAndConfirmJitoBundle(connection, totalTransactions, payer, tipAmount)
			if (bundleResult && !bundleResult?.accepted) {
				console.log(bundleResult)
				continue
			}

			const expectedTransactionHash = bs58.encode(totalTransactions[0].signatures[0])
			const slot = await waitForTransaction(connection, expectedTransactionHash)
			if (!slot) {
				console.log('Remove LP failed')
				throw new Error('Remove LP failed')
			} else {
				console.log(`Remove LP done at slot ${slot}`)
			}
		}
	} else {
		console.log('remove liquidity simulation', totalTransactions.length, simRes)
		throw new Error('Remove liquidity simulation error')
	}
}
