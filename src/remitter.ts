import type {
  AllRemitterEventNames,
  RemitterListener,
  RemitterDatalessEventName,
  RemitterEventNames,
  RemitterConfig,
  AnyRemitterListener,
  RemitterDisposer,
  Fn,
} from "./interface";
import {
  tryStartAllRelay,
  type RelayListener,
  tryStopAllRelay,
  stopRelay,
  startRelay,
} from "./relay";
import { abortable } from "@wopjs/disposable";
import { tryCall } from "./utils";
import { ANY_EVENT } from "./constants";

export interface EventReceiver<TConfig = any> {
  /**
   * An event name to listen to all events or to remit on any event listener.
   */
  readonly ANY_EVENT: ANY_EVENT;

  /**
   * Add an `ANY_EVENT_NAME` listener to receive all events.
   */
  on(
    eventName: typeof ANY_EVENT,
    listener: AnyRemitterListener<TConfig>
  ): RemitterDisposer;
  /**
   * Add a listener to the eventName.
   */
  on<TEventName extends RemitterEventNames<TConfig>>(
    eventName: TEventName,
    listener: RemitterListener<TConfig, TEventName>
  ): RemitterDisposer;

  /**
   * Add an `ANY_EVENT_NAME` listener to receive all events.
   */
  onAny(listener: AnyRemitterListener<TConfig>): RemitterDisposer;

  /**
   * Add a one-time listener to `ANY_EVENT_NAME` to receive all events..
   */
  once(
    eventName: typeof ANY_EVENT,
    listener: AnyRemitterListener<TConfig>
  ): RemitterDisposer;
  /**
   * Add a one-time listener to the eventName.
   */
  once<TEventName extends RemitterEventNames<TConfig>>(
    eventName: TEventName,
    listener: RemitterListener<TConfig, TEventName>
  ): RemitterDisposer;

  /**
   * Add a one-time listener to `ANY_EVENT_NAME` to receive all events..
   */
  onceAny(listener: AnyRemitterListener<TConfig>): RemitterDisposer;

  /**
   * Remove a listener from the eventName.
   */
  off<TEventName extends AllRemitterEventNames<TConfig>>(
    eventName: TEventName,
    listener: Fn
  ): boolean;

  /**
   * Remove a listener from `ANY_EVENT_NAME`.
   */
  offAny(listener: AnyRemitterListener<TConfig>): boolean;

  /**
   * Remove all listeners.
   */
  clear<TEventName extends AllRemitterEventNames<TConfig>>(
    eventName?: TEventName
  ): void;

  /**
   * If the eventName has any listener.
   * @param eventName Optional eventName to check.
   * @returns `true` if the eventName has any listener, `false` otherwise. If no eventName is provided, returns `true` if the Remitter has any listener.
   */
  has<TEventName extends AllRemitterEventNames<TConfig>>(
    eventName?: TEventName
  ): boolean;

  /**
   * @deprecated Use `has` instead.
   * Returns the number of listeners for the eventName.
   * @param eventName Optional eventName to check.
   * @returns The number of listeners for the eventName. If no eventName is provided, returns the total count of all listeners.
   */
  count<TEventName extends AllRemitterEventNames<TConfig>>(
    eventName?: TEventName
  ): number;

  /**
   * Remove all listeners and all remit listeners.
   */
  dispose(): void;
}

export interface Remitter<TConfig = any> extends EventReceiver<TConfig> {
  /**
   * Emit an event to `eventName` listeners.
   */
  emit<TEventName extends RemitterDatalessEventName<TConfig>>(
    eventName: TEventName
  ): void;
  /**
   * Emit an event with payload to `eventName` listeners.
   */
  emit<TEventName extends RemitterEventNames<TConfig>>(
    eventName: TEventName,
    eventData: TConfig[TEventName]
  ): void;

  /**
   * Start a side effect when the eventName has a first listener.
   * Dispose the side effect when the eventName has no listeners.
   * Useful for tapping into other events.
   *
   * @param eventName
   * @param start A function that is called when listener count of `eventName` grows from 0 to 1.
   *              Returns a disposer when listener count of `eventName` drops from 1 to 0.
   */
  remit<TEventName extends AllRemitterEventNames<TConfig>>(
    eventName: TEventName,
    start: (remitter: Remitter<TConfig>) => RemitterDisposer
  ): RemitterDisposer;

  /**
   * Start a side effect when the first listener.
   * Dispose the side effect when the eventName has no listeners.
   * Useful for tapping into other events.
   *
   * @param start A function that is called when all listener count grows from 0 to 1.
   *              Returns a disposer when all listener count drops from 1 to 0.
   */
  remitAny(
    start: (remitter: Remitter<TConfig>) => RemitterDisposer
  ): RemitterDisposer;
}

export class Remitter<TConfig = any> implements Remitter<TConfig> {
  public readonly ANY_EVENT: ANY_EVENT = ANY_EVENT;

  readonly #listeners = new Map<AllRemitterEventNames<TConfig>, Set<Fn>>();

  #relayListeners?: Set<RelayListener>;

  #onceListeners?: WeakMap<
    RemitterListener<TConfig, any>,
    RemitterListener<TConfig, any>
  >;

  public emit<TEventName extends RemitterDatalessEventName<TConfig>>(
    eventName: TEventName
  ): void;
  public emit<TEventName extends RemitterEventNames<TConfig>>(
    eventName: TEventName,
    eventData: TConfig[TEventName]
  ): void;
  public emit<TEventName extends RemitterEventNames<TConfig>>(
    event: TEventName,
    data?: TConfig[TEventName]
  ): void {
    const listeners = this.#listeners.get(event);
    if (listeners) {
      for (const listener of listeners) {
        tryCall(listener, data as RemitterConfig<TConfig>[TEventName]);
      }
    }
    if (event !== ANY_EVENT && this.has(ANY_EVENT)) {
      (this as Remitter<RemitterConfig<TConfig>>).emit(ANY_EVENT, {
        event,
        data,
      } as any);
    }
  }

