
import { useState, useEffect, useCallback } from 'react'
import { Zap, RefreshCw, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'
import { getCreditBalance, DEFAULT_API_KEY } from '../lib/stellar'

interface Props {
  publicKey: string
  refreshTrigger?: number
}

export default function CreditBalance({ publicKey, refreshTrigger }: Props) {
  const [credits, setCredits] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    try {
      const bal = await getCreditBalance(publicKey)
      setCredits(bal)
    } catch {
      setCredits(0)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [publicKey])

  useEffect(() => { load() }, [load])
  useEffect(() => { if (refreshTrigger && refreshTrigger > 0) load(true) }, [refreshTrigger, load])

  return (
    <div className="border border-white/10 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Zap className="w-3.5 h-3.5 text-white/30" />
          <span className="text-xs text-white/30 font-mono uppercase tracking-widest">Your Credits</span>
        </div>
        <button onClick={() => load(true)} disabled={refreshing} aria-label="Refresh balance"
          className="text-white/30 hover:text-white/60 transition-colors">
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-white/30">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-xs font-mono">Loading balance...</span>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-white/5 border border-white/8 rounded-lg p-3">
              <div className="text-xs text-white/30 font-mono uppercase tracking-widest mb-1">Credits</div>
              <div className="text-2xl font-semibold">{credits ?? 0}</div>
              <div className="text-xs text-white/30 mt-1">API calls remaining</div>
            </div>
            <div className="bg-white/5 border border-white/8 rounded-lg p-3">
              <div className="text-xs text-white/30 font-mono uppercase tracking-widest mb-1">API</div>
              <div className="text-sm font-mono font-medium">{DEFAULT_API_KEY}</div>
              <div className="text-xs text-white/30 mt-1">0.01 XLM / call</div>
            </div>
          </div>

          {credits === 0 ? (
            <div className="flex items-center gap-2 text-xs text-white/40 bg-white/5 rounded-lg px-3 py-2">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              No credits — purchase below to restore API access.
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-400/5 rounded-lg px-3 py-2">
              <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
              API access active — {credits} call{credits !== 1 ? 's' : ''} remaining.
            </div>
          )}
        </>
      )}
    </div>
  )
}