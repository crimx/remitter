import { abortable } from "@wopjs/disposable";
import { tryCall } from "./utils";

type Fn = (...args: any[]) => any;

/**
 * A symbol that can be used as an event name to listen to all events.
 */
export const ANY_EVENT = Symbol("any");

export type AnyEventData<
  TConfig,
  TEventName extends keyof TConfig = keyof TConfig
> = { event: TEventName; data: TConfig[TEventName] };

export type AnyRemitterListener<TConfig> = (
  data: AnyEventData<TConfig>
) => void;

export type RemitterConfig<TConfig> = TConfig & {
  [name in typeof ANY_EVENT]: AnyEventData<TConfig>;
};

export type RemitterDatalessEventName<TConfig> = {
  [EventName in keyof RemitterConfig<TConfig>]: RemitterConfig<TConfig>[EventName] extends
    | undefined
    | void
    | never
    ? EventName
    : never;
}[keyof RemitterConfig<TConfig>];

type RelayListener<TEventName = any> = {
  start_: (eventName: TEventName) => void;
  dispose_: (eventName?: TEventName) => void;
};

export type RemitterEventNames<TConfig> = keyof TConfig;

export type AllRemitterEventNames<TConfig> = keyof TConfig | typeof ANY_EVENT;

export type RemitterListener<
  TConfig,
  TEventName extends RemitterEventNames<
    RemitterConfig<TConfig>
  > = RemitterEventNames<RemitterConfig<TConfig>>
> = RemitterConfig<TConfig>[TEventName] extends undefined | void | never
  ? () => void
  : (eventData: RemitterConfig<TConfig>[TEventName]) => void;

export type RemitterDisposer = () => void;

export class Remitter<TConfig = any> {
  private readonly listeners_ = new Map<
    AllRemitterEventNames<TConfig>,
    Set<Fn>
  >();

  private readonly relayListeners_ = new Set<RelayListener>();

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

    if (listeners.size === 1) {
      for (const listener of this.relayListeners_) {
        listener.start_(eventName);
      }
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
        for (const listener of this.relayListeners_) {
          listener.dispose_(eventName);
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
   * @param eventName
   * @param start A function that is called when listener count if `eventName` grows from 0 to 1. Returns a disposer when listener count if `eventName` drops from 1 to 0.
   */
  public remit<TEventName extends RemitterEventNames<TConfig>>(
    eventName: TEventName,
    start: (remitter: Remitter<TConfig>) => RemitterDisposer
  ): RemitterDisposer {
    let disposer: RemitterDisposer | undefined;
    const relayListener: RelayListener<TEventName> = {
      start_: name => {
        if (name === eventName) {
          disposer = tryCall(start, this);
        }
      },
      dispose_: name => {
        if (disposer && (!name || name === eventName)) {
          tryCall(disposer);
        }
      },
    };
    this.relayListeners_.add(relayListener);
    if (this.listeners_.get(eventName)?.size) {
      relayListener.start_(eventName);
    }
    return () => {
      this.relayListeners_.delete(relayListener);
      relayListener.dispose_();
    };
  }

  /**
   * Dispose all listeners.
   */
  public dispose(): void {
    this.clear();
    for (const listener of this.relayListeners_) {
      listener.dispose_();
    }
    this.relayListeners_.clear();
  }
}

export type ReadonlyRemitter<TConfig = any> = Pick<
  Remitter<TConfig>,
  "dispose" | "count" | "on" | "off" | "clear"
>;
