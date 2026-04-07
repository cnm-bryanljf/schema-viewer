import { useCallback } from 'react'

export function usePositions(schemaId: string | null) {
  const fetchPositions = useCallback(async (): Promise<Record<string, { x: number; y: number }>> => {
    if (!schemaId) return {}
    try {
      const res = await fetch(`/api/positions/${encodeURIComponent(schemaId)}`)
      if (!res.ok) return {}
      const data: { table_name: string; x: number; y: number }[] = await res.json()
      return Object.fromEntries(data.map(r => [r.table_name, { x: r.x, y: r.y }]))
    } catch {
      return {}
    }
  }, [schemaId])

  const savePosition = useCallback(async (tableName: string, x: number, y: number) => {
    if (!schemaId) return
    await fetch(`/api/positions/${encodeURIComponent(schemaId)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ table_name: tableName, x, y }),
    })
  }, [schemaId])

  const deletePositions = useCallback(async () => {
    if (!schemaId) return
    await fetch(`/api/positions/${encodeURIComponent(schemaId)}`, { method: 'DELETE' })
  }, [schemaId])

  const fetchNote = useCallback(async (tableName: string): Promise<string> => {
    if (!schemaId) return ''
    try {
      const res = await fetch(`/api/notes/${encodeURIComponent(schemaId)}/${encodeURIComponent(tableName)}`)
      if (!res.ok) return ''
      const data = await res.json()
      return data.note ?? ''
    } catch {
      return ''
    }
  }, [schemaId])

  const saveNote = useCallback(async (tableName: string, note: string) => {
    if (!schemaId) return
    await fetch(`/api/notes/${encodeURIComponent(schemaId)}/${encodeURIComponent(tableName)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ note }),
    })
  }, [schemaId])

  return { fetchPositions, savePosition, deletePositions, fetchNote, saveNote }
}
