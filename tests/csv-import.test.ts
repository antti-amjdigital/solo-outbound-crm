import { describe, expect, it } from "vitest"
import {
  applyMapping,
  classifyRows,
  guessMapping,
  normalizePhone,
} from "../src/lib/csv-import"

describe("csv-import", () => {
  it("guesses common headers", () => {
    const m = guessMapping(["First Name", "Email", "Phone", "Company"])
    expect(m["First Name"]).toBe("firstName")
    expect(m.Email).toBe("email")
    expect(m.Phone).toBe("phone")
    expect(m.Company).toBe("company")
  })

  it("dedupes within file and against existing keys", () => {
    const rows = applyMapping(
      ["first", "email", "phone"],
      [
        ["Ada", "ada@x.com", "+358501"],
        ["Ada2", "ada@x.com", "+358502"],
        ["Bob", "bob@x.com", "+358503"],
        ["Carol", "", ""],
      ],
      {
        first: "firstName",
        email: "email",
        phone: "phone",
      },
    )
    const preview = classifyRows(rows, new Set(["e:bob@x.com"]))
    expect(preview.newCount).toBe(1)
    expect(preview.duplicateCount).toBe(2)
    expect(preview.missingPhoneCount).toBe(1)
    expect(preview.toCreate).toHaveLength(2)
  })

  it("normalizes phones for matching", () => {
    expect(normalizePhone("+358 50 555 0198")).toBe("+358505550198")
  })
})
