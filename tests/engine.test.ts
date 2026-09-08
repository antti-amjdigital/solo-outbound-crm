import { afterEach, beforeEach, describe, expect, it } from "vitest"
import {
  formatCalendarDate,
  freezeNow,
  parseCalendarDate,
  appToday,
} from "../src/lib/dates"
import {
  completeTask,
  createAdHocTask,
  enrollProspect,
  markEmailReplyReceived,
  rescheduleTask,
  skipTask,
  stopEnrollment,
} from "../src/lib/sequence-engine"
import {
  CallOutcome,
  createMemoryDb,
  EnrollState,
  ProspectStatus,
  StepType,
  TaskStatus,
  type MemoryDb,
} from "./helpers/memory-db"

const STANDARD_STEPS = [
  { order: 1, type: StepType.EMAIL, label: "Personal email", delayDays: 0, template: null },
  { order: 2, type: StepType.CALL, label: "Call attempt 1", delayDays: 1, template: null },
  { order: 3, type: StepType.CALL, label: "Call attempt 2", delayDays: 2, template: null },
  { order: 4, type: StepType.CALL, label: "Call attempt 3", delayDays: 2, template: null },
  {
    order: 5,
    type: StepType.EMAIL_REPLY,
    label: "Reply to email chain",
    delayDays: 1,
    template: null,
  },
]

/** Monday 17 Aug 2026 — the §4 walkthrough start. */
const MON = "2026-08-17"

async function countOpen(db: MemoryDb, enrollmentId: string) {
  return (await db.task.findMany({ where: { enrollmentId, status: TaskStatus.OPEN } })).length
}

async function seed(db: MemoryDb) {
  const prospect = await db.prospect.create({ data: { firstName: "Mikko", lastName: "Niemi" } })
  const sequence = await db.sequence.create({
    data: { name: "Standard Outbound", steps: { create: STANDARD_STEPS } },
  })
  return { prospect, sequence }
}

async function openTask(db: MemoryDb, enrollmentId: string) {
  const open = await db.task.findMany({ where: { enrollmentId, status: TaskStatus.OPEN } })
  expect(open).toHaveLength(1)
  return open[0]
}