  public on(
    eventName: typeof ANY_EVENT,
    listener: AnyRemitterListener<TConfig>
  ): RemitterDisposer;
  public on<TEventName extends RemitterEventNames<TConfig>>(
    eventName: TEventName,
    listener: RemitterListener<TConfig, TEventName>
  ): RemitterDisposer;
  public on<TEventName extends RemitterEventNames<TConfig>>(
    eventName: TEventName,
    listener: RemitterListener<TConfig, TEventName>
  ): RemitterDisposer {
    let listeners = this.#listeners.get(eventName);
    if (!listeners) {
      listeners = new Set();
      this.#listeners.set(eventName, listeners);
    }
    listeners.add(listener);

    if (this.#relayListeners && listeners.size === 1) {
      tryStartAllRelay(
        this.#relayListeners,
        this as unknown as Remitter<TConfig>
      );
    }

    return () => {
      this.off(eventName, listener);
    };
  }

  public onAny(listener: AnyRemitterListener<TConfig>): RemitterDisposer {
    return this.on(ANY_EVENT, listener);
  }

  public once(
    eventName: typeof ANY_EVENT,
    listener: AnyRemitterListener<TConfig>
  ): RemitterDisposer;
  public once<TEventName extends RemitterEventNames<TConfig>>(
    eventName: TEventName,
    listener: RemitterListener<TConfig, TEventName>
  ): RemitterDisposer;
  public once<TEventName extends RemitterEventNames<TConfig>>(
    eventName: TEventName,
    listener: RemitterListener<TConfig, TEventName>
  ): RemitterDisposer {
    const off = abortable(() => this.off(eventName, onceListener));
    const onceListener = (eventData => (
      off(), listener(eventData)
    )) as RemitterListener<TConfig, TEventName>;
    (this.#onceListeners || (this.#onceListeners = new WeakMap())).set(
      listener,
      onceListener
    );
    this.on(eventName, onceListener);
    return off;
  }

  public onceAny(listener: AnyRemitterListener<TConfig>): RemitterDisposer {
    return this.once(ANY_EVENT, listener);
  }

  public off<TEventName extends AllRemitterEventNames<TConfig>>(
    eventName: TEventName,
    listener: Fn
  ): boolean {
    const listeners = this.#listeners.get(eventName);
    if (listeners) {
      let result = listeners.delete(listener);
      const onceListener = this.#onceListeners?.get(listener);
      if (onceListener) {
        result = listeners.delete(onceListener) || result;
      }
      if (listeners.size <= 0) {
        this.#listeners.delete(eventName);
        if (this.#relayListeners) {
          tryStopAllRelay(this.#relayListeners, this);
        }
      }
      return result;
    }
    return false;
  }

  public offAny(listener: AnyRemitterListener<TConfig>): boolean {
    return this.off(ANY_EVENT, listener);
  }

  public clear<TEventName extends AllRemitterEventNames<TConfig>>(
    eventName?: TEventName
  ): void {
    if (eventName) {
      this.#listeners.get(eventName)?.clear();
    } else {
      this.#listeners.clear();
    }
    if (this.#relayListeners) {
      tryStopAllRelay(this.#relayListeners, this);
    }
  }

  public has<TEventName extends AllRemitterEventNames<TConfig>>(
    eventName?: TEventName
  ): boolean {
    if (eventName) {
      return (this.#listeners.get(eventName)?.size as number) > 0;
    } else {
      for (const listeners of this.#listeners.values()) {
        if (listeners.size > 0) {
          return true;
        }
      }
      return false;
    }
  }

  /**
   * @deprecated Use `has` instead.
   */
  public count<TEventName extends AllRemitterEventNames<TConfig>>(
    eventName?: TEventName
  ): number {
    if (eventName) {
      return this.#listeners.get(eventName)?.size || 0;
    } else {
      let count = 0;
      for (const listeners of this.#listeners.values()) {
        count += listeners.size;
      }
      return count;
    }
  }

  public remit<TEventName extends AllRemitterEventNames<TConfig>>(
    eventName: TEventName,
    start: (remitter: Remitter<TConfig>) => RemitterDisposer
  ): RemitterDisposer {
    const relayListener: RelayListener<TConfig> = {
      start_: start,
      eventName_: eventName,
    };
    (this.#relayListeners || (this.#relayListeners = new Set())).add(
      relayListener
    );
    if (
      eventName === ANY_EVENT
        ? this.has()
        : this.has(eventName) || this.has(ANY_EVENT)
    ) {
      startRelay(relayListener, this as unknown as Remitter<TConfig>);
    }
    return () => {
      this.#relayListeners?.delete(relayListener);
      stopRelay(relayListener);
    };
  }

  public remitAny(
    start: (remitter: Remitter<TConfig>) => RemitterDisposer
  ): RemitterDisposer {
    return this.remit(ANY_EVENT, start);
  }

  public dispose(): void {
    this.clear();
    this.#relayListeners?.clear();
  }
}

/**
 * @deprecated Use `EventReceiver` instead.
 */
export type ReadonlyRemitter<TConfig = any> = EventReceiver<TConfig>;
/**
 * @deprecated Use `Remitter` instead.
 */
export const ReadonlyRemitter = Remitter;
