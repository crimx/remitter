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

export class Remitter<TConfig = any> {
  private readonly listeners_ = new Map<
    AllRemitterEventNames<TConfig>,
    Set<Fn>
  >();

  private relayListeners_?: Set<RelayListener>;

  private onceListeners_?: WeakMap<
    RemitterListener<TConfig, any>,
    RemitterListener<TConfig, any>
  >;

  /**
   * Emit an event to `eventName` listeners.
   */
  public emit<TEventName extends RemitterDatalessEventName<TConfig>>(
    eventName: TEventName
  ): void;
  /**
   * Emit an event with payload to `eventName` listeners.
   */
  public emit<TEventName extends RemitterEventNames<TConfig>>(
    eventName: TEventName,
    eventData: TConfig[TEventName]
  ): void;
  public emit<TEventName extends RemitterEventNames<TConfig>>(
    event: TEventName,
    data?: TConfig[TEventName]
  ): void {
    const listeners = this.listeners_.get(event);
    if (listeners) {
      for (const listener of listeners) {
        tryCall(listener, data as RemitterConfig<TConfig>[TEventName]);
      }
    }
    if (event !== ANY_EVENT && this.count(ANY_EVENT)) {
      (this as Remitter<RemitterConfig<TConfig>>).emit(ANY_EVENT, {
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
    let listeners = this.listeners_.get(eventName);
    if (!listeners) {
      listeners = new Set();
      this.listeners_.set(eventName, listeners);
    }
    listeners.add(listener);

    if (this.relayListeners_ && listeners.size === 1) {
      tryStartAllRelay(this.relayListeners_, this);
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
    (this.onceListeners_ || (this.onceListeners_ = new WeakMap())).set(
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
    const listeners = this.listeners_.get(eventName);
    if (listeners) {
      let result = listeners.delete(listener);
      const onceListener = this.onceListeners_?.get(listener);
      if (onceListener) {
        result = listeners.delete(onceListener) || result;
      }
      if (listeners.size <= 0) {
        this.listeners_.delete(eventName);
        if (this.relayListeners_) {
          tryStopAllRelay(this.relayListeners_, this);
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
      this.listeners_.get(eventName)?.clear();
    } else {
      this.listeners_.clear();
    }
    if (this.relayListeners_) {
      tryStopAllRelay(this.relayListeners_, this);
    }
  }

  /**
   * Returns the number of listeners for the eventName.
   * @param eventName If empty returns the number of listeners for all events.
   * @returns
   */
  public count<TEventName extends AllRemitterEventNames<TConfig>>(
    eventName?: TEventName
  ): number {
    if (eventName) {
      return this.listeners_.get(eventName)?.size || 0;
    } else {
      let count = 0;
      for (const listeners of this.listeners_.values()) {
        count += listeners.size;
      }
      return count;
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
  public remit<TEventName extends AllRemitterEventNames<TConfig>>(
    eventName: TEventName,
    start: (remitter: Remitter<TConfig>) => RemitterDisposer
  ): RemitterDisposer {
    const relayListener: RelayListener<TConfig> = {
      start_: start,
      eventName_: eventName,
    };
    (this.relayListeners_ || (this.relayListeners_ = new Set())).add(
      relayListener
    );
    if (this.count(eventName) > 0 || this.count(ANY_EVENT) > 0) {
      startRelay(relayListener, this);
    }
    return () => {
      this.relayListeners_?.delete(relayListener);
      stopRelay(relayListener);
    };
  }

  /**
   * Dispose all listeners.
   */
  public dispose(): void {
    this.clear();
    this.relayListeners_?.clear();
  }
}

export type ReadonlyRemitter<TConfig = any> = Pick<
  Remitter<TConfig>,
  "dispose" | "count" | "on" | "off" | "clear"
>;
