"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import {
  Briefcase,
  Building2,
  Globe,
  Link,
  Mail,
  Phone,
  Pin,
  Tag,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ProspectSequenceBlock } from "@/components/prospect-detail/prospect-sequence-block"
import { upsertPinnedNoteAction } from "@/actions/prospects"
import type { ProspectDetail } from "@/lib/prospect-detail-query"
import { cn } from "@/lib/utils"

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
    <div className={cn("flex items-start gap-2.5 text-sm", className)}>
      <Icon className="mt-0.5 size-4 shrink-0 text-dim" />
      <div className="min-w-0 break-words leading-snug">{children}</div>
    </div>
  )
}

function Section({ children }: { children: React.ReactNode }) {
  return <div className="border-t border-border pt-4">{children}</div>
}

export function DetailSidePanels({ data }: { data: ProspectDetail }) {
  const { prospect, notes } = data
  const router = useRouter()
  const [pending, start] = useTransition()
  const [editing, setEditing] = useState(false)
  const pinned = notes[0]
  const [body, setBody] = useState(pinned?.body ?? "")

  return (
    <aside className="flex w-full shrink-0 flex-col gap-4 lg:w-[300px]">
      <div className="space-y-2.5">
        <ContactRow icon={Phone}>
          {prospect.phone ? (
            <a
              href={`tel:${prospect.phone.replace(/\s+/g, "")}`}
              className="font-medium text-primary hover:underline"
            >
              {prospect.phone}
            </a>
          ) : (
            <span className="text-dim">No phone</span>
          )}
        </ContactRow>
        <ContactRow icon={Mail}>
          {prospect.email ? (
            <a
              href={`mailto:${prospect.email}`}
              className="font-medium text-primary hover:underline"
            >
              {prospect.email}
            </a>
          ) : (
            <span className="text-dim">No email</span>
          )}
        </ContactRow>
        <ContactRow icon={Link}>
          {prospect.linkedin ? (
            <a
              href={
                prospect.linkedin.startsWith("http")
                  ? prospect.linkedin
                  : `https://${prospect.linkedin}`
              }
              target="_blank"
              rel="noreferrer"
              className="font-medium text-primary hover:underline"
            >
              {prospect.linkedin.replace(/^https?:\/\//, "")}
            </a>
          ) : (
            <span className="text-dim">No LinkedIn</span>
          )}
        </ContactRow>
        {prospect.title && (
          <ContactRow icon={Briefcase}>
            <span className="font-medium">{prospect.title}</span>
          </ContactRow>
        )}
        {prospect.company && (
          <ContactRow icon={Building2}>
            <span className="font-medium">{prospect.company}</span>
          </ContactRow>
        )}
        {prospect.source && (
          <ContactRow icon={Tag}>
            <span className="text-dim">{prospect.source}</span>
          </ContactRow>
        )}
        {prospect.timezone && (
          <ContactRow icon={Globe}>
            <span className="text-dim">{prospect.timezone}</span>
          </ContactRow>
        )}
      </div>

      <Section>
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 text-sm font-medium">
            <Pin className="size-3.5 text-dim" />
            Pinned
          </span>
          <button
            type="button"
            className="text-xs font-medium text-primary hover:underline"
            onClick={() => setEditing((e) => !e)}
          >
            {editing ? "Cancel" : "Edit"}
          </button>
        </div>
        {editing ? (
          <div className="space-y-2">
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              className="text-sm"
            />
            <Button
              size="xs"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const res = await upsertPinnedNoteAction(
                    prospect.id,
                    body,
                    pinned?.id,
                  )
                  if (!res.ok) toast.error(res.error)
                  else {
                    setEditing(false)
                    toast.success("Saved")
                    router.refresh()
                  }
                })
              }
            >
              Save
            </Button>
          </div>
        ) : pinned ? (
          <div className="whitespace-pre-wrap text-sm leading-relaxed">
            {pinned.body}
            <div className="mt-1.5 text-[11px] text-dim">
              edited{" "}
              {pinned.updatedAt.toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                timeZone: "Europe/Helsinki",
              })}
            </div>
          </div>
        ) : (
          <p className="text-sm text-dim">No pinned notes yet.</p>
        )}
      </Section>

      <Section>
        <ProspectSequenceBlock data={data} />
      </Section>
    </aside>
  )
}
