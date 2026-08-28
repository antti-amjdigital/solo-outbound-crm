import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 py-24 text-center">
      <p className="text-xs font-medium tracking-wide text-dim uppercase">404</p>
      <h1 className="text-2xl font-bold tracking-tight">Page not found</h1>
      <p className="max-w-sm text-sm text-dim">
        That route doesn&apos;t exist. Head back to Today and keep working the queue.
      </p>
      <Button nativeButton={false} render={<Link href="/" />} className="mt-2">
        Back to Today
      </Button>
    </div>
  )
}
