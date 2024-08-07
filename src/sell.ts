import * as dotenv from 'dotenv';
import path from 'path';
import { Connection } from "@solana/web3.js"
import { getPoolInfo } from "./strategy/pool"
import { sellALL } from "./strategy/sell"
import fs from 'fs'
import { PublicKey } from '@metaplex-foundation/js';
import { SPL_ACCOUNT_LAYOUT } from '@raydium-io/raydium-sdk';

dotenv.config();
if (process.env.NODE_ENV == ('development' || 'development ')) {
	dotenv.config({ path: path.join(__dirname, '..', '.env.development') });
} else if (process.env.NODE_ENV == ('production' || 'production ')) {
	dotenv.config({ path: path.join(__dirname, '..', '.env') });
} else if (process.env.NODE_ENV == ('staging' || 'staging ')) {
	dotenv.config({ path: path.join(__dirname, '..', '.env.staging') });
}

const main = async () => {
	await sellALL()
	process.exit(0)
}

main()