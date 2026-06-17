// useFreighter.ts
import { useState, useEffect, useCallback } from 'react'

export type WalletState = 'idle' | 'connecting' | 'connected' | 'error' | 'not_installed'

export function useFreighter() {
  const [walletState, setWalletState] = useState<WalletState>('idle')
  const [publicKey, setPublicKey] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const check = async () => {
      try {
        const f = await import('@stellar/freighter-api')
        if (await f.isConnected()) {
          const { address } = await f.getAddress()
          if (address) { setPublicKey(address); setWalletState('connected') }
        }
      } catch { /* not connected */ }
    }
    check()
  }, [])

  const connect = useCallback(async () => {
    setWalletState('connecting')
    setError(null)
    try {
      const f = await import('@stellar/freighter-api')
      if (!await f.isConnected()) {
        setWalletState('not_installed')
        setError('Freighter not found — install it at freighter.app')
        return
      }
      const { error: reqErr } = await f.requestAccess()
      if (reqErr) throw new Error(reqErr)
      const { address, error: addrErr } = await f.getAddress()
      if (addrErr || !address) throw new Error(addrErr || 'No address returned')
      const { networkPassphrase } = await f.getNetworkDetails()
      if (!networkPassphrase.includes('Test')) throw new Error('Switch Freighter to Testnet')
      setPublicKey(address)
      setWalletState('connected')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed')
      setWalletState('error')
    }
  }, [])

  const disconnect = useCallback(() => {
    setPublicKey(null); setWalletState('idle'); setError(null)
  }, [])

  return { walletState, publicKey, error, connect, disconnect, isConnected: walletState === 'connected' && !!publicKey }
}