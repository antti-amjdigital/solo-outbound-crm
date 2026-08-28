import { cn } from "@/lib/utils"

export default function AppTemplate({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "flex min-h-0 min-w-0 flex-1 flex-col",
        "animate-in fade-in-0 duration-200 ease-out fill-mode-both motion-reduce:animate-none",
      )}
    >
      {children}
    </div>
  )
}
