"use client"

import { usePathname } from "next/navigation"
import { NavRailItem } from "@/components/nav-rail-item"
import { cn } from "@/lib/utils"

const iconClass =
  "size-5 fill-none stroke-current [stroke-width:1.7] [stroke-linecap:round] [stroke-linejoin:round]"

function IconToday({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn(iconClass, className)} aria-hidden>
      <path d="M3 6.5 4.6 8 7.5 5" />
      <path d="M3 13.5 4.6 15 7.5 12" />
      <path d="M3 20.5 4.6 22 7.5 19" />
      <line x1="11" y1="6" x2="21" y2="6" />
      <line x1="11" y1="13" x2="21" y2="13" />
      <line x1="11" y1="20" x2="21" y2="20" />
    </svg>
  )
}

function IconPeople({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn(iconClass, className)} aria-hidden>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

function IconSeq({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn(iconClass, className)} aria-hidden>
      <circle cx="6" cy="5" r="2.5" />
      <circle cx="6" cy="19" r="2.5" />
      <circle cx="18" cy="12" r="2.5" />
      <path d="M6 7.5v9" />
      <path d="M8.5 5H13a2.5 2.5 0 0 1 2.5 2.5v2" />
      <path d="M8.5 19H13a2.5 2.5 0 0 0 2.5-2.5v-2" />
    </svg>
  )
}

function IconStats({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn(iconClass, className)} aria-hidden>
      <line x1="4" y1="21" x2="4" y2="13" />
      <line x1="10" y1="21" x2="10" y2="4" />
      <line x1="16" y1="21" x2="16" y2="9" />
      <line x1="21" y1="21" x2="21" y2="16" />
    </svg>
  )
}

function IconGear({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn(iconClass, className)} aria-hidden>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" />
    </svg>
  )
}

function buildNavItems(sequenceHref: string) {
  return [
    { href: "/", label: "Tasks", icon: IconToday, match: (p: string) => p === "/" },
    {
      href: "/prospects",
      label: "Prospects",
      icon: IconPeople,
      match: (p: string) => p.startsWith("/prospects"),
    },
    {
      href: sequenceHref,
      label: "Sequences",
      icon: IconSeq,
      match: (p: string) => p.startsWith("/sequences"),
    },
    {
      href: "/stats",
      label: "Stats",
      icon: IconStats,
      match: (p: string) => p.startsWith("/stats"),
    },
  ] as const
}

export function NavRail({ sequenceHref }: { sequenceHref: string }) {
  const pathname = usePathname()
  const navItems = buildNavItems(sequenceHref)

  return (
    <nav
      className="flex w-[60px] shrink-0 flex-col items-center gap-1 bg-rail px-0 pt-3.5 pb-3"
      aria-label="Main"
    >
      <div className="mb-4 select-none text-xs font-bold tracking-[0.16em] text-white">
        CRM
      </div>

      {navItems.map(({ href, label, icon: Icon, match }) => (
        <NavRailItem key={href} href={href} label={label} active={match(pathname)}>
          <Icon />
        </NavRailItem>
      ))}

      <div className="flex-1" />

      <NavRailItem label="Settings" active={false}>
        <IconGear />
      </NavRailItem>
    </nav>
  )
}
