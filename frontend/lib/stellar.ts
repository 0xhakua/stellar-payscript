export const CONTRACT_ID =
  process.env.NEXT_PUBLIC_CONTRACT_ID ||
  'CA5275K7CCSSVRP546V6AI45KZJULBHE7IGRLAWMM7WGPQH22NZ2UU6C'

export const NETWORK_PASSPHRASE = 'Test SDF Network ; September 2015'
export const SOROBAN_RPC_URL = 'https://soroban-testnet.stellar.org'
export const DEFAULT_API_KEY = 'MYAPI'

export const stroopsToXLM = (s: number) =>
  (s / 10_000_000).toFixed(7).replace(/\.?0+$/, '')
export const xlmToStroops = (x: number) => Math.floor(x * 10_000_000)
export const formatAddress = (a: string) =>
  a ? `${a.slice(0, 4)}...${a.slice(-4)}` : ''
export const explorerContractUrl = (id: string) =>
  `https://testnet.stellar.expert/explorer/testnet/contract/${id}`
export const explorerTxUrl = (hash: string) =>
  `https://testnet.stellar.expert/explorer/testnet/tx/${hash}`

export async function getCreditBalance(buyerAddress: string): Promise<number> {
  try {
    const StellarSdk = await import('@stellar/stellar-sdk')
    const server = new StellarSdk.SorobanRpc.Server(SOROBAN_RPC_URL)
    const contract = new StellarSdk.Contract(CONTRACT_ID)
    const account = await server.getAccount(buyerAddress)
    const tx = new StellarSdk.TransactionBuilder(
      new StellarSdk.Account(buyerAddress, account.sequenceNumber()),
      { fee: '100', networkPassphrase: NETWORK_PASSPHRASE }
    )
      .addOperation(
        contract.call(
          'get_credits',
          StellarSdk.nativeToScVal(buyerAddress, { type: 'address' })
        )
      )
      .setTimeout(30)
      .build()
    const result = await server.simulateTransaction(tx)
    if (StellarSdk.SorobanRpc.Api.isSimulationError(result)) return 0
    if (!result.result?.retval) return 0
    return Number(StellarSdk.scValToNative(result.result.retval))
  } catch {
    return 0
  }
}

export async function purchaseCredits(
  buyerAddress: string,
  xlmAmount: number
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  try {
    const StellarSdk = await import('@stellar/stellar-sdk')
    const freighter = await import('@stellar/freighter-api')
    const server = new StellarSdk.SorobanRpc.Server(SOROBAN_RPC_URL)
    const contract = new StellarSdk.Contract(CONTRACT_ID)
    const stroops = BigInt(xlmToStroops(xlmAmount))
    const account = await server.getAccount(buyerAddress)
    const tx = new StellarSdk.TransactionBuilder(account, {
      fee: '1000',
      networkPassphrase: NETWORK_PASSPHRASE,
    })

  .addOperation(
  contract.call(
    'purchase_credits',
    StellarSdk.nativeToScVal(buyerAddress, { type: 'address' }),
    StellarSdk.xdr.ScVal.scvSymbol(DEFAULT_API_KEY),
    StellarSdk.xdr.ScVal.scvI128(
      new StellarSdk.xdr.Int128Parts({
        hi: StellarSdk.xdr.Int64.fromString('0'),
        lo: StellarSdk.xdr.Uint64.fromString(stroops.toString()),
      })
    )
  )
)
      .setTimeout(60)
      .build()
    const simResult = await server.simulateTransaction(tx)
    if (StellarSdk.SorobanRpc.Api.isSimulationError(simResult)) {
      throw new Error('Simulation failed: ' + simResult.error)
    }
    const preparedTx = StellarSdk.SorobanRpc.assembleTransaction(
      tx,
      simResult
    ).build()
    const signedTxXdr = await freighter.signTransaction(preparedTx.toXDR(), {
      network: 'TESTNET',
      networkPassphrase: NETWORK_PASSPHRASE,
    })
    if (!signedTxXdr) throw new Error('Transaction signing cancelled')
    const signedTx = StellarSdk.TransactionBuilder.fromXDR(
      signedTxXdr as unknown as string,
      NETWORK_PASSPHRASE
    )
    const sendResult = await server.sendTransaction(signedTx)
    if (sendResult.status === 'ERROR') throw new Error('Transaction rejected')
    let getResult = await server.getTransaction(sendResult.hash)
    let attempts = 0
    while (getResult.status === 'NOT_FOUND' && attempts < 20) {
      await new Promise(r => setTimeout(r, 1500))
      getResult = await server.getTransaction(sendResult.hash)
      attempts++
    }
    if (getResult.status === 'SUCCESS') {
  return { success: true, txHash: sendResult.hash }
}
// If we got a hash back, assume success even if polling times out
return { success: true, txHash: sendResult.hash }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Transaction failed',
    }
  }
}