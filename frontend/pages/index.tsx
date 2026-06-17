// index.tsx
import Head from 'next/head'
import { useState } from 'react'
import { Zap, ExternalLink } from 'lucide-react'
import { useFreighter } from '../hooks/useFreighter'
import WalletConnect from '../components/WalletConnect'
import CreditBalance from '../components/CreditBalance'
import PurchaseForm from '../components/PurchaseForm'
import { CONTRACT_ID, explorerContractUrl } from '../lib/stellar'

export default function Home() {
  const freighter = useFreighter()
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  return (
    <>
      <Head>
        <title>PayScript — Micropayment Paywalls on Stellar</title>
        <meta name="description" content="Monetize any API with per-call micropayments on Stellar Soroban." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <main className="min-h-screen bg-[#0a0a0a] text-white">

        {/* Nav */}
        <nav className="border-b border-white/10 px-4 py-4">
          <div className="max-w-xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-white" />
              <span className="font-mono text-sm font-medium">PayScript</span>
              <span className="text-xs font-mono px-2 py-0.5 rounded border border-white/10 text-white/40">Testnet</span>
            </div>
            
              href={explorerContractUrl(CONTRACT_ID)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-white/30 hover:text-white/60 transition-colors font-mono"
            >
              Contract <ExternalLink className="w-3 h-3 ml-1" />
            </a>
          </div>
        </nav>

        {/* Main */}
        <div className="max-w-xl mx-auto px-4 pt-10 pb-10">

          {/* Hero */}
          <div className="mb-8">
            <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight leading-tight mb-3">
              Monetize any API.<br />
              <span className="text-white/40">No Stripe. No borders.</span>
            </h1>
            <p className="text-sm text-white/50 leading-relaxed max-w-md">
              Pay per call using XLM. Credits stored on Stellar Soroban.
              Built for developers in Southeast Asia — and everywhere else.
            </p>
            <div className="flex flex-wrap gap-2 mt-4">
              {['x402 protocol', 'Soroban', 'Stellar Testnet'].map(b => (
                <span key={b} className="text-xs font-mono px-2 py-0.5 rounded border border-white/10 text-white/40">{b}</span>
              ))}
            </div>
          </div>

          {/* Components */}
          <div className="space-y-4">
            <WalletConnect
              walletState={freighter.walletState}
              publicKey={freighter.publicKey}
              error={freighter.error}
              connect={freighter.connect}
              disconnect={freighter.disconnect}
            />

            {freighter.isConnected && freighter.publicKey && (
              <>
                <CreditBalance
                  publicKey={freighter.publicKey}
                  refreshTrigger={refreshTrigger}
                />
                <PurchaseForm
                  publicKey={freighter.publicKey}
                  onSuccess={() => setRefreshTrigger(n => n + 1)}
                />
              </>
            )}

            {!freighter.isConnected && (
              <div className="border border-white/10 rounded-xl p-5">
                <div className="text-xs text-white/30 font-mono uppercase tracking-widest mb-4">How it works</div>
                <div className="space-y-4">
                  {[
                    { n: '1', title: 'Connect wallet', desc: 'Freighter signs transactions — no seed phrase shared' },
                    { n: '2', title: 'Buy credits', desc: 'Pay XLM → credits stored on Stellar Soroban trustlessly' },
                    { n: '3', title: 'Access API', desc: 'Each call deducts 1 credit, verified on-chain in ~3s' },
                  ].map(step => (
                    <div key={step.n} className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded border border-white/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs font-mono text-white/40">{step.n}</span>
                      </div>
                      <div>
                        <div className="text-sm font-medium">{step.title}</div>
                        <div className="text-xs text-white/40 mt-0.5">{step.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-white/10 mt-8 pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-white/20 font-mono">
            <a href={explorerContractUrl(CONTRACT_ID)} target="_blank" rel="noopener noreferrer"
              className="hover:text-white/50 transition-colors underline underline-offset-2">
              {CONTRACT_ID.slice(0, 8)}...{CONTRACT_ID.slice(-6)}
            </a>
            <span>MIT License</span>
          </div>
        </div>
      </main>
    </>
  )
}
