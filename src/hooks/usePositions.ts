import { useCallback } from 'react'
import type { NoteItem } from '../types'

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

  // ── Multi-note API ─────────────────────────────────────────────────────────

  const fetchNotes = useCallback(async (tableName: string): Promise<NoteItem[]> => {
    if (!schemaId) return []
    try {
      const res = await fetch(`/api/notes/${encodeURIComponent(schemaId)}/${encodeURIComponent(tableName)}`)
      if (!res.ok) return []
      return await res.json()
    } catch {
      return []
    }
  }, [schemaId])

  const saveNote = useCallback(async (tableName: string, note: NoteItem): Promise<void> => {
    if (!schemaId) return
    await fetch(`/api/notes/${encodeURIComponent(schemaId)}/${encodeURIComponent(tableName)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(note),
    })
  }, [schemaId])

  const deleteNote = useCallback(async (tableName: string, noteId: string): Promise<void> => {
    if (!schemaId) return
    await fetch(`/api/notes/${encodeURIComponent(schemaId)}/${encodeURIComponent(tableName)}/${encodeURIComponent(noteId)}`, {
      method: 'DELETE',
    })
  }, [schemaId])

  const fetchAllNotes = useCallback(async (): Promise<Record<string, NoteItem[]>> => {
    if (!schemaId) return {}
    try {
      const res = await fetch(`/api/notes/${encodeURIComponent(schemaId)}`)
      if (!res.ok) return {}
      return await res.json()
    } catch {
      return {}
    }
  }, [schemaId])

  return { fetchPositions, savePosition, deletePositions, fetchNotes, saveNote, deleteNote, fetchAllNotes }
}
