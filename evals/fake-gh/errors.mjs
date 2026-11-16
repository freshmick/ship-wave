// A gh call the fake does not cover. It fails, and is logged as unhandled so
// the report can say the fake, not the skill, fell short.
export class Unsupported extends Error {}

// A failure the real gh would also give (not found, merge refused). It is
// logged as handled.
export class GhFailure extends Error {}
