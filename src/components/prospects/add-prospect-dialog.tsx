"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
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

export function AddProspectDialog() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pending, start] = useTransition()
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    company: "",
    title: "",
    email: "",
    phone: "",
  })

  function set(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>Add prospect</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add prospect</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 py-1">
          {(
            [
              ["firstName", "First name", true],
              ["lastName", "Last name", false],
              ["company", "Company", false],
              ["title", "Title", false],
              ["email", "Email", false],
              ["phone", "Phone", false],
            ] as const
          ).map(([key, label, required]) => (
            <label key={key} className="grid gap-1 text-xs font-medium">
              {label}
              <Input
                required={required}
                value={form[key]}
                onChange={(e) => set(key, e.target.value)}
              />
            </label>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            disabled={pending || !form.firstName.trim()}
            onClick={() => {
              start(async () => {
                const res = await createProspectAction(form)
                if (!res.ok) {
                  toast.error(res.error)
                  return
                }
                toast.success("Prospect added")
                setOpen(false)
                setForm({
                  firstName: "",
                  lastName: "",
                  company: "",
                  title: "",
                  email: "",
                  phone: "",
                })
                router.push(`/prospects/${res.id}`)
              })
            }}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
