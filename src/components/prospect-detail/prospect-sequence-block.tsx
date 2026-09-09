"use client"

import { useRouter } from "next/navigation"
import { useTransition } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  pauseEnrollmentAction,
  resumeEnrollmentAction,
  stopEnrollmentAction,
} from "@/actions/enrollments"
import { formatRelativeDue } from "@/lib/prospect-queries"
import type { ProspectDetail } from "@/lib/prospect-detail-query"
import { taskDisplayName } from "@/lib/task-label"

export function ProspectSequenceBlock({ data }: { data: ProspectDetail }) {
  const { enrollment, openTask } = data
  const router = useRouter()
  const [pending, start] = useTransition()

  if (!enrollment) {
    return <p className="text-sm text-dim">Not enrolled in a sequence.</p>
  }

  function run(
    fn: () => Promise<{ ok: boolean; error?: string }>,
    okMsg: string,
  ) {
    start(async () => {
      const res = await fn()
      if (!res.ok) toast.error(res.error)
      else {
        toast.success(okMsg)
        router.refresh()
      }
    })
  }

  return (
    <>
      <div className="text-sm font-semibold">{enrollment.sequenceName}</div>
      <p className="mt-0.5 text-xs leading-relaxed text-dim">
        Step {enrollment.currentStepOrder || "—"} of {enrollment.stepTotal}
        {enrollment.state !== "RUNNING" && ` · ${enrollment.state}`}
        {openTask && (
          <>
            {" "}
            · next: {taskDisplayName(openTask.label)},{" "}
            {formatRelativeDue(openTask.dueDate).toLowerCase()}
          </>
        )}
      </p>
      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {enrollment.state === "RUNNING" && (
          <Button
            size="xs"
            variant="outline"
            disabled={pending}
            onClick={() =>
              run(() => pauseEnrollmentAction(enrollment.id), "Paused")
            }
          >
            Pause
          </Button>
        )}
        {enrollment.state === "PAUSED" && (
          <Button
            size="xs"
            variant="outline"
            disabled={pending}
            onClick={() =>
              run(() => resumeEnrollmentAction(enrollment.id), "Resumed")
            }
          >
            Resume
          </Button>
        )}
        {enrollment.state !== "FINISHED" && (
          <Button
            size="xs"
            variant="outline"
            disabled={pending}
            onClick={() =>
              run(() => stopEnrollmentAction(enrollment.id), "Stopped")
            }
          >
            Stop
          </Button>
        )}
      </div>
    </>
  )
}
