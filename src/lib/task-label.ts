/** Task.label stores "name" or "name\\nnotes" (see createTaskAction). */
export function splitTaskLabel(label?: string | null): {
  name?: string
  notes?: string
} {
  if (!label?.trim()) return {}
  const nl = label.indexOf("\n")
  if (nl < 0) return { name: label.trim() }
  const name = label.slice(0, nl).trim()
  const notes = label.slice(nl + 1).trim()
  return { name: name || undefined, notes: notes || undefined }
}

export function taskDisplayName(label: string): string {
  return splitTaskLabel(label).name ?? label
}
