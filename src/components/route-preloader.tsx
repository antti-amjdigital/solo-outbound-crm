"use client"

import { PrefetchKind } from "next/dist/client/components/router-reducer/router-reducer-types"
import { useLayoutEffect } from "react"
import { usePathname, useRouter } from "next/navigation"

export function RoutePreloader({ hrefs }: { hrefs: readonly string[] }) {
  const router = useRouter()
  const pathname = usePathname()

  useLayoutEffect(() => {
    for (const href of hrefs) {
      if (href === pathname) continue
      router.prefetch(href, { kind: PrefetchKind.FULL })
    }
  }, [router, hrefs, pathname])

  return null
}
