"use client"

import { useRouter } from "next/navigation"
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  useTransition,
  type FormEvent,
  type KeyboardEvent,
} from "react"
import { Calendar, ChevronDown, FileText, Flag, User, X } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Calendar as CalendarPicker } from "@/components/ui/calendar"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Textarea } from "@/components/ui/textarea"
import {
  TooltipProvider,
} from "@/components/ui/tooltip"
import {
  AddTaskFieldRow,
  GUTTER_ICON,
} from "@/components/prospect-detail/add-task-field-row"
import {
  AddTaskProspectPicker,
} from "@/components/prospect-detail/add-task-prospect-picker"
import { createTaskAction } from "@/actions/tasks"
import type { TaskProspectOption } from "@/actions/prospects"
import {
  appToday,
  formatCalendarDate,
  toCalendarDate,
} from "@/lib/dates"
import { cn } from "@/lib/utils"

type TaskKind = "call" | "email" | "task"
type Priority = "none" | "low" | "high"

const TYPE_DEFAULT: Record<TaskKind, string> = {
  call: "Call",
  email: "Email",
  task: "To-do",
}

const CONTROL =
  "rounded-[10px] border border-[#e2e8f0] bg-white text-[#0f172a] outline-none focus-visible:border-[#4f46e5] focus-visible:ring-[3px] focus-visible:ring-[rgba(79,70,229,0.12)]"

const NAME_FOCUS =
  "focus-visible:border-[1.5px] focus-visible:border-[#4f46e5] focus-visible:ring-[3px] focus-visible:ring-[rgba(79,70,229,0.12)]"

const iconClass = "size-3.5 shrink-0 stroke-current [stroke-width:2]"

function PhoneIcon() {
  return (
    <svg viewBox="0 0 24 24" className={iconClass} aria-hidden>
      <path
        d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"
        fill="none"
      />
    </svg>
  )
}

function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" className={iconClass} aria-hidden>
      <rect x="2" y="4" width="20" height="16" rx="2" fill="none" />
      <path d="m22 7-10 7L2 7" fill="none" />
    </svg>
  )
}

function TodoIcon() {
  return (
    <svg viewBox="0 0 24 24" className={iconClass} aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="2" fill="none" />
      <path d="m9 12 2 2 4-4" fill="none" />
    </svg>
  )
}

const SEGMENTS: {
  id: TaskKind
  label: string
  Icon: () => React.JSX.Element
}[] = [
  { id: "call", label: "Call", Icon: PhoneIcon },
  { id: "email", label: "Email", Icon: MailIcon },
  { id: "task", label: "To-do", Icon: TodoIcon },
]

function formatDisplayDate(d: Date): string {
  const day = String(d.getUTCDate()).padStart(2, "0")
  const month = String(d.getUTCMonth() + 1).padStart(2, "0")
  return `${day}.${month}.${d.getUTCFullYear()}`
}

const PRIORITY_META: Record<
  Priority,
  { label: string; dot: string; flag: string }
> = {
  none: { label: "None", dot: "bg-[#94a3b8]", flag: "text-[#64748b]" },
  low: { label: "Low", dot: "bg-[#3b82f6]", flag: "text-[#3b82f6]" },
  high: { label: "High", dot: "bg-[#ef4444]", flag: "text-[#ef4444]" },
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialProspect?: TaskProspectOption | null
}

