import { TDExport } from '@tlslides/tldraw'

// NEXT_PUBLIC_EXPORT_ENDPOINT lets deployments point exports at a different host (e.g. a
// dedicated export service). If unset, we fall back to a same-origin relative path, which works
// correctly in both development and production without ever pointing at tldraw.com.
export const EXPORT_ENDPOINT = process.env.NEXT_PUBLIC_EXPORT_ENDPOINT ?? '/api/export'

export async function exportToImage(info: TDExport) {
  if (info.serialized) {
    const link = document.createElement('a')
    link.href = 'data:text/plain;charset=utf-8,' + encodeURIComponent(info.serialized)
    link.download = info.name + '.' + info.type
    link.click()

    return
  }

  const response = await fetch(EXPORT_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(info),
  })
  const blob = await response.blob()
  const blobUrl = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = blobUrl
  link.download = info.name + '.' + info.type
  link.click()
}
