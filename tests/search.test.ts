import { describe, expect, it } from "vitest"
import {
  buildProspectSearchWhere,
  foldForSearch,
  highlightSegments,
  normalizePhone,
  shouldSearch,
  textContains,
} from "../src/lib/search"

describe("search helpers", () => {
  it("normalizes phones for matching", () => {
    expect(normalizePhone("+358 50 555 0198")).toBe("+358505550198")
    expect(normalizePhone("0500 5055")).toBe("05005055")
  })

  it("folds diacritics for comparison", () => {
    expect(foldForSearch("Syväntä")).toBe("syvanta")
    expect(foldForSearch("SYVANTA")).toBe("syvanta")
  })

  it("matches across diacritics", () => {
    expect(textContains("Syväntä Oy", "syvanta")).toBe(true)
    expect(textContains("Syvanta Oy", "syväntä")).toBe(true)
  })

  it("shouldSearch enforces minimum length", () => {
    expect(shouldSearch("a")).toBe(false)
    expect(shouldSearch("ab")).toBe(true)
    expect(shouldSearch("050")).toBe(true)
    expect(shouldSearch("05")).toBe(false)
  })

  it("highlights matched substring", () => {
    const segs = highlightSegments("Valtteri Salo", "valt")
    expect(segs).toEqual([
      { text: "Valt", bold: true },
      { text: "teri Salo", bold: false },
    ])
  })

  it("phone partial match via normalization", () => {
    expect(normalizePhone("0500 5055").includes(normalizePhone("05005"))).toBe(true)
  })

  it("buildProspectSearchWhere splits multi-word queries", () => {
    const where = buildProspectSearchWhere("heli syväntä")
    expect(where.AND).toBeDefined()
    expect(where.AND).toHaveLength(2)
  })
})
