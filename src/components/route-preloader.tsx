"use client"

import { PrefetchKind } from "next/dist/client/components/router-reducer/router-reducer-types"
import { useLayoutEffect } from "react"
import { usePathname, useRouter } from "next/navigation"

/**
 * Keeps the main tabs fully prefetched so switching between them is instant.
 * Every server action calls revalidatePath, which drops the prefetched data;
 * `onInvalidate` lets us re-warm the route as soon as that happens instead
 * of paying a cold server round trip on the next click.
 */
export function RoutePreloader({ hrefs }: { hrefs: readonly string[] }) {
  const router = useRouter()
  const pathname = usePathname()

  useLayoutEffect(() => {
    let cancelled = false

    const warm = (href: string) => {
      if (cancelled) return
      router.prefetch(href, {
        kind: PrefetchKind.FULL,
        onInvalidate: () => warm(href),
      })
    }

    for (const href of hrefs) {
      if (href === pathname) continue
      warm(href)
    }

    return () => {
      cancelled = true
    }
  }, [router, hrefs, pathname])

  return null
}
