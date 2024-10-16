import type {
  AllRemitterEventNames,
  RemitterListener,
  RemitterDatalessEventName,
  RemitterEventNames,
  AnyRemitterListener,
  RemitterDisposer,
  Fn,
  ErrorRemitterListener,
} from "./interface";

import { abortable } from "@wopjs/disposable";

import { ANY_EVENT, ERROR_EVENT } from "./constants";
import { isPromise } from "./utils";

export type EventReceiver<TConfig = any> = Omit<
  Remitter<TConfig>,
  "emit" | "remit" | "remitAny"
>;

export class Remitter<TConfig = any> {
  /*
   * An event name to listen to all events or to remit on any event listener.
   */
  public readonly ANY_EVENT: ANY_EVENT = ANY_EVENT;

  /*
   * An event name to listen to unhandled subscriber errors.
   */
  public readonly ERROR_EVENT: ERROR_EVENT = ERROR_EVENT;

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
  /**
   * Emit an event with payload to `eventName` listeners.
   */
  public emit<TEventName extends RemitterEventNames<TConfig>>(
    event: TEventName,
    data?: TConfig[TEventName]
  ): void {
    this._emit_(event, data);
    if (event !== ANY_EVENT && this.has(ANY_EVENT)) {
      this._emit_(ANY_EVENT, { event, data });
    }
  }

  /**
   * Add an `ANY_EVENT` listener to receive all events.
   */
  public on(
    eventName: typeof ANY_EVENT,
    listener: AnyRemitterListener<TConfig>
  ): RemitterDisposer;
  /**
   * Add an `ERROR_EVENT` listener to receive unhandled subscriber errors.
   */
  public on(
    eventName: typeof ERROR_EVENT,
    listener: ErrorRemitterListener
  ): RemitterDisposer;
  /**
   * Add a listener to the eventName.
   */
  public on<TEventName extends RemitterEventNames<TConfig>>(
    eventName: TEventName,
    listener: RemitterListener<TConfig, TEventName>
  ): RemitterDisposer;
  /**
   * Add a listener to the eventName.
   */
  public on<TEventName extends RemitterEventNames<TConfig>>(
    eventName: TEventName,
    listener: RemitterListener<TConfig, TEventName>
  ): RemitterDisposer {
    let listeners = this._listeners_.get(eventName);
    if (!listeners) {
      listeners = new Set();
      this._listeners_.set(eventName, listeners);
    }
    const oldSize = listeners.size;
    listeners.add(listener);

    if (!oldSize && this._relayListeners_) {
      for (const listener of this._relayListeners_) {
        if (
          !listener.disposer_ &&
          (listener.eventName_ === ANY_EVENT ||
            this.has(listener.eventName_) ||
            this.has(ANY_EVENT))
        ) {
          this._startRelay_(listener);
        }
      }
    }

    return () => {
      this.off(eventName, listener);
    };
  }

  /**
   * Add an `ANY_EVENT` listener to receive all events.
   */
  public onAny(listener: AnyRemitterListener<TConfig>): RemitterDisposer {
    return this.on(ANY_EVENT, listener);
  }

  /**
   * Add an `ERROR_EVENT` listener to receive unhandled subscriber errors.
   */
  public onError(listener: ErrorRemitterListener): RemitterDisposer {
    return this.on(ERROR_EVENT, listener);
  }

  /**
   * Add a one-time listener to `ANY_EVENT` to receive all events.
   */
  public once(
    eventName: typeof ANY_EVENT,
    listener: AnyRemitterListener<TConfig>
  ): RemitterDisposer;
  /**
   * Add a one-time listener to `ERROR_EVENT` to receive unhandled subscriber errors.
   */
  public once(
    eventName: typeof ERROR_EVENT,
    listener: ErrorRemitterListener
  ): RemitterDisposer;
  /**
   * Add a one-time listener to the eventName.
   */
  public once<TEventName extends RemitterEventNames<TConfig>>(
    eventName: TEventName,
    listener: RemitterListener<TConfig, TEventName>
  ): RemitterDisposer;
  /**
   * Add a one-time listener to the eventName.
   */
  public once<TEventName extends RemitterEventNames<TConfig>>(
    eventName: TEventName,
    listener: RemitterListener<TConfig, TEventName>
  ): RemitterDisposer {
    const off = abortable(() => this.off(eventName, onceListener));
    const onceListener = (eventData => (
      off(), listener(eventData)
    )) as RemitterListener<TConfig, TEventName>;
    (this._onceListeners_ ||= new WeakMap()).set(listener, onceListener);
    this.on(eventName, onceListener);
    return off;
  }

