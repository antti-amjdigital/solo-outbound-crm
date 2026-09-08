"use server"

import { globalSearchQuery } from "@/lib/global-search-query"
import type { GlobalSearchResult } from "@/lib/global-search-query"

function fail(error: unknown): { ok: false; error: string } {
  return {
    ok: false,
    error: error instanceof Error ? error.message : "Something went wrong",
  }
}

export type GlobalSearchActionResult =
  | ({ ok: true } & GlobalSearchResult)
  | { ok: false; error: string }

export async function globalSearchAction(
  q: string,
): Promise<GlobalSearchActionResult> {
  try {
    const result = await globalSearchQuery(q)
    return { ok: true, ...result }
  } catch (error) {
    return fail(error)
  }
}
