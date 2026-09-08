"use client"

import { useState } from "react"
import { Briefcase, Check, Copy, Link, Mail, Phone, Tag } from "lucide-react"
import { toast } from "sonner"
import {
  ProspectFieldEditDialog,
  type FieldEditMode,
} from "@/components/prospect-detail/prospect-field-edit-dialog"
import type { Prospect } from "@prisma/client"
import { cn } from "@/lib/utils"

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-[#e8edf4] bg-white">{children}</div>
  )
}

function AddAffordance({
  icon: Icon,
  label,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-[13px] text-[#94a3b8] transition-colors hover:text-[#64748b]"
    >
      <Icon className="size-4 shrink-0 text-[#cbd5e1]" />
      {label}
    </button>
  )
}

function ContactRow({
  icon: Icon,
  children,
  className,
}: {
  icon: React.ComponentType<{ className?: string }>
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn("flex items-center gap-2.5 px-4 py-2.5 text-[13px]", className)}
    >
      <Icon className="size-4 shrink-0 text-[#64748b]" />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}

export function ContactCard({ prospect }: { prospect: Prospect }) {
  const [editMode, setEditMode] = useState<FieldEditMode | null>(null)
  const [copied, setCopied] = useState(false)

  async function copyPhone() {
    if (!prospect.phone) return
    await navigator.clipboard.writeText(prospect.phone)
    setCopied(true)
    toast.success("Copied")
    setTimeout(() => setCopied(false), 1500)
  }

  const showTitleCompany = prospect.title || prospect.company

  return (
    <>
      <Card>
        {prospect.phone ? (
          <div className="group/phone flex items-center gap-2.5 bg-[#f5f7ff] px-4 py-3">
            <Phone className="size-4 shrink-0 text-[#4f46e5]" />
            <a
              href={`tel:${prospect.phone.replace(/\s+/g, "")}`}
              className="min-w-0 flex-1 text-[15px] font-semibold tabular-nums text-[#0f172a] hover:text-[#4f46e5]"
            >
              {prospect.phone}
            </a>
            <button
              type="button"
              aria-label={copied ? "Copied" : "Copy phone number"}
              onClick={copyPhone}
              className={cn(
                "flex size-7 shrink-0 items-center justify-center rounded-md text-[#64748b] opacity-0 transition-all group-hover/phone:opacity-100 hover:bg-[#eef2ff] hover:text-[#4f46e5] focus-visible:opacity-100",
                copied && "opacity-100",
              )}
            >
              {copied ? (
                <Check className="size-3.5 text-[#4f46e5]" aria-hidden />
              ) : (
                <Copy className="size-3.5" />
              )}
            </button>
          </div>
        ) : (
          <AddAffordance
            icon={Phone}
            label="Add phone"
            onClick={() => setEditMode("phone")}
          />
        )}

        {prospect.email ? (
          <ContactRow icon={Mail}>
            <a
              href={`mailto:${prospect.email}`}
              className="truncate text-[#4f46e5] hover:underline"
            >
              {prospect.email}
            </a>
          </ContactRow>
        ) : (
          <AddAffordance
            icon={Mail}
            label="Add email"
            onClick={() => setEditMode("email")}
          />
        )}

        {prospect.linkedin ? (
          <ContactRow icon={Link}>
            <a
              href={
                prospect.linkedin.startsWith("http")
                  ? prospect.linkedin
                  : `https://${prospect.linkedin}`
              }
              target="_blank"
              rel="noreferrer"
              className="truncate text-[#4f46e5] hover:underline"
            >
              {prospect.linkedin.replace(/^https?:\/\//, "")}
            </a>
          </ContactRow>
        ) : (
          <AddAffordance
            icon={Link}
            label="Add LinkedIn"
            onClick={() => setEditMode("linkedin")}
          />
        )}

        {showTitleCompany ? (
          <ContactRow icon={Briefcase}>
            <button
              type="button"
              onClick={() => setEditMode("title-company")}
              className="text-left text-[#0f172a] hover:text-[#4f46e5]"
            >
              {[prospect.title, prospect.company].filter(Boolean).join(" · ")}
            </button>
          </ContactRow>
        ) : (
          <AddAffordance
            icon={Briefcase}
            label="Add title & company"
            onClick={() => setEditMode("title-company")}
          />
        )}

        {prospect.source && (
          <div className="flex items-center gap-2 px-4 py-2.5">
            <Tag className="size-3.5 shrink-0 text-[#94a3b8]" />
            <span className="rounded-md bg-[#f1f5f9] px-2 py-0.5 text-[12px] font-medium text-[#64748b]">
              {prospect.source}
            </span>
          </div>
        )}
      </Card>

      <ProspectFieldEditDialog
        prospectId={prospect.id}
        mode={editMode}
        onClose={() => setEditMode(null)}
        linkedin={prospect.linkedin}
        title={prospect.title}
        company={prospect.company}
        email={prospect.email}
        phone={prospect.phone}
      />
    </>
  )
}
