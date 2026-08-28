"use client"

import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { ImportPreview } from "@/lib/csv-import"

export function ImportPreviewPanel({
  preview,
  pending,
  onBack,
  onCommit,
}: {
  preview: ImportPreview
  pending: boolean
  onBack: () => void
  onCommit: () => void
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 text-sm">
        <span className="rounded-md bg-good-soft px-2.5 py-1 font-semibold text-good">
          {preview.newCount} new
        </span>
        <span className="rounded-md bg-accent-soft px-2.5 py-1 font-semibold text-primary">
          {preview.duplicateCount} duplicates
        </span>
        <span className="rounded-md bg-secondary px-2.5 py-1 font-semibold text-dim">
          {preview.missingPhoneCount} missing phone
        </span>
        {preview.invalidCount > 0 && (
          <span className="rounded-md bg-bad-soft px-2.5 py-1 font-semibold text-bad">
            {preview.invalidCount} invalid
          </span>
        )}
      </div>
      <p className="text-xs text-dim">
        Will create {preview.toCreate.length} prospects (new + missing phone).
        Duplicates are skipped.
      </p>
      <div className="max-h-72 overflow-auto rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Status</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Email / phone</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {preview.rows.slice(0, 80).map((r) => (
              <TableRow key={r.index}>
                <TableCell className="text-xs capitalize">
                  {r.status.replace("_", " ")}
                  {"reason" in r && r.reason ? (
                    <span className="text-dim"> · {r.reason}</span>
                  ) : null}
                </TableCell>
                <TableCell className="text-xs">
                  {[r.row.firstName, r.row.lastName].filter(Boolean).join(" ")}
                </TableCell>
                <TableCell className="text-xs text-dim">
                  {r.row.company ?? "—"}
                </TableCell>
                <TableCell className="font-mono text-[11px] text-dim">
                  {r.row.email || r.row.phone || "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button
          disabled={pending || preview.toCreate.length === 0}
          onClick={onCommit}
        >
          Import {preview.toCreate.length}
        </Button>
      </div>
    </div>
  )
}
