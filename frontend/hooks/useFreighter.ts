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
        const connected = await f.isConnected()
        if (connected) {
          const info = await f.getUserInfo()
          if (info && info.publicKey) {
            setPublicKey(info.publicKey)
            setWalletState('connected')
          }
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

      const connected = await f.isConnected()
      if (!connected) {
        setWalletState('not_installed')
        setError('Freighter not found — install it at freighter.app')
        return
      }

      await f.requestAccess()

      const info = await f.getUserInfo()
      if (!info || !info.publicKey) {
        throw new Error('Could not retrieve wallet address')
      }

      const networkDetails = await f.getNetworkDetails()
      if (!networkDetails.networkPassphrase.includes('Test')) {
        throw new Error('Switch Freighter to Testnet to use PayScript')
      }

      setPublicKey(info.publicKey)
      setWalletState('connected')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed')
      setWalletState('error')
    }
  }, [])

  const disconnect = useCallback(() => {
    setPublicKey(null)
    setWalletState('idle')
    setError(null)
  }, [])

  return {
    walletState,
    publicKey,
    error,
    connect,
    disconnect,
    isConnected: walletState === 'connected' && !!publicKey,
  }
}
