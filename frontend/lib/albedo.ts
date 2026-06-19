// lib/albedo.ts — Albedo wallet integration using albedo-link npm package approach
// Albedo intent URL updated to current format

const ALBEDO_URL = 'https://albedo.link'

export async function albedoConnect(): Promise<string> {
  return new Promise((resolve, reject) => {
    const width = 600
    const height = 600
    const left = window.screenX + (window.outerWidth - width) / 2
    const top = window.screenY + (window.outerHeight - height) / 2

    const params = new URLSearchParams({
      albedo_intent_version: '0',
      intent: 'public_key',
      origin_hint: window.location.origin,
    })

    const popup = window.open(
      `${ALBEDO_URL}/#/?${params.toString()}`,
      'albedo',
      `width=${width},height=${height},left=${left},top=${top},resizable,scrollbars`
    )

    if (!popup) {
      reject(new Error('Popup blocked — allow popups for this site'))
      return
    }

    const handleMessage = (event: MessageEvent) => {
      if (!event.origin.includes('albedo.link')) return
      if (event.data?.pubkey) {
        window.removeEventListener('message', handleMessage)
        popup.close()
        resolve(event.data.pubkey)
      } else if (event.data?.error) {
        window.removeEventListener('message', handleMessage)
        popup.close()
        reject(new Error(event.data.error))
      }
    }

    window.addEventListener('message', handleMessage)

    setTimeout(() => {
      window.removeEventListener('message', handleMessage)
      if (!popup.closed) popup.close()
      reject(new Error('Albedo connection timed out'))
    }, 60000)
  })
}

export async function albedoSignTransaction(
  xdr: string,
  networkPassphrase: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    const width = 600
    const height = 600
    const left = window.screenX + (window.outerWidth - width) / 2
    const top = window.screenY + (window.outerHeight - height) / 2

    const params = new URLSearchParams({
      albedo_intent_version: '0',
      intent: 'tx',
      xdr,
      network: networkPassphrase.includes('Test') ? 'testnet' : 'public',
      origin_hint: window.location.origin,
    })

    const popup = window.open(
      `${ALBEDO_URL}/#/?${params.toString()}`,
      'albedo',
      `width=${width},height=${height},left=${left},top=${top},resizable,scrollbars`
    )

    if (!popup) {
      reject(new Error('Popup blocked — allow popups for this site'))
      return
    }

    const handleMessage = (event: MessageEvent) => {
      if (!event.origin.includes('albedo.link')) return
      if (event.data?.signed_envelope_xdr) {
        window.removeEventListener('message', handleMessage)
        popup.close()
        resolve(event.data.signed_envelope_xdr)
      } else if (event.data?.error) {
        window.removeEventListener('message', handleMessage)
        popup.close()
        reject(new Error(event.data.error))
      }
    }

    window.addEventListener('message', handleMessage)

    setTimeout(() => {
      window.removeEventListener('message', handleMessage)
      if (!popup.closed) popup.close()
      reject(new Error('Albedo signing timed out'))
    }, 60000)
  })
}