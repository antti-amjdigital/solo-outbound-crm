import { NavRail } from "@/components/nav-rail"
import { RoutePreloader } from "@/components/route-preloader"
import { Toaster } from "@/components/ui/sonner"
import { getMainNavConfig } from "@/lib/nav-routes"

export const runtime = "nodejs"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { hrefs: navHrefs, sequenceHref } = await getMainNavConfig()

  return (
    <div className="flex h-dvh min-h-0 overflow-hidden">
      <NavRail sequenceHref={sequenceHref} />
      <RoutePreloader hrefs={navHrefs} />
      <main className="flex min-h-0 min-w-0 flex-1 flex-col">{children}</main>
      <Toaster />
    </div>
  )
}
