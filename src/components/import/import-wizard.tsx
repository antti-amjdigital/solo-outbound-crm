"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Papa from "papaparse"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ImportPreviewPanel } from "@/components/import/import-preview"
import {
  getExistingContactKeysAction,
  importProspectsAction,
} from "@/actions/import"
import {
  applyMapping,
  classifyRows,
  FIELD_LABELS,
  guessMapping,
  type FieldMapping,
  type ImportPreview,
  type ProspectField,
} from "@/lib/csv-import"

type Step = "upload" | "map" | "preview"

const FIELDS = Object.keys(FIELD_LABELS) as ProspectField[]

export function ImportWizard() {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [step, setStep] = useState<Step>("upload")
  const [headers, setHeaders] = useState<string[]>([])
  const [rawRows, setRawRows] = useState<string[][]>([])
  const [mapping, setMapping] = useState<FieldMapping>({})
  const [preview, setPreview] = useState<ImportPreview | null>(null)
  const [fileName, setFileName] = useState("")

  const hasFirstName = useMemo(
    () => Object.values(mapping).includes("firstName"),
    [mapping],
  )

  function onFile(file: File) {
    setFileName(file.name)
    Papa.parse<string[]>(file, {
      preview: 5000,
      skipEmptyLines: true,
      complete(results) {
        const data = results.data.filter((r) => r.some((c) => c?.trim()))
        if (data.length < 2) {
          toast.error("CSV needs a header row and at least one data row")
          return
        }
        const hdrs = data[0].map((h) => h.trim() || "column")
        const guessed = guessMapping(hdrs)
        setHeaders(hdrs)
        setRawRows(data.slice(1))
        setMapping(guessed)
        setStep("map")
      },
      error(err) {
        toast.error(err.message)
      },
    })
  }

  function runPreview() {
    start(async () => {
      const { keys } = await getExistingContactKeysAction()
      const mapped = applyMapping(headers, rawRows, mapping)
      setPreview(classifyRows(mapped, new Set(keys)))
      setStep("preview")
    })
  }

  function commit() {
    if (!preview?.toCreate.length) return
    start(async () => {
      const res = await importProspectsAction(preview.toCreate)
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      toast.success(`Imported ${res.count} prospects`)
      router.push("/prospects?status=NEW")
    })
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Import CSV</h1>
        <p className="mt-1 text-sm text-dim">
          Map columns, preview duplicates, then commit. Dedupe on email or phone.
        </p>
      </div>

      <div className="flex gap-2 text-xs">
        {(["upload", "map", "preview"] as Step[]).map((s, i) => (
          <span
            key={s}
            className={step === s ? "font-semibold text-primary" : "text-dim"}
          >
            {i + 1}.{" "}
            {s === "upload" ? "Upload" : s === "map" ? "Map columns" : "Preview"}
          </span>
        ))}
      </div>

      {step === "upload" && (
        <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-surface px-6 py-16 text-center hover:border-accent-line">
          <span className="text-sm font-medium">
            Drop a CSV here, or click to browse
          </span>
          <span className="text-xs text-dim">First row must be headers</span>
          <input
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) onFile(f)
            }}
          />
        </label>
      )}

      {step === "map" && (
        <div className="space-y-4">
          <p className="text-sm text-dim">
            File <b className="text-foreground">{fileName}</b> · {rawRows.length}{" "}
            rows
          </p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>CSV column</TableHead>
                <TableHead>Sample</TableHead>
                <TableHead>Maps to</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {headers.map((h, i) => (
                <TableRow key={h + i}>
                  <TableCell className="font-medium">{h}</TableCell>
                  <TableCell className="max-w-[200px] truncate text-xs text-dim">
                    {rawRows[0]?.[i] ?? ""}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={mapping[h] ?? "skip"}
                      onValueChange={(v) =>
                        setMapping((m) => ({
                          ...m,
                          [h]: (v as ProspectField) || "skip",
                        }))
                      }
                    >
                      <SelectTrigger size="sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FIELDS.map((f) => (
                          <SelectItem key={f} value={f}>
                            {FIELD_LABELS[f]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep("upload")}>
              Back
            </Button>
            <Button disabled={!hasFirstName || pending} onClick={runPreview}>
              Preview import
            </Button>
          </div>
          {!hasFirstName && (
            <p className="text-xs text-bad">
              Map at least one column to First name.
            </p>
          )}
        </div>
      )}

      {step === "preview" && preview && (
        <ImportPreviewPanel
          preview={preview}
          pending={pending}
          onBack={() => setStep("map")}
          onCommit={commit}
        />
      )}
    </div>
  )
}
