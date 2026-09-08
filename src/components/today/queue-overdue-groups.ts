import { overdueDays } from "@/lib/queue-filters"
import type { TodayQueueItem } from "@/lib/queries"

function overdueGroupLabel(days: number): string {
  if (days === 1) return "1 day overdue"
  if (days <= 3) return "2–3 days overdue"
  if (days <= 7) return "4–7 days overdue"
  return "8+ days overdue"
}

export function groupOverdue(
  items: TodayQueueItem[],
): { label: string; items: TodayQueueItem[] }[] {
  const order = [
    "1 day overdue",
    "2–3 days overdue",
    "4–7 days overdue",
    "8+ days overdue",
  ]
  const buckets = new Map<string, TodayQueueItem[]>()
  for (const item of items) {
    const label = overdueGroupLabel(overdueDays(item.dueDate))
    const list = buckets.get(label) ?? []
    list.push(item)
    buckets.set(label, list)
  }
  return order
    .filter((label) => buckets.has(label))
    .map((label) => ({ label, items: buckets.get(label)! }))
}
