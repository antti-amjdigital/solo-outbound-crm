"use client"

type Props = {
  label: string
}

export function GlobalSearchSection({ label }: Props) {
  return (
    <li role="presentation">
      <div className="px-4 pt-3 pb-1.5 text-[11px] font-bold tracking-[0.8px] text-[#94a3b8] uppercase">
        {label}
      </div>
    </li>
  )
}
