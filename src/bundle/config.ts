import { Keypair } from '@solana/web3.js';
import * as dotenv from 'dotenv';
import path from 'path';
import bs58 from 'bs58';

dotenv.config();
if (process.env.NODE_ENV == ('development' || 'development ')) {
	dotenv.config({ path: path.join(__dirname, '..', '.env.development') });
} else if (process.env.NODE_ENV == ('production' || 'production ')) {
	dotenv.config({ path: path.join(__dirname, '..', '.env') });
} else if (process.env.NODE_ENV == ('staging' || 'staging ')) {
	dotenv.config({ path: path.join(__dirname, '..', '.env.staging') });
}

export const BLOCK_ENGINE_URL = "frankfurt.mainnet.block-engine.jito.wtf";
export const jito_auth_keypairs = [
	Keypair.fromSecretKey(Uint8Array.from(bs58.decode(process.env.JITO_WALLET_KCY1 || ''))),
]
