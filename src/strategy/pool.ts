import { SPL_ACCOUNT_LAYOUT } from '@raydium-io/raydium-sdk';
import { Connection, PublicKey } from '@solana/web3.js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config();
if (process.env.NODE_ENV == ('development' || 'development ')) {
	dotenv.config({ path: path.join(__dirname, '..', '.env.development') });
} else if (process.env.NODE_ENV == ('production' || 'production ')) {
	dotenv.config({ path: path.join(__dirname, '..', '.env') });
} else if (process.env.NODE_ENV == ('staging' || 'staging ')) {
	dotenv.config({ path: path.join(__dirname, '..', '.env.staging') });
}

const { createClient } = require('ioredis')

export async function getPoolInfo(tokenAddress: string) {
	const redisClient = createClient(process.env.REDIS_SERVER)

	const RAYDIUM_TOKEN_MAGIC = 'elsolvador-raydium-token-pools'
	const RAYDIUMPOOL_MAGIC = 'elsolvador-raydiumpoolv4'

	let poolInfo

	while (!poolInfo) {
		const tokenMagic = `${RAYDIUM_TOKEN_MAGIC}-${tokenAddress}`
		const pools = JSON.parse(await redisClient.get(tokenMagic) || '[]')
		const r2 = await Promise.all(pools.map(async (p: string) => {
			const poolInfoJson = await redisClient.get(`${RAYDIUMPOOL_MAGIC}-${p}`)
			return poolInfoJson? JSON.parse(poolInfoJson): null
		}))
		const poolInfos = r2.filter(p => p !== null)
		if (poolInfos.length === 0) {
			continue
		}
		poolInfo = poolInfos[0]
	}
	return poolInfo
}

export async function getPooledSOL(connection: Connection, tokenAddress: string, target: number) {
	const poolInfo = await getPoolInfo(tokenAddress)

	let pooledSOL
	while (true) {
		const vaultAcc = await connection.getAccountInfo(new PublicKey(poolInfo.quoteVault))
		if (vaultAcc === null) return

		const vaultInfo = SPL_ACCOUNT_LAYOUT.decode(vaultAcc.data)
		pooledSOL = vaultInfo.amount.toNumber()
		if (pooledSOL >= target) break
	}
	
	return pooledSOL
}
