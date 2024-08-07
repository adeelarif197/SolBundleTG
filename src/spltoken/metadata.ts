import * as dotenv from 'dotenv';
import path from 'path';
import fs from 'fs'
import { Metaplex, bundlrStorage, keypairIdentity, toMetaplexFile } from "@metaplex-foundation/js";
import { ComputeBudgetProgram, Connection, Keypair, PublicKey, TransactionMessage, VersionedTransaction } from "@solana/web3.js";
import { DataV2, PROGRAM_ID, createCreateMetadataAccountV3Instruction } from '@metaplex-foundation/mpl-token-metadata';
import { sendSignedTransaction } from '../utils/web3';


dotenv.config();
if (process.env.NODE_ENV == ('development' || 'development ')) {
	dotenv.config({ path: path.join(__dirname, '..', '.env.development') });
} else if (process.env.NODE_ENV == ('production' || 'production ')) {
	dotenv.config({ path: path.join(__dirname, '..', '.env') });
} else if (process.env.NODE_ENV == ('staging' || 'staging ')) {
	dotenv.config({ path: path.join(__dirname, '..', '.env.staging') });
}

export const createMetadata = async (connection: Connection, payer: Keypair, mint: PublicKey, {name, symbol, imgName, description, mintAuthority, updateAuthority}: {name: string, symbol: string, imgName: string, description: string, mintAuthority: PublicKey, updateAuthority: PublicKey}) => {
	const metaplex = Metaplex.make(connection)
		.use(keypairIdentity(payer))
		.use(
			bundlrStorage({
				address: process.env.MAINNET_BUNDLR_URL,
				providerUrl: process.env.MAINNET_RPC,
				timeout: 60000
			})
		);

	const [metadataPDA] = await PublicKey.findProgramAddress(
		[
			Buffer.from("metadata"),
			PROGRAM_ID.toBuffer(),
			mint.toBuffer()
		],
		PROGRAM_ID
	);

	// read file to buffer
	const buffer = fs.readFileSync(`assets/${imgName}`);
	// buffer to metaplex file
	const file = toMetaplexFile(buffer, imgName);

	console.log('1')
	// upload image and get image uri
	const imageUri = await metaplex.storage().upload(file);

	console.log('2')
	// upload metadata and get metadata uri (off chain metadata)
	const { uri } = await metaplex.nfts().uploadMetadata({
		name: name,
		symbol: symbol,
		description: description,
		image: imageUri,
	});

	console.log('3')
	// onchain metadata format
	const tokenMetadata = {
		name: name,
		symbol: symbol,
		uri: uri,
		sellerFeeBasisPoints: 0,
		creators: null,
		collection: null,
		uses: null
	} as DataV2;

	// transaction to create metadata account
	const cu = 200000
	const modifyComputeUnits = ComputeBudgetProgram.setComputeUnitLimit({ units: cu })
	const addPriorityFee = ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 100000 })
	const instructions = [
		createCreateMetadataAccountV3Instruction(
			{
				metadata: metadataPDA,
				mint: mint,
				mintAuthority: mintAuthority,
				payer: payer.publicKey,
				updateAuthority: updateAuthority,
			},
			{
				createMetadataAccountArgsV3: {
					data: tokenMetadata,
					isMutable: true,
					collectionDetails: null
				}
			}
		)
	]

	const recentBlockhash = await connection.getLatestBlockhash('finalized');
	const message = new TransactionMessage({
		payerKey: payer.publicKey,
		recentBlockhash: recentBlockhash.blockhash,
		instructions: [modifyComputeUnits, addPriorityFee, ...instructions]
	}).compileToV0Message();

	const newTransaction = new VersionedTransaction(message);

	newTransaction.sign([payer])

	return await sendSignedTransaction(connection, newTransaction)
}
