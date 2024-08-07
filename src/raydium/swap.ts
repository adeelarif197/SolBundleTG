
import { 
    Market, 
    MARKET_STATE_LAYOUT_V3 
} from "@project-serum/serum";
import { 
    Token, 
    TokenAmount, 
    Percent, 
    Liquidity, 
    buildSimpleTransaction,
    LiquidityPoolKeys,
	MAINNET_PROGRAM_ID,
	TxVersion,
	LOOKUP_TABLE_CACHE
} from "@raydium-io/raydium-sdk";
import { Connection, Keypair } from "@solana/web3.js";
import { getWalletTokenAccounts } from "../utils";

export const buildSwapTransactions = async (connection: Connection, payer: Keypair, inputTokenAmount: TokenAmount, outputToken: Token, isBuy: boolean) => {
    const baseToken = isBuy ? outputToken : inputTokenAmount.token;
    const quoteToken = isBuy ? inputTokenAmount.token : outputToken;
    const walletTokenAccounts = await getWalletTokenAccounts(connection, payer.publicKey);

    const slippage = new Percent(100, 100);

    const [{ publicKey: marketId, accountInfo }] = await Market.findAccountsByMints(connection, baseToken.mint, quoteToken.mint, MAINNET_PROGRAM_ID.OPENBOOK_MARKET);
    // console.log("  accountInfo:", accountInfo);
    const marketInfo = MARKET_STATE_LAYOUT_V3.decode(accountInfo.data);
    let poolKeys = Liquidity.getAssociatedPoolKeys({
        version: 4,
        marketVersion: 3,
        baseMint: baseToken.mint,
        quoteMint: quoteToken.mint,
        baseDecimals: baseToken.decimals,
        quoteDecimals: quoteToken.decimals,
        marketId: marketId,
        programId: MAINNET_PROGRAM_ID.AmmV4,
        marketProgramId: MAINNET_PROGRAM_ID.OPENBOOK_MARKET,
    });
    // console.log("  poolKeys:", poolKeys);

    let poolKeys2: LiquidityPoolKeys = {
        id: poolKeys.id,
        baseMint: poolKeys.baseMint,
        quoteMint: poolKeys.quoteMint,
        lpMint: poolKeys.lpMint,
        baseDecimals: poolKeys.baseDecimals,
        quoteDecimals: poolKeys.quoteDecimals,
        lpDecimals: poolKeys.lpDecimals,
        version: poolKeys.version,
        programId: poolKeys.programId,
        authority: poolKeys.authority,
        openOrders: poolKeys.openOrders,
        targetOrders: poolKeys.targetOrders,
        baseVault: poolKeys.baseVault,
        quoteVault: poolKeys.quoteVault,
        withdrawQueue: poolKeys.withdrawQueue,
        lpVault: poolKeys.lpVault,
        marketVersion: poolKeys.marketVersion,
        marketProgramId: poolKeys.marketProgramId,
        marketId: poolKeys.marketId,
        marketAuthority: poolKeys.marketAuthority,
        marketBaseVault: marketInfo.baseVault,
        marketQuoteVault: marketInfo.quoteVault,
        marketBids: marketInfo.bids,
        marketAsks: marketInfo.asks,
        marketEventQueue: marketInfo.eventQueue,
        lookupTableAccount: poolKeys.lookupTableAccount
    };
    // console.log("  poolKeys2:", poolKeys2);

	// // -------- step 1: compute amount out --------
	// const { amountOut, minAmountOut } = Liquidity.computeAmountOut({
	// 	poolKeys: poolKeys2,
	// 	poolInfo: await Liquidity.fetchInfo({ connection, poolKeys: poolKeys2 }),
	// 	amountIn: inputTokenAmount,
	// 	currencyOut: outputToken,
	// 	slippage: slippage,
	// });
	// // console.log('  amountOut:', amountOut.toFixed(), '  minAmountOut:', minAmountOut.toFixed());

    // -------- step 2: create instructions by SDK function --------
    const { innerTransactions } = await Liquidity.makeSwapInstructionSimple({
        connection,
        poolKeys: poolKeys2,
        userKeys: {
            tokenAccounts: walletTokenAccounts,
            owner: payer.publicKey,
        },
        amountIn: inputTokenAmount,
        amountOut: new TokenAmount(outputToken, 1), //minAmountOut,
        fixedSide: 'in',
        makeTxVersion: TxVersion.V0,
    });

	const blockRet = await connection.getLatestBlockhash('finalized')

    const transactions = await buildSimpleTransaction({
        connection: connection,
        makeTxVersion: TxVersion.V0,
        payer: payer.publicKey,
        innerTransactions: innerTransactions,
        addLookupTableInfo: LOOKUP_TABLE_CACHE,
		recentBlockhash: blockRet.blockhash
    });
	return transactions
}
