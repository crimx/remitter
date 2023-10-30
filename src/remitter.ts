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

export class ReadonlyRemitter<TConfig = any> {
  /**
   * An event name to listen to all events or to remit on any event listener.
   */
  public readonly ANY_EVENT: ANY_EVENT = ANY_EVENT;

  readonly #listeners = new Map<AllRemitterEventNames<TConfig>, Set<Fn>>();

  #relayListeners?: Set<RelayListener>;

  #onceListeners?: WeakMap<
    RemitterListener<TConfig, any>,
    RemitterListener<TConfig, any>
  >;

  /**
   * Emit an event to `eventName` listeners.
   */
  protected emit<TEventName extends RemitterDatalessEventName<TConfig>>(
    eventName: TEventName
  ): void;
  /**
   * Emit an event with payload to `eventName` listeners.
   */
  protected emit<TEventName extends RemitterEventNames<TConfig>>(
    eventName: TEventName,
    eventData: TConfig[TEventName]
  ): void;
  protected emit<TEventName extends RemitterEventNames<TConfig>>(
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
      (this as ReadonlyRemitter<RemitterConfig<TConfig>>).emit(ANY_EVENT, {
        event,
        data,
      } as any);
    }
  }

  /**
   * Add an `ANY_EVENT_NAME` listener to receive all events.
   */
  public on(
    eventName: typeof ANY_EVENT,
    listener: AnyRemitterListener<TConfig>
  ): RemitterDisposer;
  /**
   * Add a listener to the eventName.
   */
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

  /**
   * Add a one-time listener to `ANY_EVENT_NAME` to receive all events..
   */
  public once(
    eventName: typeof ANY_EVENT,
    listener: AnyRemitterListener<TConfig>
  ): RemitterDisposer;
  /**
   * Add a one-time listener to the eventName.
   */
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

  /**
   * Remove a listener from the eventName.
   */
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

  /**
   * @deprecated Use `has` instead.
   * Returns the number of listeners for the eventName.
   * @param eventName Optional eventName to check.
   * @returns The number of listeners for the eventName. If no eventName is provided, returns the total count of all listeners.
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

  /**
   * If the eventName has any listener.
   * @param eventName Optional eventName to check.
   * @returns `true` if the eventName has any listener, `false` otherwise. If no eventName is provided, returns `true` if the Remitter has any listener.
   */
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
   * Start a side effect when the eventName has a first listener.
   * Dispose the side effect when the eventName has no listeners.
   * For example tap into other events.
   *
   * remit `ANY_EVENT` will be started when any event is listened.
   *
   * @param eventName
   * @param start A function that is called when listener count if `eventName` grows from 0 to 1. Returns a disposer when listener count if `eventName` drops from 1 to 0.
   */
  protected remit<TEventName extends AllRemitterEventNames<TConfig>>(
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

  /**
   * Dispose all listeners.
   */
  public dispose(): void {
    this.clear();
    this.#relayListeners?.clear();
  }
}

export class Remitter<TConfig = any> extends ReadonlyRemitter<TConfig> {
  public constructor() {
    super();
  }
  public override emit = super.emit;
  public override remit = super.remit;
}
