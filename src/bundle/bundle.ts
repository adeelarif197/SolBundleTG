import cluster from 'cluster'
import {
	Connection,
    PublicKey,
} from "@solana/web3.js";
import { SearcherClient } from "jito-ts/dist//sdk/block-engine/searcher";
import { Bundle } from "jito-ts/dist//sdk/block-engine/types";
import { isError } from "jito-ts/dist//sdk/block-engine/utils";
import { BundleResult } from "jito-ts/dist//gen/block-engine/bundle";
import { searcherClient } from 'jito-ts/dist//sdk/block-engine/searcher';
import {
    BLOCK_ENGINE_URL, 
    jito_auth_keypairs, 
} from './config';

export async function buildAndSendJitoBundle(
	connection: Connection,
    search: SearcherClient, 
    txns: any[],
	payerKeypair: any,
	tipAmount: number
) {
    const _tipAccount = (await search.getTipAccounts())[0];
    const tipAccount = new PublicKey(_tipAccount);

    const bund = new Bundle([], txns.length + 1);
    const resp = await connection.getLatestBlockhash("finalized");

    for (let i = 0; i < txns.length; i++) {
        bund.addTransactions(txns[i]);
    }

    let maybeBundle = bund.addTipTx(
        payerKeypair, 
		tipAmount,
        tipAccount, 
        resp.blockhash
    );

    if (isError(maybeBundle)) {
		console.log(maybeBundle)
        throw new Error('Bundle tipping error');
    }

    try {
        const response_bund = await search.sendBundle(maybeBundle);
        // console.log("response_bund:", response_bund);
    } catch (err) {
        console.error("error sending bundle:", err);
    }

    return maybeBundle;
}


function onJitoBundleResultProc(c: SearcherClient): Promise<BundleResult | undefined> {
    return new Promise((resolve) => {
        // Set a timeout to reject the promise if no bundle is accepted within 5 seconds
        setTimeout(() => {
            resolve(undefined);
        }, 1000);

        c.onBundleResult(
            (result) => {
				resolve(result)
            },
            (err) => {
				console.error('[onJitoBundleResultProc]')
                console.error(err);
				resolve(undefined)
                // Do not reject the promise here
            }
        );
    });
}

let keypair_idx: number | unknown
export async function sendAndConfirmJitoBundle(connection: Connection, txs: any[], payerKeypair: any, tipAmount: number) {
	if (!keypair_idx) {
		keypair_idx = ((cluster.worker?.id || 0) % jito_auth_keypairs.length)
	}
	
	const kn = keypair_idx as number
	keypair_idx = (kn + 1) % jito_auth_keypairs.length

	console.log(`Bundling by Jito signer [${kn}.${jito_auth_keypairs[kn].publicKey.toBase58()}]`)
	const search = searcherClient(BLOCK_ENGINE_URL, jito_auth_keypairs[kn]);

	await buildAndSendJitoBundle(connection, search, txs, payerKeypair, tipAmount);

	const bundle_result = await onJitoBundleResultProc(search);

	return bundle_result;
}
