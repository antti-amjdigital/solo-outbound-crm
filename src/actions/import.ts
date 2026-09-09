"use server"

import { ActivityType, ProspectStatus } from "@prisma/client"
import { db } from "@/lib/db"
import type { ImportRow } from "@/lib/csv-import"
import { revalidateProspects } from "@/lib/revalidate"
import type { ActionResult } from "@/actions/prospects"

export async function importProspectsAction(
  rows: ImportRow[],
): Promise<ActionResult & { count?: number }> {
  try {
    if (!rows.length) return { ok: false, error: "Nothing to import" }
    // Two statements total (bulk INSERT … RETURNING, then bulk activity insert)
    // instead of one INSERT per row.
    const created = await db.$transaction(async (tx) => {
      const prospects = await tx.prospect.createManyAndReturn({
        data: rows.map((r) => ({
          firstName: r.firstName,
          lastName: r.lastName || null,
          company: r.company || null,
          title: r.title || null,
          email: r.email || null,
          phone: r.phone || null,
          linkedin: r.linkedin || null,
          source: r.source || "csv-import",
          timezone: r.timezone || null,
          status: ProspectStatus.NEW,
        })),
        select: { id: true, source: true },
      })
      await tx.activity.createMany({
        data: prospects.map((p) => ({
          prospectId: p.id,
          type: ActivityType.STATUS_CHANGE,
          note: `CSV import “${p.source ?? "csv-import"}”`,
        })),
      })
      return prospects
    })
    revalidateProspects()
    return { ok: true, count: created.length }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Import failed",
    }
  }
}

export async function getExistingContactKeysAction(): Promise<{ keys: string[] }> {
  const prospects = await db.prospect.findMany({
    select: { email: true, phone: true },
  })
  const keys: string[] = []
  for (const p of prospects) {
    if (p.email) keys.push(`e:${p.email.trim().toLowerCase()}`)
    if (p.phone) keys.push(`p:${p.phone.replace(/[^\d+]/g, "")}`)
  }
  return { keys }
}
