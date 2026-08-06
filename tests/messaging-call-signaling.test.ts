import { describe, it, expect } from "vitest"
import { decideOnSignal, type SignalState } from "@/modules/messaging/call-signaling"

const ME = "me"
const THEM = "them"
const OFFER = { type: "offer", sdp: "o" } as RTCSessionDescriptionInit
const ANSWER = { type: "answer", sdp: "a" } as RTCSessionDescriptionInit
const CAND = { candidate: "c" } as RTCIceCandidateInit

const state = (over: Partial<SignalState> = {}): SignalState => ({
  phase: "idle", hasPeer: false, remoteReady: false, autoAccept: false, ...over,
})

describe("decideOnSignal — self echo", () => {
  it("ignores our own broadcast regardless of event", () => {
    expect(decideOnSignal(state(), ME, "call_offer", { from: ME, sdp: OFFER })).toEqual({ type: "ignore" })
    expect(decideOnSignal(state({ hasPeer: true }), ME, "call_ice", { from: ME, candidate: CAND })).toEqual({ type: "ignore" })
  })
})

describe("decideOnSignal — call_offer", () => {
  it("rings a fresh idle callee (no auto-accept)", () => {
    expect(decideOnSignal(state(), ME, "call_offer", { from: THEM, sdp: OFFER, audioOnly: true })).toEqual({
      type: "incoming", sdp: OFFER, audioOnly: true, autoAnswer: false,
    })
  })
  it("auto-answers when armed and an offer is present", () => {
    expect(decideOnSignal(state({ autoAccept: true }), ME, "call_offer", { from: THEM, sdp: OFFER })).toEqual({
      type: "incoming", sdp: OFFER, audioOnly: false, autoAnswer: true,
    })
  })
  it("does NOT auto-answer when armed but the offer has no sdp", () => {
    const d = decideOnSignal(state({ autoAccept: true }), ME, "call_offer", { from: THEM })
    expect(d).toEqual({ type: "incoming", sdp: null, audioOnly: false, autoAnswer: false })
  })
  it("rejects as busy when already in a call (phase)", () => {
    expect(decideOnSignal(state({ phase: "connected" }), ME, "call_offer", { from: THEM, sdp: OFFER })).toEqual({ type: "reject_busy" })
  })
  it("rejects as busy when a peer connection already exists", () => {
    expect(decideOnSignal(state({ hasPeer: true }), ME, "call_offer", { from: THEM, sdp: OFFER })).toEqual({ type: "reject_busy" })
  })
})

describe("decideOnSignal — call_answer", () => {
  it("applies the answer when we have a peer awaiting it", () => {
    expect(decideOnSignal(state({ phase: "calling", hasPeer: true }), ME, "call_answer", { from: THEM, sdp: ANSWER })).toEqual({
      type: "apply_answer", sdp: ANSWER,
    })
  })
  it("ignores an answer with no peer connection", () => {
    expect(decideOnSignal(state({ phase: "calling" }), ME, "call_answer", { from: THEM, sdp: ANSWER })).toEqual({ type: "ignore" })
  })
  it("ignores an answer with no sdp", () => {
    expect(decideOnSignal(state({ hasPeer: true }), ME, "call_answer", { from: THEM })).toEqual({ type: "ignore" })
  })
})

describe("decideOnSignal — call_ice", () => {
  it("adds the candidate once remote is ready", () => {
    expect(decideOnSignal(state({ hasPeer: true, remoteReady: true }), ME, "call_ice", { from: THEM, candidate: CAND })).toEqual({
      type: "add_ice", candidate: CAND,
    })
  })
  it("buffers the candidate before remote is ready", () => {
    expect(decideOnSignal(state({ hasPeer: true, remoteReady: false }), ME, "call_ice", { from: THEM, candidate: CAND })).toEqual({
      type: "buffer_ice", candidate: CAND,
    })
  })
  it("buffers when there is no peer yet", () => {
    expect(decideOnSignal(state(), ME, "call_ice", { from: THEM, candidate: CAND })).toEqual({ type: "buffer_ice", candidate: CAND })
  })
  it("ignores an empty candidate", () => {
    expect(decideOnSignal(state({ hasPeer: true, remoteReady: true }), ME, "call_ice", { from: THEM })).toEqual({ type: "ignore" })
  })
})

describe("decideOnSignal — call_end", () => {
  it("tears down on remote end", () => {
    expect(decideOnSignal(state({ phase: "connected", hasPeer: true }), ME, "call_end", { from: THEM })).toEqual({ type: "end" })
  })
})
