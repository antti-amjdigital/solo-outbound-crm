import { cn } from "@/lib/utils"

export default function AppTemplate({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "flex min-h-0 min-w-0 flex-1 flex-col",
        // Remounts on every navigation, so keep the fade short: it sits on
        // top of the real load time of each tab switch.
        "animate-in fade-in-0 duration-100 ease-out fill-mode-both motion-reduce:animate-none",
      )}
    >
      {children}
    </div>
  )
}
