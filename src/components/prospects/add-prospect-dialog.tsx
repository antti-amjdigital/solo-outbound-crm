"use client"

import { useRouter, usePathname } from "next/navigation"
import {
  useCallback,
  useRef,
  useState,
  useTransition,
  type KeyboardEvent,
} from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { createProspectAction } from "@/actions/prospects"
import { isModEnter, useModEnterSubmit } from "@/hooks/use-mod-enter"
import { prospectPanelHref } from "@/lib/prospect-href"
import { cn } from "@/lib/utils"

type Props = {
  triggerClassName?: string
  triggerLabel?: string
}

type FormState = {
  name: string
  company: string
  title: string
  email: string
  phone: string
}

const EMPTY_FORM: FormState = {
  name: "",
  company: "",
  title: "",
  email: "",
  phone: "",
}

const FIELDS: {
  key: keyof FormState
  label: string
  required?: boolean
  full?: boolean
}[] = [
  { key: "name", label: "Name", required: true, full: true },
  { key: "company", label: "Company" },
  { key: "title", label: "Title" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
]

function splitName(name: string): { firstName: string; lastName?: string } {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return { firstName: "" }
  if (parts.length === 1) return { firstName: parts[0] }
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") }
}

export function AddProspectDialog({
  triggerClassName,
  triggerLabel = "Add prospect",
}: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [pending, start] = useTransition()
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  function set(key: keyof FormState, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function focusNext(index: number) {
    const next = inputRefs.current[index + 1]
    if (next) next.focus()
  }

  const save = useCallback(() => {
    const { firstName, lastName } = splitName(form.name)
    if (!firstName || pending) return
    start(async () => {
      const res = await createProspectAction({
        firstName,
        lastName,
        company: form.company,
        title: form.title,
        email: form.email,
        phone: form.phone,
      })
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      toast.success("Prospect added")
      setOpen(false)
      setForm(EMPTY_FORM)
      router.push(prospectPanelHref(res.id, { pathname }), {
        scroll: false,
      })
    })
  }, [form, pathname, pending, router])

  useModEnterSubmit(save, open)

  function onFieldKeyDown(e: KeyboardEvent<HTMLInputElement>, index: number) {
    if (e.key !== "Enter") return
    if (isModEnter(e)) return
    e.preventDefault()
    if (index < FIELDS.length - 1) focusNext(index)
    else save()
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) setForm(EMPTY_FORM)
      }}
    >
      <DialogTrigger
        render={
          <Button
            className={cn(
              "h-[38px] rounded-lg bg-stats-indigo-700 px-[18px] text-[14px] font-semibold text-white hover:bg-stats-indigo-900",
              triggerClassName,
            )}
          />
        }
      >
        {triggerLabel}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add prospect</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 py-1">
          {FIELDS.map(({ key, label, required, full }, index) => (
            <label
              key={key}
              className={cn(
                "grid gap-1 text-xs font-medium",
                full && "col-span-2",
              )}
            >
              {label}
              <Input
                ref={(el) => {
                  inputRefs.current[index] = el
                }}
                required={required}
                value={form[key]}
                onChange={(e) => set(key, e.target.value)}
                onKeyDown={(e) => onFieldKeyDown(e, index)}
              />
            </label>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            disabled={pending || !form.name.trim()}
            className="bg-stats-indigo-700 hover:bg-stats-indigo-900"
            onClick={save}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
