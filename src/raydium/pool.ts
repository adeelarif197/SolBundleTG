import { Market } from "@project-serum/serum";
import { LOOKUP_TABLE_CACHE, Liquidity, MAINNET_PROGRAM_ID, SPL_ACCOUNT_LAYOUT, Token, TokenAmount, TxVersion, buildSimpleTransaction } from "@raydium-io/raydium-sdk";
import { ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync, getMint } from "@solana/spl-token";
import { AccountInfo, Connection, Keypair, PublicKey, VersionedTransaction } from "@solana/web3.js";
import { getWalletTokenAccounts } from "../utils";
import BN from "bn.js";

export const createPoolTxBuild = async (connection: Connection, payer: Keypair, baseMint: PublicKey, baseTokenAmount: bigint, solAmount: bigint) => {
	const baseMintInfo = await getMint(connection, baseMint);
	const baseToken = new Token(TOKEN_PROGRAM_ID, baseMint, baseMintInfo.decimals);
	const quoteToken = Token.WSOL;

	const accounts = await Market.findAccountsByMints(connection, baseToken.mint, quoteToken.mint, MAINNET_PROGRAM_ID.OPENBOOK_MARKET);
	if (accounts.length === 0) {
		console.error("  Failed to find OpenBook market");
		return null;
	}
	const marketId = accounts[0].publicKey;

	const startTime = Math.floor(Date.now() / 1000);
	const baseAmount = baseTokenAmount// * BigInt(10 ** baseToken.decimals);
	const quoteAmount = solAmount// * BigInt(10 ** quoteToken.decimals);
	const walletTokenAccounts = await getWalletTokenAccounts(connection, payer.publicKey);

	const { innerTransactions, address } = await Liquidity.makeCreatePoolV4InstructionV2Simple({
		connection,
		programId: MAINNET_PROGRAM_ID.AmmV4,
		marketInfo: {
			marketId: marketId,
			programId: MAINNET_PROGRAM_ID.OPENBOOK_MARKET,
		},
		baseMintInfo: baseToken,
		quoteMintInfo: quoteToken,
		baseAmount: new BN(baseAmount.toString()),
		quoteAmount: new BN(quoteAmount.toString()),
		startTime: new BN(startTime),
		ownerInfo: {
			feePayer: payer.publicKey,
			wallet: payer.publicKey,
			tokenAccounts: walletTokenAccounts,
			useSOLBalance: true,
		},
		associatedOnly: false,
		checkCreateATAOwner: true,
		makeTxVersion: TxVersion.V0,
		feeDestinationId:
			new PublicKey("7YttLkHDoNj9wyDur5pM1ejNaAvT9X4eqaYcHQqtj2G5") // devnet: "3XMrhbv989VxAMi3DErLV9eJht1pHppW5LbKxe9fkEFR"
	});

	const blockRet = await connection.getLatestBlockhash('finalized')
	const willSendTx = await buildSimpleTransaction({
		makeTxVersion: TxVersion.V0,
		payer: payer.publicKey,
		connection,
		innerTransactions: innerTransactions,
		addLookupTableInfo: LOOKUP_TABLE_CACHE,
		recentBlockhash: blockRet.blockhash
	});

	return willSendTx.map(tx => {
		const newTransaction = tx as VersionedTransaction
		newTransaction.sign([payer])

		return newTransaction
	})
}

export async function removeLiquidity(connection: Connection, payer: Keypair, poolKeys: any) {
	const lpMint = new PublicKey(poolKeys.lpMint)
	const lpTokenAccount = getAssociatedTokenAddressSync(
		lpMint,
		payer.publicKey,
		false,
		TOKEN_PROGRAM_ID,
		ASSOCIATED_TOKEN_PROGRAM_ID
	);
	const baseTokenAccount = getAssociatedTokenAddressSync(
		new PublicKey(poolKeys.baseMint),
		payer.publicKey,
		false,
		TOKEN_PROGRAM_ID,
		ASSOCIATED_TOKEN_PROGRAM_ID
	);
	const quoteTokenAccount = getAssociatedTokenAddressSync(
		new PublicKey(poolKeys.quoteMint),
		payer.publicKey,
		false,
		TOKEN_PROGRAM_ID,
		ASSOCIATED_TOKEN_PROGRAM_ID
	);

	const tokens = [lpTokenAccount, baseTokenAccount, quoteTokenAccount]
	const accInfosRet: (AccountInfo<Buffer> | null)[] = await Promise.all(tokens.map(t => connection.getAccountInfo(t)))
	const accountInfos: AccountInfo<Buffer>[] = accInfosRet.filter(acc => acc !== null) as AccountInfo<Buffer>[]
	const tokenAccounts = accountInfos.map((acc, idx) => {
		const decoded = SPL_ACCOUNT_LAYOUT.decode(acc.data)
		return {
			programId: TOKEN_PROGRAM_ID,
			accountInfo: decoded,
			pubkey: tokens[idx]
		}
	})

	const lpToken = new Token(TOKEN_PROGRAM_ID, lpMint, poolKeys.lpDecimals)
	const transactionInfo = await Liquidity.makeRemoveLiquidityInstructionSimple(
		{
			connection: connection,
			poolKeys: {
				...poolKeys,
				id: new PublicKey(poolKeys.id),
				programId: new PublicKey(poolKeys.programId),
				authority: new PublicKey(poolKeys.authority),
				openOrders: new PublicKey(poolKeys.openOrders),
				targetOrders: new PublicKey(poolKeys.targetOrders),
				baseMint: new PublicKey(poolKeys.baseMint),
				quoteMint: new PublicKey(poolKeys.quoteMint),
				lpMint: new PublicKey(poolKeys.lpMint),
				baseVault: new PublicKey(poolKeys.baseVault),
				quoteVault: new PublicKey(poolKeys.quoteVault),
				withdrawQueue: new PublicKey(poolKeys.withdrawQueue),
				lpVault: new PublicKey(poolKeys.lpVault),
				marketProgramId: new PublicKey(poolKeys.marketProgramId),
				marketId: new PublicKey(poolKeys.marketId),
				marketBaseVault: new PublicKey(poolKeys.marketBaseVault),
				marketQuoteVault: new PublicKey(poolKeys.marketQuoteVault),
				marketAuthority: new PublicKey(poolKeys.marketAuthority),
				lpTokenAccount: lpTokenAccount,
				baseTokenAccount: baseTokenAccount,
				quoteTokenAccount: quoteTokenAccount,
				owner: payer.publicKey,
				marketEventQueue: new PublicKey(poolKeys.marketEventQueue),
				marketBids: new PublicKey(poolKeys.marketBids),
				marketAsks: new PublicKey(poolKeys.marketAsks),
				lookupTableAccount: new PublicKey(poolKeys.lookupTableAccount),
			},
			userKeys: {
				tokenAccounts,
				owner: payer.publicKey,
			},
			amountIn: new TokenAmount(lpToken, tokenAccounts[0].accountInfo.amount),
			makeTxVersion: TxVersion.V0,
			computeBudgetConfig: {
				units: 200000,
				microLamports: 1000000
			}
		})

	const blockRet = await connection.getLatestBlockhash('finalized')
	const willSendTx = await buildSimpleTransaction({
		makeTxVersion: TxVersion.V0,
		payer: payer.publicKey,
		connection,
		innerTransactions: transactionInfo.innerTransactions,
		addLookupTableInfo: LOOKUP_TABLE_CACHE,
		recentBlockhash: blockRet.blockhash
	});

	return willSendTx.map(tx => {
		const newTransaction = tx as VersionedTransaction
		newTransaction.sign([payer])

		return newTransaction
	})
}