import { StepType } from "@prisma/client"
import { cn } from "@/lib/utils"

const iconClass =
  "size-3.5 fill-none stroke-current [stroke-width:1.9] [stroke-linecap:round] [stroke-linejoin:round]"

function PhoneIcon() {
  return (
    <svg viewBox="0 0 24 24" className={iconClass} aria-hidden>
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  )
}

function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" className={iconClass} aria-hidden>
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-10 7L2 7" />
    </svg>
  )
}

function ReplyIcon() {
  return (
    <svg viewBox="0 0 24 24" className={iconClass} aria-hidden>
      <polyline points="9 17 4 12 9 7" />
      <path d="M20 18v-2a4 4 0 0 0-4-4H4" />
    </svg>
  )
}

const STYLES: Record<StepType, string> = {
  CALL: "bg-accent-soft text-primary",
  EMAIL: "bg-good-soft text-good",
  EMAIL_REPLY: "bg-secondary text-dim",
  LINKEDIN: "bg-accent-soft text-primary",
  MANUAL: "bg-secondary text-dim",
}

export function TypeIcon({ type }: { type: StepType }) {
  return (
    <span
      className={cn(
        "inline-flex size-[22px] shrink-0 items-center justify-center rounded",
        STYLES[type],
      )}
    >
      {type === StepType.CALL && <PhoneIcon />}
      {type === StepType.EMAIL && <MailIcon />}
      {type === StepType.EMAIL_REPLY && <ReplyIcon />}
      {type === StepType.LINKEDIN && (
        <span className="text-[10px] font-bold leading-none">in</span>
      )}
      {type === StepType.MANUAL && (
        <span className="text-[10px] font-bold leading-none">M</span>
      )}
    </span>
  )
}
