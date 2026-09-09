"use client"

import { PrefetchKind } from "next/dist/client/components/router-reducer/router-reducer-types"
import { useRouter } from "next/navigation"
import { useCallback, useRef } from "react"

/**
 * Fully prefetch a dynamic route the moment the user shows intent
 * (hover / focus), so the click that follows lands on warm data.
 * Prefetches at most once per href per component instance.
 */
export function useIntentPrefetch(href: string) {
  const router = useRouter()
  const done = useRef<string | null>(null)

  return useCallback(() => {
    if (done.current === href) return
    done.current = href
    router.prefetch(href, { kind: PrefetchKind.FULL })
  }, [router, href])
}
