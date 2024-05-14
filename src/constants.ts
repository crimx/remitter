/**
 * A symbol that can be used as an event name to listen to all events.
 */
export const ANY_EVENT = /* @__PURE__ */ Symbol();

export type ANY_EVENT = typeof ANY_EVENT;

/**
 * A symbol that can be used as an event name to listen to unhandled subscriber errors.
 */
export const ERROR_EVENT = /* @__PURE__ */ Symbol();

export type ERROR_EVENT = typeof ERROR_EVENT;
