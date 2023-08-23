import type { AllRemitterEventNames, RemitterDisposer } from "./interface";
import type { ReadonlyRemitter, Remitter } from "./remitter";
import { ANY_EVENT } from "./constants";
import { noop, tryCall } from "./utils";

export type RelayListener<TConfig = any> = {
  readonly eventName_: AllRemitterEventNames<TConfig>;
  readonly start_: (remitter: Remitter<TConfig>) => RemitterDisposer;
  disposer_?: RemitterDisposer | null;
};

export const startRelay = (listener: RelayListener, remitter: Remitter) => {
  listener.disposer_ = tryCall(listener.start_, remitter) || noop;
};

export const tryStartAllRelay = (
  listeners: Set<RelayListener>,
  remitter: Remitter
) => {
  for (const listener of listeners) {
    if (!listener.disposer_) {
      if (
        /*
          Sugar for
          ```
          listener.eventName_ === ANY_EVENT
            ? remitter.has()
            : remitter.has(listener.eventName_) ||
              remitter.has(ANY_EVENT)
          ```
          `tryStartAll_` will always be called when remitter.has() is `true`
        */
        listener.eventName_ === ANY_EVENT ||
        remitter.has(listener.eventName_) ||
        remitter.has(ANY_EVENT)
      ) {
        startRelay(listener, remitter);
      }
    }
  }
};

export const stopRelay = (listener: RelayListener) => {
  if (listener.disposer_) {
    tryCall(listener.disposer_);
    listener.disposer_ = null;
  }
};

export const tryStopAllRelay = (
  listeners: Set<RelayListener>,
  remitter: ReadonlyRemitter
) => {
  for (const listener of listeners) {
    if (listener.disposer_) {
      if (
        listener.eventName_ === ANY_EVENT
          ? !remitter.has()
          : !remitter.has(ANY_EVENT) && !remitter.has(listener.eventName_)
      ) {
        stopRelay(listener);
      }
    }
  }
};
