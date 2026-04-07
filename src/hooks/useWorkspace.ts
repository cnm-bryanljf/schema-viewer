import { useCallback } from 'react'
import type { Workspace } from '../types'

export function useWorkspace() {
  const listWorkspaces = useCallback(async (): Promise<{ id: string; name: string; saved_at: string }[]> => {
    try {
      const res = await fetch('/api/workspaces')
      if (!res.ok) return []
      return res.json()
    } catch { return [] }
  }, [])

  const loadWorkspace = useCallback(async (id: string): Promise<Workspace | null> => {
    try {
      const res = await fetch(`/api/workspaces/${encodeURIComponent(id)}`)
      if (!res.ok) return null
      const row = await res.json()
      return row.data as Workspace
    } catch { return null }
  }, [])

  const saveWorkspace = useCallback(async (workspace: Workspace): Promise<string | null> => {
    try {
      const res = await fetch('/api/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: workspace.id, name: workspace.name, data: workspace }),
      })
      if (!res.ok) return null
      const { savedAt } = await res.json()
      return savedAt
    } catch { return null }
  }, [])

  const deleteWorkspace = useCallback(async (id: string) => {
    await fetch(`/api/workspaces/${encodeURIComponent(id)}`, { method: 'DELETE' })
  }, [])

  const getLastWorkspaceId = useCallback(async (): Promise<string | null> => {
    try {
      const res = await fetch('/api/settings/last-workspace')
      if (!res.ok) return null
      const { lastWorkspace } = await res.json()
      return lastWorkspace
    } catch { return null }
  }, [])

  return { listWorkspaces, loadWorkspace, saveWorkspace, deleteWorkspace, getLastWorkspaceId }
}
