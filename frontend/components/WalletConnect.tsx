// WalletConnect.tsx
import { Wallet, Loader2, AlertCircle } from 'lucide-react'
import { formatAddress } from '../lib/stellar'
import type { WalletState } from '../hooks/useFreighter'

interface Props {
  walletState: WalletState
  publicKey: string | null
  error: string | null
  connect: () => void
  disconnect: () => void
}

export default function WalletConnect({ walletState, publicKey, error, connect, disconnect }: Props) {
  return (
    <div className="border border-white/10 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <Wallet className="w-3.5 h-3.5 text-white/30" />
        <span className="text-xs text-white/30 font-mono uppercase tracking-widest">Wallet</span>
      </div>

      {walletState === 'connected' && publicKey ? (
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
            <span className="font-mono text-sm">{formatAddress(publicKey)}</span>
            <span className="text-xs font-mono px-2 py-0.5 rounded border border-emerald-400/20 text-emerald-400">Testnet</span>
          </div>
          <button onClick={disconnect} className="text-xs text-white/30 hover:text-white/60 transition-colors font-mono">
            disconnect
          </button>
        </div>
      ) : (
        <div>
          <button
            onClick={connect}
            disabled={walletState === 'connecting'}
            className="w-full flex items-center justify-center gap-2 bg-white text-black text-sm font-medium py-3 rounded-lg hover:bg-white/90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {walletState === 'connecting'
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Connecting...</>
              : <><Wallet className="w-4 h-4" /> Connect Freighter</>
            }
          </button>

          {walletState === 'not_installed' && (
            <p className="mt-3 flex items-center gap-2 text-xs text-amber-400">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              Freighter not found.{' '}
              <a href="https://freighter.app" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
                Install it here →
              </a>
            </p>
          )}

          {walletState === 'error' && error && (
            <p className="mt-3 flex items-start gap-2 text-xs text-red-400">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  )
}