  /**
   * Add a one-time listener to `ANY_EVENT` to receive all events.
   */
  public onceAny(listener: AnyRemitterListener<TConfig>): RemitterDisposer {
    return this.once(ANY_EVENT, listener);
  }

  /**
   * Add a one-time listener to `ERROR_EVENT` to receive unhandled subscriber errors.
   */
  public onceError(listener: ErrorRemitterListener): RemitterDisposer {
    return this.once(ERROR_EVENT, listener);
  }

  /**
   * Remove a listener from the eventName.
   */
  public off<TEventName extends AllRemitterEventNames<TConfig>>(
    eventName: TEventName,
    listener: Fn
  ): boolean {
    const listeners = this._listeners_.get(eventName);
    if (listeners) {
      const oldSize = listeners.size;
      let result = listeners.delete(listener);
      const onceListener = this._onceListeners_?.get(listener);
      if (onceListener) {
        result = listeners.delete(onceListener) || result;
      }
      if (oldSize && !listeners.size) {
        this._listeners_.delete(eventName);
        this._tryStopAllRelay_();
      }
      return result;
    }
    return false;
  }

  /**
   * Remove a listener from `ANY_EVENT`.
   */
  public offAny(listener: AnyRemitterListener<TConfig>): boolean {
    return this.off(ANY_EVENT, listener);
  }

  /**
   * Remove a listener from `ERROR_EVENT`.
   */
  public offError(listener: ErrorRemitterListener): boolean {
    return this.off(ERROR_EVENT, listener);
  }

  /**
   * Remove all listeners.
   * @param eventName Optional eventName to clear.
   */
  public clear<TEventName extends AllRemitterEventNames<TConfig>>(
    eventName?: TEventName
  ): void {
    if (eventName) {
      this._listeners_.get(eventName)?.clear();
    } else {
      this._listeners_.clear();
    }
    this._tryStopAllRelay_();
  }

  /**
   * Remove all listeners from `ANY_EVENT`.
   */
  public clearAny(): void {
    this.clear(ANY_EVENT);
  }

