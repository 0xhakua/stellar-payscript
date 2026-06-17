
import { useState } from 'react'
import { Code2, Loader2, CheckCircle2, AlertCircle, ExternalLink, Zap } from 'lucide-react'
import { purchaseCredits, xlmToStroops, DEFAULT_API_KEY, explorerTxUrl } from '../lib/stellar'

type TxStatus = 'idle' | 'pending' | 'success' | 'error'

interface Props {
  publicKey: string
  onSuccess?: () => void
}

const PRICE_PER_CALL_XLM = 0.01
const QUICK_AMOUNTS = ['0.1', '0.5', '1.0']

export default function PurchaseForm({ publicKey, onSuccess }: Props) {
  const [xlmAmount, setXlmAmount] = useState('0.1')
  const [txStatus, setTxStatus] = useState<TxStatus>('idle')
  const [txHash, setTxHash] = useState<string | null>(null)
  const [txError, setTxError] = useState<string | null>(null)

  const parsed = parseFloat(xlmAmount || '0')
  const isValidAmount = !isNaN(parsed) && parsed >= PRICE_PER_CALL_XLM
  const estimatedCredits = isValidAmount
    ? Math.floor(xlmToStroops(parsed) / xlmToStroops(PRICE_PER_CALL_XLM))
    : 0

  const handlePurchase = async () => {
    if (!isValidAmount) return
    setTxStatus('pending')
    setTxError(null)
    setTxHash(null)

    const result = await purchaseCredits(publicKey, parsed)

    if (result.success && result.txHash) {
      setTxHash(result.txHash)
      setTxStatus('success')
      onSuccess?.()
    } else {
      setTxError(result.error || 'Transaction failed')
      setTxStatus('error')
    }
  }

  const reset = () => { setTxStatus('idle'); setTxError(null); setTxHash(null) }

  return (
    <div className="border border-white/10 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-5">
        <Code2 className="w-3.5 h-3.5 text-white/30" />
        <span className="text-xs text-white/30 font-mono uppercase tracking-widest">Purchase Credits</span>
      </div>

      <div className="flex items-center justify-between mb-5 px-3 py-2.5 bg-white/5 rounded-lg border border-white/10">
        <div>
          <div className="text-xs text-white/30 mb-0.5">API</div>
          <div className="font-mono text-sm">{DEFAULT_API_KEY}</div>
        </div>
        <span className="text-xs font-mono px-2 py-0.5 rounded border border-white/10 text-white/50">0.01 XLM / call</span>
      </div>

      <div className="mb-4">
        <label className="block text-xs text-white/30 font-mono mb-2">Amount (XLM)</label>
        <div className="relative">
          <input
            type="number"
            value={xlmAmount}
            onChange={e => setXlmAmount(e.target.value)}
            min={PRICE_PER_CALL_XLM}
            step="0.01"
            placeholder="0.10"
            disabled={txStatus === 'pending'}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white font-mono text-sm focus:border-white/30 focus:outline-none transition-colors placeholder:text-white/20 disabled:opacity-40"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-white/30">XLM</span>
        </div>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-xs font-mono text-white/30">
            {isValidAmount ? `≈ ${estimatedCredits} credit${estimatedCredits !== 1 ? 's' : ''}` : `min. ${PRICE_PER_CALL_XLM} XLM`}
          </span>
          <div className="flex gap-1.5">
            {QUICK_AMOUNTS.map(v => (
              <button key={v} onClick={() => setXlmAmount(v)} disabled={txStatus === 'pending'}
                className="text-xs font-mono px-2 py-0.5 rounded border border-white/10 text-white/40 hover:text-white hover:border-white/30 transition-colors disabled:opacity-30">
                {v}
              </button>
            ))}
          </div>
        </div>
      </div>

      <button
        onClick={handlePurchase}
        disabled={!isValidAmount || txStatus === 'pending'}
        className="w-full flex items-center justify-center gap-2 bg-white text-black text-sm font-medium py-3 rounded-lg hover:bg-white/90 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {txStatus === 'pending'
          ? <><Loader2 className="w-4 h-4 animate-spin" /> Waiting for Freighter...</>
          : <><Zap className="w-4 h-4" /> Buy {estimatedCredits} Credit{estimatedCredits !== 1 ? 's' : ''}</>
        }
      </button>

      {txStatus === 'success' && txHash && (
        <div className="mt-4 p-3 bg-emerald-400/5 border border-emerald-400/20 rounded-lg">
          <div className="flex items-center gap-2 text-emerald-400 text-xs mb-2 font-medium">
            <CheckCircle2 className="w-4 h-4" /> Credits added successfully
          </div>
          <a href={explorerTxUrl(txHash)} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-white/40 hover:text-white/70 font-mono transition-colors">
            <ExternalLink className="w-3 h-3" />
            {txHash.slice(0, 10)}...{txHash.slice(-8)}
          </a>
          <button onClick={reset} className="mt-2 text-xs text-white/30 hover:text-white/50 font-mono transition-colors">Buy more →</button>
        </div>
      )}

      {txStatus === 'error' && txError && (
        <div className="mt-4 p-3 bg-red-400/5 border border-red-400/20 rounded-lg">
          <div className="flex items-start gap-2 text-red-400 text-xs">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{txError}</span>
          </div>
          <button onClick={reset} className="mt-2 text-xs text-white/30 hover:text-white/50 font-mono transition-colors">Try again →</button>
        </div>
      )}
    </div>
  )
}