import { useState, useCallback } from 'react'
import { Parser } from '@dbml/core'
import type { ParsedSchema, ParsedTable, ParsedRef } from '../types'

function mapRelation(r0: string, r1: string): ParsedRef['relation'] {
  if (r0 === '1' && r1 === '1') return '1-1'
  if (r0 === '*' && r1 === '*') return 'N-N'
  if (r0 === '1' && r1 === '*') return '1-N'
  if (r0 === '*' && r1 === '1') return 'N-1'
  if (r0 === '-' || r1 === '-') return '1-1'
  return '1-N'
}

const GROUP_PALETTE = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
  '#8b5cf6', '#ec4899', '#14b8a6', '#f97316',
]

function groupColor(name: string, index: number): string {
  // Use index-based color from palette, cycling through
  return GROUP_PALETTE[index % GROUP_PALETTE.length]
}

export function useDbmlParser() {
  const [schema, setSchema] = useState<ParsedSchema | null>(null)
  const [error, setError] = useState<string | null>(null)

  const parse = useCallback((dbmlString: string): ParsedSchema | null => {
    try {
      // Extract [color: #hex] from TableGroup declarations before stripping them
      const groupColorFromDbml: Record<string, string> = {}
      const colorRe = /TableGroup\s+"([^"]*)"\s*\[(?:[^\]]*?\s)?color:\s*(#[0-9a-fA-F]{3,8})/g
      let cm: RegExpExecArray | null
      while ((cm = colorRe.exec(dbmlString)) !== null) {
        groupColorFromDbml[cm[1]] = cm[2]
      }

      // Strip unsupported [color: ...] annotations from TableGroup lines
      // e.g. TableGroup "Name" [color: #xxx] { → TableGroup "Name" {
      const sanitized = dbmlString.replace(
        /(TableGroup\s+(?:"[^"]*"|'[^']*'|\S+))\s*\[[^\]]*\]/g,
        '$1'
      )
      const database = new Parser().parse(sanitized, 'dbml')
      const s = database.schemas[0]

      const groupColors: Record<string, string> = {}
      s.tableGroups?.forEach((g: any, i: number) => {
        // Use color from DBML annotation if present, otherwise fall back to palette index
        groupColors[g.name] = groupColorFromDbml[g.name] ?? groupColor(g.name, i)
      })

      const tables: ParsedTable[] = s.tables.map((table: any) => {
        const groupName = table.group?.name ?? null
        const groupColor = groupName ? (groupColors[groupName] ?? null) : null
        return {
          name: table.name,
          group: groupName,
          groupColor,
          columns: table.fields.map((field: any) => ({
            name: field.name,
            type: field.type?.type_name ?? String(field.type),
            pk: !!field.pk,
            nullable: !field.not_null,
            note: field.note ?? undefined,
          })),
        }
      })

      const refs: ParsedRef[] = []
      s.refs?.forEach((ref: any) => {
        const [ep0, ep1] = ref.endpoints
        if (!ep0 || !ep1) return
        refs.push({
          fromTable: ep0.tableName ?? ep0.schemaName,
          fromColumn: ep0.fieldNames?.[0] ?? ep0.fields?.[0]?.name ?? '',
          toTable: ep1.tableName ?? ep1.schemaName,
          toColumn: ep1.fieldNames?.[0] ?? ep1.fields?.[0]?.name ?? '',
          relation: mapRelation(ep0.relation, ep1.relation),
        })
      })

      const result: ParsedSchema = { tables, refs }
      setSchema(result)
      setError(null)
      return result
    } catch (e: any) {
      let msg: string
      if (e?.diags && Array.isArray(e.diags)) {
        msg = e.diags.map((d: any) => {
          const loc = d.location ? ` (linha ${d.location.start.line}, col ${d.location.start.column})` : ''
          return `${d.message ?? d.name ?? 'Erro desconhecido'}${loc}`
        }).join('\n')
      } else {
        msg = e?.message ?? String(e)
      }
      setError(msg)
      return null
    }
  }, [])

  const reset = useCallback(() => {
    setSchema(null)
    setError(null)
  }, [])

  return { schema, error, parse, reset }
}
