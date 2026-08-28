import { Skeleton } from "@/components/ui/skeleton"

export default function AppLoading() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-3.5 border-b border-border px-4 py-3">
        <Skeleton className="h-7 w-36" />
        <Skeleton className="mx-auto h-8 w-full max-w-md" />
      </div>
      <div className="flex gap-2 border-b border-border px-4 py-2.5">
        <Skeleton className="h-8 w-28" />
        <Skeleton className="ml-auto h-5 w-24" />
      </div>
      <div className="flex gap-2 border-b border-border px-4 py-2">
        <Skeleton className="h-7 w-16" />
        <Skeleton className="h-7 w-16" />
        <Skeleton className="h-7 w-16" />
      </div>
      <div className="space-y-2 p-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    </div>
  )
}
