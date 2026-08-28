import { describe, expect, it } from "vitest"
import { CallOutcome } from "@prisma/client"
import {
  computeCallRates,
  computePickupBuckets,
  isDial,
  prospectMeetingRate,
} from "../src/lib/stats"

/**
 * Hand-built fixture (SPEC §6.2):
 * 10 dials → 4 connects (CONNECTED, CALLBACK, BOOKED, NOT_INTERESTED)
 * → connect rate 40%, meeting rate 25%, dials/meeting 10
 */
const FIXTURE: CallOutcome[] = [
  CallOutcome.NO_ANSWER,
  CallOutcome.NO_ANSWER,
  CallOutcome.VOICEMAIL,
  CallOutcome.GATEKEEPER,
  CallOutcome.WRONG_NUMBER,
  CallOutcome.CONNECTED,
  CallOutcome.CALLBACK_REQUESTED,
  CallOutcome.MEETING_BOOKED,
  CallOutcome.NOT_INTERESTED,
  CallOutcome.NO_ANSWER,
]

describe("computeCallRates", () => {
  it("matches the hand-built connect-rate fixture", () => {
    const rates = computeCallRates(FIXTURE)
    expect(rates.dials).toBe(10)
    expect(rates.connectedIsh).toBe(4)
    expect(rates.meetingsBooked).toBe(1)
    expect(rates.connectRate).toBe(0.4)
    expect(rates.meetingRate).toBe(0.25)
    expect(rates.dialsPerMeeting).toBe(10)
  })

  it("returns null rates when the denominator is zero", () => {
    expect(computeCallRates([])).toEqual({
      dials: 0,
      connectedIsh: 0,
      meetingsBooked: 0,
      connectRate: null,
      meetingRate: null,
      dialsPerMeeting: null,
    })
    const noConnects = computeCallRates([
      CallOutcome.NO_ANSWER,
      CallOutcome.VOICEMAIL,
    ])
    expect(noConnects.connectRate).toBe(0)
    expect(noConnects.meetingRate).toBeNull()
    expect(noConnects.dialsPerMeeting).toBeNull()
  })

  it("counts NOT_INTERESTED as a connect so success does not tank the rate", () => {
    const without = computeCallRates([
      CallOutcome.CONNECTED,
      CallOutcome.NO_ANSWER,
    ])
    const withNo = computeCallRates([
      CallOutcome.CONNECTED,
      CallOutcome.NOT_INTERESTED,
      CallOutcome.NO_ANSWER,
    ])
    expect(without.connectRate).toBe(0.5)
    expect(withNo.connectRate).toBeCloseTo(2 / 3)
  })
})

describe("computePickupBuckets", () => {
  it("splits the fixture into spoke / gatekeeper / voicemail / no-answer", () => {
    expect(computePickupBuckets(FIXTURE)).toEqual({
      spoke: 4,
      gatekeeper: 1,
      voicemail: 1,
      noAnswer: 4, // 3 NO_ANSWER + 1 WRONG_NUMBER
    })
  })
})

describe("isDial", () => {
  it("treats MEETING_BOOKED rows as dials when they carry an outcome", () => {
    expect(isDial({ outcome: CallOutcome.MEETING_BOOKED })).toBe(true)
    expect(isDial({ outcome: null })).toBe(false)
  })
})

describe("prospectMeetingRate", () => {
  it("is meeting-prospects / enrollments", () => {
    expect(prospectMeetingRate(3, 12)).toBe(0.25)
    expect(prospectMeetingRate(1, 0)).toBeNull()
  })
})