export function AddTaskDialog({ open, onOpenChange, initialProspect }: Props) {
  const router = useRouter()
  const titleId = useId()
  const nameRef = useRef<HTMLInputElement>(null)
  const [pending, start] = useTransition()
  const [kind, setKind] = useState<TaskKind>("call")
  const [nameTouched, setNameTouched] = useState(false)
  const [name, setName] = useState("")
  const [dueDate, setDueDate] = useState<Date>(() => appToday())
  const [dueTime, setDueTime] = useState("")
  const [priority, setPriority] = useState<Priority>("none")
  const [notes, setNotes] = useState("")
  const [prospect, setProspect] = useState<TaskProspectOption | null>(null)
  const [dateOpen, setDateOpen] = useState(false)

  const reset = useCallback(() => {
    setKind("call")
    setNameTouched(false)
    setName("")
    setDueDate(appToday())
    setDueTime("")
    setPriority("none")
    setNotes("")
    setProspect(initialProspect ?? null)
  }, [initialProspect])

  useEffect(() => {
    if (open) {
      reset()
      requestAnimationFrame(() => {
        const el = nameRef.current
        if (!el) return
        el.focus()
        el.setSelectionRange(0, 0)
      })
    }
  }, [open, reset])

  const defaultName = TYPE_DEFAULT[kind]
  const displayName = nameTouched ? name : defaultName

  function onNameKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (nameTouched) return
    if (e.key === "Backspace" || e.key === "Delete") {
      e.preventDefault()
      setNameTouched(true)
      setName("")
      return
    }
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault()
      setNameTouched(true)
      setName(e.key)
    }
  }

  function onNamePaste(text: string) {
    if (!nameTouched) {
      setNameTouched(true)
      setName(text)
    }
  }

  function save(e?: FormEvent) {
    e?.preventDefault()
    if (!prospect) return
    const resolvedName = nameTouched ? name.trim() : defaultName
    start(async () => {
      const res = await createTaskAction({
        prospectId: prospect.id,
        type: kind,
        dueDate: formatCalendarDate(toCalendarDate(dueDate)),
        name: resolvedName || defaultName,
        notes: notes.trim() || undefined,
      })
      if (!res.ok) toast.error(res.error)
      else {
        toast.success("Task added")
        onOpenChange(false)
        router.refresh()
      }
    })
  }

  return (
    <TooltipProvider>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          showCloseButton={false}
          overlayClassName="bg-[rgba(15,23,42,0.38)] supports-backdrop-filter:backdrop-blur-none"
          className={cn(
            "max-w-[520px] gap-0 overflow-hidden rounded-2xl border-0 bg-white p-0",
            "shadow-[0_24px_64px_rgba(15,23,42,0.28)] ring-0",
          )}
          aria-labelledby={titleId}
          role="dialog"
        >
          <div className="flex items-center justify-between px-6 pt-5">
            <DialogTitle
              id={titleId}
              className="text-[18px] font-bold leading-tight text-[#0f172a]"
            >
              Add task
            </DialogTitle>
            <button
              type="button"
              aria-label="Close"
              className="flex size-8 items-center justify-center rounded-md text-[#64748b] hover:bg-[#f1f5f9] hover:text-[#0f172a]"
              onClick={() => onOpenChange(false)}
            >
              <X className="size-4" strokeWidth={2} />
            </button>
          </div>

          <form className="contents" onSubmit={save}>
            <div className="px-6 pb-5 pt-4">
              <div className="flex flex-col gap-2">
                <input
                  ref={nameRef}
                  type="text"
                  value={displayName}
                  readOnly={!nameTouched}
                  onChange={(e) => nameTouched && setName(e.target.value)}
                  onKeyDown={onNameKeyDown}
                  onPaste={(e) => {
                    e.preventDefault()
                    onNamePaste(e.clipboardData.getData("text"))
                  }}
                  className={cn(
                    CONTROL,
                    NAME_FOCUS,
                    "h-12 w-full px-3 text-[16px]",
                    !nameTouched && "text-[#94a3b8]",
                  )}
                  aria-label="Task name"
                />

                <div
                  className="flex gap-1 rounded-[10px] bg-[#f1f5f9] p-[3px]"
                  role="group"
                  aria-label="Task type"
                >
                  {SEGMENTS.map(({ id, label, Icon }) => {
                    const selected = kind === id
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setKind(id)}
                        className={cn(
                          "flex h-[34px] flex-1 items-center justify-center gap-1.5 rounded-[8px] text-[13px] font-medium transition-colors",
                          selected
                            ? "bg-white text-[#4f46e5] shadow-[0_1px_2px_rgba(15,23,42,0.08)]"
                            : "bg-transparent text-[#64748b] hover:text-[#0f172a]",
                        )}
                      >
                        <Icon />
                        {label}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="mt-4 grid grid-cols-[24px_1fr] gap-x-3 gap-y-3">
                <AddTaskFieldRow
                  icon={<Calendar className={GUTTER_ICON} />}
                  iconTitle="Due"
                >
                  <div className="flex items-center gap-2">
                    <Popover open={dateOpen} onOpenChange={setDateOpen}>
                      <PopoverTrigger
                        render={
                          <button
                            type="button"
                            aria-label="Due date"
                            className={cn(
                              CONTROL,
                              "flex h-[38px] w-[118px] shrink-0 items-center px-3 text-[13px] tabular-nums",
                            )}
                          />
                        }
                      >
                        {formatDisplayDate(dueDate)}
                      </PopoverTrigger>
                      <PopoverContent align="start" className="w-auto p-2">
                        <CalendarPicker
                          mode="single"
                          selected={dueDate}
                          onSelect={(d) => {
                            if (!d) return
                            setDueDate(toCalendarDate(d))
                            setDateOpen(false)
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="hh:mm"
                      value={dueTime}
                      onChange={(e) => setDueTime(e.target.value)}
                      className={cn(
                        CONTROL,
                        "h-[38px] w-[76px] shrink-0 px-3 text-[13px] tabular-nums placeholder:text-[#94a3b8]",
                      )}
                      aria-label="Due time (optional)"
                    />
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <button
                            type="button"
                            className={cn(
                              CONTROL,
                              "ml-auto flex h-[38px] shrink-0 items-center gap-1.5 px-3 text-[13px]",
                            )}
                          />
                        }
                      >
                        <Flag
                          className={cn("size-3.5", PRIORITY_META[priority].flag)}
                          strokeWidth={2}
                        />
                        {priority === "none" ? (
                          <span className="text-[#64748b]">Priority</span>
                        ) : (
                          <span className="font-medium text-[#0f172a]">
                            {PRIORITY_META[priority].label}
                          </span>
                        )}
                        <ChevronDown
                          className="size-3.5 text-[#94a3b8]"
                          strokeWidth={2}
                        />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="min-w-[140px]">
                        {(["none", "low", "high"] as Priority[]).map((p) => (
                          <DropdownMenuItem key={p} onClick={() => setPriority(p)}>
                            <span
                              className={cn(
                                "mr-2 size-2 rounded-full",
                                PRIORITY_META[p].dot,
                              )}
                            />
                            {PRIORITY_META[p].label}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </AddTaskFieldRow>

                <AddTaskFieldRow
                  icon={<FileText className={GUTTER_ICON} />}
                  iconTitle="Notes"
                  iconAlign="top"
                >
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Anything to remember for this task? (optional)"
                    aria-label="Notes"
                    className={cn(
                      CONTROL,
                      "min-h-[76px] resize-none bg-white px-3 py-2.5 text-[14px] placeholder:text-[#94a3b8]",
                    )}
                  />
                </AddTaskFieldRow>

                <AddTaskFieldRow
                  icon={<User className={GUTTER_ICON} />}
                  iconTitle="Prospect"
                  iconHeight={44}
                >
                  <AddTaskProspectPicker
                    selected={prospect}
                    onSelect={setProspect}
                  />
                </AddTaskFieldRow>
              </div>
            </div>

            <DialogFooter className="mx-0 mb-0 flex-row justify-end gap-2 rounded-none border-t border-[#eef1f6] bg-[#f8fafc] px-6 py-3.5">
              <Button
                type="button"
                variant="outline"
                className="border-[#e2e8f0] bg-white"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={pending || !prospect}
                className="bg-[#4f46e5] text-white hover:bg-[#4338ca]"
              >
                Add task
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  )
}