  /**
   * Remove all listeners from `ERROR_EVENT`.
   */
  public clearError(): void {
    return this.clear(ERROR_EVENT);
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
      return (this._listeners_.get(eventName)?.size as number) > 0;
    } else {
      for (const listeners of this._listeners_.values()) {
        if (listeners.size > 0) {
          return true;
        }
      }
      return false;
    }
  }

  /**
   * If the `ANY_EVENT` has any listener.
   * @returns `true` if the `ANY_EVENT` has any listener, `false` otherwise.
   */
  public hasAny(): boolean {
    return this.has(ANY_EVENT);
  }

  /**
   * If the `ERROR_EVENT` has any listener.
   * @returns `true` if the `ERROR_EVENT` has any listener, `false` otherwise.
   */
  public hasError(): boolean {
    return this.has(ERROR_EVENT);
  }

  /**
   * Start a side effect when the eventName has a first listener.
   * Dispose the side effect when the eventName has no listeners.
   * Useful for tapping into other events.
   *
   * @param eventName
   * @param start A function that is called when listener count of `eventName` grows from 0 to 1.
   *              Returns a disposer when listener count of `eventName` drops from 1 to 0.
   */
  public remit<TEventName extends AllRemitterEventNames<TConfig>>(
    eventName: TEventName,
    start: (remitter: Remitter<TConfig>) => RemitterDisposer
  ): RemitterDisposer {
    const relayListener: RelayListener<TConfig> = {
      start_: start,
      eventName_: eventName,
    };
    (this._relayListeners_ || (this._relayListeners_ = new Set())).add(
      relayListener
    );
    if (
      eventName === ANY_EVENT
        ? this.has()
        : this.has(eventName) || this.has(ANY_EVENT)
    ) {
      this._startRelay_(relayListener);
    }
    return () => {
      this._relayListeners_?.delete(relayListener);
      this._stopRelay_(relayListener);
    };
  }

  /**
   * Start a side effect when the first listener.
   * Dispose the side effect when the eventName has no listeners.
   * Useful for tapping into other events.
   *
   * @param start A function that is called when all listener count grows from 0 to 1.
   *              Returns a disposer when all listener count drops from 1 to 0.
   */
  public remitAny(
    start: (remitter: Remitter<TConfig>) => RemitterDisposer
  ): RemitterDisposer {
    return this.remit(ANY_EVENT, start);
  }

  public dispose(): void {
    this.clear();
    this._relayListeners_?.clear();
  }

  /**
   * @internal
   */
  private readonly _listeners_ = new Map<
    AllRemitterEventNames<TConfig>,
    Set<Fn>
  >();

  /**
   * @internal
   */
  private _relayListeners_?: Set<RelayListener<TConfig>>;

  /**
   * @internal
   */
  private _onceListeners_?: WeakMap<
    RemitterListener<TConfig, any>,
    RemitterListener<TConfig, any>
  >;

  /**
   * @internal
   */
  private _emit_<TEventName extends AllRemitterEventNames<TConfig>>(
    event: TEventName,
    data: any
  ): void {
    const listeners = this._listeners_.get(event);
    if (listeners) {
      for (const listener of listeners) {
        this._tryCall_(listener, data);
      }
    }
  }

  /**
   * @internal
   */
  private async _startRelay_(listener: RelayListener) {
    listener.disposer_ =
      this._tryCall_(listener.start_, this) || Promise.resolve();
  }

  /**
   * @internal
   */
  private async _stopRelay_(listener: RelayListener): Promise<void> {
    const pDisposer = listener.disposer_;
    if (pDisposer) {
      listener.disposer_ = null;
      const disposer = isPromise(pDisposer) ? await pDisposer : pDisposer;
      if (disposer) {
        this._tryCall_(disposer);
      }
    }
  }

  /**
   * @internal
   */
  private _tryStopAllRelay_() {
    if (this._relayListeners_) {
      for (const listener of this._relayListeners_) {
        if (
          listener.disposer_ &&
          (listener.eventName_ === ANY_EVENT
            ? !this.has()
            : !this.has(ANY_EVENT) && !this.has(listener.eventName_))
        ) {
          this._stopRelay_(listener);
        }
      }
    }
  }

  /**
   * @internal
   */
  private _tryCall_<TReturn = void>(
    fn: () => TReturn
  ): Promise<TReturn | undefined>;
  /**
   * @internal
   */
  private _tryCall_<TReturn = void, TArg = any>(
    fn: (arg: TArg) => TReturn,
    arg: TArg
  ): Promise<TReturn | undefined>;
  /**
   * @internal
   */
  private _tryCall_<TReturn = void, TArg = any>(
    fn: (arg?: TArg) => TReturn | Promise<TReturn>,
    arg?: TArg
  ): Promise<TReturn | undefined | void> | TReturn | undefined {
    const handleError = (e: unknown): void => {
      if (this.has(ERROR_EVENT)) {
        this._emit_(ERROR_EVENT, e);
      } else {
        console.error(e);
      }
    };
    try {
      const p = fn(arg);
      return isPromise(p) ? p.catch(handleError) : p;
    } catch (e) {
      handleError(e);
    }
  }
}

interface RelayListener<TConfig = any> {
  readonly eventName_: AllRemitterEventNames<TConfig>;
  readonly start_: (remitter: Remitter<TConfig>) => RemitterDisposer;
  disposer_?:
    | Promise<RemitterDisposer | undefined>
    | RemitterDisposer
    | null
    | undefined;
}
