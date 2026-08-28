import { describe, expect, it } from "vitest"
import { StepType } from "@prisma/client"
import { diffSequenceSteps, type DiffableStep } from "../src/lib/sequence-diff"

function step(
  key: string,
  overrides: Partial<DiffableStep> = {},
): DiffableStep {
  return {
    key,
    type: StepType.CALL,
    label: "Call attempt 2",
    delayDays: 1,
    template: null,
    ...overrides,
  }
}

describe("diffSequenceSteps", () => {
  it("reports wait changes in wireframe style", () => {
    const baseline = [step("a")]
    const draft = [step("a", { delayDays: 2 })]
    expect(diffSequenceSteps(baseline, draft)).toEqual([
      "Call attempt 2 wait 1 day → 2 days",
    ])
  })

  it("reports template edits", () => {
    const baseline = [step("a", { type: StepType.EMAIL, label: "Personal email" })]
    const draft = [
      step("a", {
        type: StepType.EMAIL,
        label: "Personal email",
        template: "Hei {{first_name}}",
      }),
    ]
    expect(diffSequenceSteps(baseline, draft)).toEqual([
      "Personal email template edited",
    ])
  })

  it("reports add, remove, and reorder", () => {
    const baseline = [step("a", { label: "A" }), step("b", { label: "B" })]
    const draft = [
      step("b", { label: "B" }),
      step("a", { label: "A" }),
      step("c", { label: "C", type: StepType.EMAIL }),
    ]
    const changes = diffSequenceSteps(baseline, draft)
    expect(changes).toContain('added “C”')
    expect(changes).toContain("steps reordered")
  })

  it("returns empty when identical", () => {
    const steps = [step("a"), step("b", { label: "Other", delayDays: 2 })]
    expect(diffSequenceSteps(steps, steps)).toEqual([])
  })
})