describe("sequence engine", () => {
  let db: MemoryDb

  beforeEach(() => {
    db = createMemoryDb()
    freezeNow(parseCalendarDate(MON))
  })

  afterEach(() => {
    freezeNow(null)
  })

  it("§4 happy path: exact due dates through Standard Outbound", async () => {
    const { prospect, sequence } = await seed(db)
    const { enrollment, task: email } = await enrollProspect(
      prospect.id,
      sequence.id,
      {},
      db,
    )

    expect(formatCalendarDate(email.dueDate)).toBe("2026-08-17")
    expect(email.label).toBe("Personal email")
    expect(await countOpen(db, enrollment.id)).toBe(1)

    freezeNow(parseCalendarDate("2026-08-17"))
    let { nextTask } = await completeTask(email.id, {}, db)
    expect(nextTask?.label).toBe("Call attempt 1")
    expect(formatCalendarDate(nextTask!.dueDate)).toBe("2026-08-18")
    expect(await countOpen(db, enrollment.id)).toBe(1)

    freezeNow(parseCalendarDate("2026-08-18"))
    ;({ nextTask } = await completeTask(
      nextTask!.id,
      { outcome: CallOutcome.NO_ANSWER },
      db,
    ))
    expect(nextTask?.label).toBe("Call attempt 2")
    expect(formatCalendarDate(nextTask!.dueDate)).toBe("2026-08-20")
    expect(await countOpen(db, enrollment.id)).toBe(1)

    freezeNow(parseCalendarDate("2026-08-20"))
    ;({ nextTask } = await completeTask(
      nextTask!.id,
      { outcome: CallOutcome.GATEKEEPER },
      db,
    ))
    expect(nextTask?.label).toBe("Call attempt 3")
    expect(formatCalendarDate(nextTask!.dueDate)).toBe("2026-08-24")
    expect(await countOpen(db, enrollment.id)).toBe(1)

    freezeNow(parseCalendarDate("2026-08-24"))
    ;({ nextTask } = await completeTask(
      nextTask!.id,
      { outcome: CallOutcome.NO_ANSWER },
      db,
    ))
    expect(nextTask?.label).toBe("Reply to email chain")
    expect(formatCalendarDate(nextTask!.dueDate)).toBe("2026-08-25")
    expect(await countOpen(db, enrollment.id)).toBe(1)

    freezeNow(parseCalendarDate("2026-08-25"))
    ;({ nextTask } = await completeTask(nextTask!.id, {}, db))
    expect(nextTask).toBeNull()
    expect(await countOpen(db, enrollment.id)).toBe(0)

    const enr = await db.enrollment.findUnique({ where: { id: enrollment.id } })
    expect(enr?.state).toBe(EnrollState.FINISHED)
    expect(enr?.exitReason).toBe("completed")
    expect(enr?.currentStepOrder).toBe(5)

    const p = await db.prospect.findUnique({ where: { id: prospect.id } })
    expect(p?.status).toBe(ProspectStatus.ACTIVE)
  })

  it("CALLBACK_REQUESTED does not advance currentStepOrder", async () => {
    const { prospect, sequence } = await seed(db)
    const { enrollment } = await enrollProspect(prospect.id, sequence.id, {}, db)
    await completeTask((await openTask(db, enrollment.id)).id, {}, db)

    const call1 = await openTask(db, enrollment.id)
    expect(call1.stepOrder).toBe(2)

    const friday = parseCalendarDate("2026-08-21")
    const { nextTask } = await completeTask(
      call1.id,
      { outcome: CallOutcome.CALLBACK_REQUESTED, nextDueDate: friday },
      db,
    )

    expect(nextTask?.stepOrder).toBe(2)
    expect(nextTask?.label).toBe("Call attempt 1")
    expect(formatCalendarDate(nextTask!.dueDate)).toBe("2026-08-21")

    const enr = await db.enrollment.findUnique({ where: { id: enrollment.id } })
    // Email completed → cursor 1; callback must not bump past that.
    expect(enr?.currentStepOrder).toBe(1)
    expect(await countOpen(db, enrollment.id)).toBe(1)
  })

  it("MEETING_BOOKED cancels open tasks and finishes enrollment", async () => {
    const { prospect, sequence } = await seed(db)
    const { enrollment } = await enrollProspect(prospect.id, sequence.id, {}, db)
    await completeTask((await openTask(db, enrollment.id)).id, {}, db)
    const call1 = await openTask(db, enrollment.id)

    const { nextTask } = await completeTask(
      call1.id,
      { outcome: CallOutcome.MEETING_BOOKED, note: "Tue 10:00" },
      db,
    )
    expect(nextTask).toBeNull()
    expect(await countOpen(db, enrollment.id)).toBe(0)

    const enr = await db.enrollment.findUnique({ where: { id: enrollment.id } })
    expect(enr?.state).toBe(EnrollState.FINISHED)
    expect(enr?.exitReason).toBe("meeting_booked")

    const p = await db.prospect.findUnique({ where: { id: prospect.id } })
    expect(p?.status).toBe(ProspectStatus.MEETING_BOOKED)
  })

  it("NOT_INTERESTED marks prospect dead", async () => {
    const { prospect, sequence } = await seed(db)
    const { enrollment } = await enrollProspect(prospect.id, sequence.id, {}, db)
    await completeTask((await openTask(db, enrollment.id)).id, {}, db)
    await completeTask(
      (await openTask(db, enrollment.id)).id,
      { outcome: CallOutcome.NOT_INTERESTED },
      db,
    )

    const p = await db.prospect.findUnique({ where: { id: prospect.id } })
    expect(p?.status).toBe(ProspectStatus.DEAD)
    expect(p?.deadReason).toBe("not_interested")
    const enr = await db.enrollment.findUnique({ where: { id: enrollment.id } })
    expect(enr?.state).toBe(EnrollState.FINISHED)
    expect(enr?.exitReason).toBe("dead")
    expect(await countOpen(db, enrollment.id)).toBe(0)
  })

  it("WRONG_NUMBER marks prospect dead", async () => {
    const { prospect, sequence } = await seed(db)
    const { enrollment } = await enrollProspect(prospect.id, sequence.id, {}, db)
    await completeTask((await openTask(db, enrollment.id)).id, {}, db)
    await completeTask(
      (await openTask(db, enrollment.id)).id,
      { outcome: CallOutcome.WRONG_NUMBER },
      db,
    )

    const p = await db.prospect.findUnique({ where: { id: prospect.id } })
    expect(p?.status).toBe(ProspectStatus.DEAD)
    expect(p?.deadReason).toBe("wrong_number")
  })

  it("always one open task per enrollment after every operation", async () => {
    const { prospect, sequence } = await seed(db)
    const { enrollment } = await enrollProspect(prospect.id, sequence.id, {}, db)
    expect(await countOpen(db, enrollment.id)).toBe(1)

    for (const outcome of [
      undefined,
      CallOutcome.VOICEMAIL,
      CallOutcome.CONNECTED,
      CallOutcome.GATEKEEPER,
    ] as const) {
      const task = await openTask(db, enrollment.id)
      freezeNow(parseCalendarDate(formatCalendarDate(task.dueDate)))
      await completeTask(task.id, outcome ? { outcome } : {}, db)
      const open = await countOpen(db, enrollment.id)
      expect(open === 0 || open === 1).toBe(true)
      if (open === 0) break
    }
  })

  it("rescheduleTask only changes dueDate", async () => {
    const { prospect, sequence } = await seed(db)
    const { enrollment } = await enrollProspect(prospect.id, sequence.id, {}, db)
    const task = await openTask(db, enrollment.id)
    const updated = await rescheduleTask(task.id, parseCalendarDate("2026-08-28"), db)
    expect(formatCalendarDate(updated.dueDate)).toBe("2026-08-28")
    expect(await countOpen(db, enrollment.id)).toBe(1)
  })

  it("skipTask advances without writing an activity", async () => {
    const { prospect, sequence } = await seed(db)
    const { enrollment } = await enrollProspect(prospect.id, sequence.id, {}, db)
    const email = await openTask(db, enrollment.id)
    const { nextTask } = await skipTask(email.id, db)
    expect(nextTask?.label).toBe("Call attempt 1")
    const acts = await db.activity.findMany({ where: { prospectId: prospect.id } })
    expect(acts).toHaveLength(0)
    expect(await countOpen(db, enrollment.id)).toBe(1)
  })

  it("stopEnrollment cancels open tasks", async () => {
    const { prospect, sequence } = await seed(db)
    const { enrollment } = await enrollProspect(prospect.id, sequence.id, {}, db)
    await stopEnrollment(enrollment.id, db)
    expect(await countOpen(db, enrollment.id)).toBe(0)
    const enr = await db.enrollment.findUnique({ where: { id: enrollment.id } })
    expect(enr?.state).toBe(EnrollState.FINISHED)
    expect(enr?.exitReason).toBe("manual_stop")
  })

  it("markEmailReplyReceived pauses enrollment; open task remains", async () => {
    const { prospect, sequence } = await seed(db)
    const { enrollment } = await enrollProspect(prospect.id, sequence.id, {}, db)
    await markEmailReplyReceived(prospect.id, "They asked for a deck", db)
    const enr = await db.enrollment.findUnique({ where: { id: enrollment.id } })
    expect(enr?.state).toBe(EnrollState.PAUSED)
    expect(await countOpen(db, enrollment.id)).toBe(1)
  })

  it("createAdHocTask creates a standalone open task", async () => {
    const { prospect } = await seed(db)
    const task = await createAdHocTask(
      prospect.id,
      {
        type: StepType.CALL,
        label: "Follow up on proposal",
        dueDate: parseCalendarDate("2026-08-20"),
      },
      db,
    )
    expect(task.enrollmentId).toBeNull()
    expect(task.stepOrder).toBeNull()
    expect(task.status).toBe(TaskStatus.OPEN)
    expect(task.type).toBe(StepType.CALL)
    expect(task.label).toBe("Follow up on proposal")
    expect(formatCalendarDate(task.dueDate)).toBe("2026-08-20")
  })

  it("createAdHocTask rejects invalid type and empty label", async () => {
    const { prospect } = await seed(db)
    await expect(
      createAdHocTask(
        prospect.id,
        { type: StepType.EMAIL_REPLY, label: "Reply", dueDate: appToday() },
        db,
      ),
    ).rejects.toThrow("Invalid ad-hoc task type")
    await expect(
      createAdHocTask(
        prospect.id,
        { type: StepType.CALL, label: "   ", dueDate: appToday() },
        db,
      ),
    ).rejects.toThrow("Task label is required")
  })

  it("createAdHocTask coexists with enrollment open task", async () => {
    const { prospect, sequence } = await seed(db)
    const { enrollment } = await enrollProspect(prospect.id, sequence.id, {}, db)
    expect(await countOpen(db, enrollment.id)).toBe(1)

    await createAdHocTask(
      prospect.id,
      { type: StepType.MANUAL, label: "Send deck", dueDate: parseCalendarDate(MON) },
      db,
    )

    const open = await db.task.findMany({
      where: { prospectId: prospect.id, status: TaskStatus.OPEN },
    })
    expect(open).toHaveLength(2)
    expect(open.some((t) => t.enrollmentId === null)).toBe(true)
    expect(open.some((t) => t.enrollmentId === enrollment.id)).toBe(true)
  })
})
