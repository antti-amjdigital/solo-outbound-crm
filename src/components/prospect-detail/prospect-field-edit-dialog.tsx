"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState, useTransition } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { updateProspectAction } from "@/actions/prospects"
import { useModEnterSubmit } from "@/hooks/use-mod-enter"

export type FieldEditMode = "linkedin" | "title-company" | "email" | "phone"

type Props = {
  prospectId: string
  mode: FieldEditMode | null
  onClose: () => void
  linkedin: string | null
  title: string | null
  company: string | null
  email: string | null
  phone: string | null
}

export function ProspectFieldEditDialog({
  prospectId,
  mode,
  onClose,
  linkedin,
  title,
  company,
  email,
  phone,
}: Props) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [linkedinVal, setLinkedinVal] = useState(linkedin ?? "")
  const [titleVal, setTitleVal] = useState(title ?? "")
  const [companyVal, setCompanyVal] = useState(company ?? "")
  const [emailVal, setEmailVal] = useState(email ?? "")
  const [phoneVal, setPhoneVal] = useState(phone ?? "")

  useEffect(() => {
    if (mode) {
      setLinkedinVal(linkedin ?? "")
      setTitleVal(title ?? "")
      setCompanyVal(company ?? "")
      setEmailVal(email ?? "")
      setPhoneVal(phone ?? "")
    }
  }, [mode, linkedin, title, company, email, phone])

  function save() {
    start(async () => {
      const input =
        mode === "linkedin"
          ? { linkedin: linkedinVal }
          : mode === "title-company"
            ? { title: titleVal, company: companyVal }
            : mode === "email"
              ? { email: emailVal }
              : { phone: phoneVal }
      const res = await updateProspectAction(prospectId, input)
      if (!res.ok) toast.error(res.error)
      else {
        toast.success("Saved")
        onClose()
        router.refresh()
      }
    })
  }

  useModEnterSubmit(save, mode != null)

  return (
    <Dialog open={mode != null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === "linkedin"
              ? "LinkedIn"
              : mode === "title-company"
                ? "Title & company"
                : mode === "email"
                  ? "Email"
                  : "Phone"}
          </DialogTitle>
        </DialogHeader>
        {mode === "linkedin" ? (
          <label className="grid gap-1.5 text-sm font-medium text-[#1e293b]">
            LinkedIn URL
            <Input
              value={linkedinVal}
              onChange={(e) => setLinkedinVal(e.target.value)}
              placeholder="linkedin.com/in/…"
            />
          </label>
        ) : mode === "title-company" ? (
          <div className="grid gap-3">
            <label className="grid gap-1.5 text-sm font-medium text-[#1e293b]">
              Title
              <Input
                value={titleVal}
                onChange={(e) => setTitleVal(e.target.value)}
              />
            </label>
            <label className="grid gap-1.5 text-sm font-medium text-[#1e293b]">
              Company
              <Input
                value={companyVal}
                onChange={(e) => setCompanyVal(e.target.value)}
              />
            </label>
          </div>
        ) : mode === "email" ? (
          <label className="grid gap-1.5 text-sm font-medium text-[#1e293b]">
            Email
            <Input
              type="email"
              value={emailVal}
              onChange={(e) => setEmailVal(e.target.value)}
            />
          </label>
        ) : (
          <label className="grid gap-1.5 text-sm font-medium text-[#1e293b]">
            Phone
            <Input
              value={phoneVal}
              onChange={(e) => setPhoneVal(e.target.value)}
            />
          </label>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={pending} onClick={save}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
