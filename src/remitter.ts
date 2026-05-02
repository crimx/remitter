import { abortable } from "@wopjs/disposable";
import { type AdaptiveSet, add, remove, size } from "adaptive-set";

import { ANY_EVENT, ERROR_EVENT } from "./constants";
import type {
  AllRemitterEventNames,
  AnyRemitterListener,
  ErrorRemitterListener,
  Fn,
  RemitterDatalessEventName,
  RemitterDisposer,
  RemitterEventNames,
  RemitterListener,
  RemitterListenerInternal,
} from "./interface";
import { isPromise } from "./utils";

export type EventReceiver<TConfig = any> = Omit<Remitter<TConfig>, "emit" | "remit" | "remitAny">;

interface RelayListener<TConfig = any> {
  /** event name */
  readonly e: AllRemitterEventNames<TConfig>;
  /** disposer */
  d?: null | Promise<RemitterDisposer | undefined> | RemitterDisposer | undefined;
  /** start */
  readonly s: (remitter: Remitter<TConfig>) => RemitterDisposer;
}

export class Remitter<TConfig = any> {
  /**
   * @internal
   * listeners
   */
  private _l?: Map<AllRemitterEventNames<TConfig>, AdaptiveSet<Fn>>;

  /**
   * @internal
   * once listeners
   */
  private _ol?: WeakMap<RemitterListenerInternal<TConfig, any>, RemitterListenerInternal<TConfig, any>>;

  /**
   * @internal
   * relay listeners
   */
  private _rl?: AdaptiveSet<RelayListener<TConfig>>;

  /**
   * Remove all listeners from the eventName or all events.
   * @param eventName Optional eventName to clear.
   */
  public clear<TEventName extends RemitterEventNames<TConfig>>(eventName?: TEventName): void;
  /**
   * @internal
   */
  public clear<TEventName extends AllRemitterEventNames<TConfig>>(eventName?: TEventName): void;
  public clear<TEventName extends AllRemitterEventNames<TConfig>>(eventName?: TEventName): void {
    if (this._l) {
      if (eventName) {
        this._l.delete(eventName);
      } else {
        this._l = undefined;
      }
      this._ter();
    }
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
    this.clear(ERROR_EVENT);
  }

  public dispose(): void {
    this.clear();
    this._rl = undefined;
  }

  /**
   * Emit an event to `eventName` listeners.
   */
  public emit<TEventName extends RemitterDatalessEventName<TConfig>>(eventName: TEventName): void;
  /**
   * Emit an event with payload to `eventName` listeners.
   */
  public emit<TEventName extends RemitterEventNames<TConfig>>(
    eventName: TEventName,
    eventData: TConfig[TEventName],
  ): void;
  /**
   * Emit an event with payload to `eventName` listeners.
   */
  public emit<TEventName extends RemitterEventNames<TConfig>>(event: TEventName, data?: TConfig[TEventName]): void {
    this._m(event, data);
    if (event !== ANY_EVENT) {
      this._m(ANY_EVENT, { data, event });
    }
  }

  /**
   * If the eventName has any listener.
   * @param eventName Optional eventName to check.
   * @returns `true` if the eventName has any listener, `false` otherwise. If no eventName is provided, returns `true` if the Remitter has any listener.
   */
  public has<TEventName extends RemitterEventNames<TConfig>>(eventName?: TEventName): boolean;

  /**
   * @internal
   */
  public has<TEventName extends AllRemitterEventNames<TConfig>>(eventName?: TEventName): boolean;

  public has<TEventName extends AllRemitterEventNames<TConfig>>(eventName?: TEventName): boolean {
    return eventName ? !!this._l?.get(eventName) : (this._l?.size as number) > 0;
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
   * Remove a listener from the eventName.
   */
  public off<TEventName extends RemitterEventNames<TConfig>>(eventName: TEventName, listener: Fn): void;

  /**
   * @internal
   */
  public off<TEventName extends AllRemitterEventNames<TConfig>>(eventName: TEventName, listener: Fn): void;

  public off<TEventName extends AllRemitterEventNames<TConfig>>(eventName: TEventName, listener: Fn): void {
    let listeners = this._l?.get(eventName);
    if (listeners) {
      listeners = remove(listeners, listener);
      if (listeners) {
        const onceListener = this._ol?.get(listener);
        if (onceListener) {
          listeners = remove(listeners, onceListener);
        }
      }
      if (size(listeners)) {
        this._l!.set(eventName, listeners);
      } else {
        this._l!.delete(eventName);
        this._ter();
      }
    }
  }

  /**
   * Remove a listener from `ANY_EVENT`.
   */
  public offAny(listener: AnyRemitterListener<TConfig>): void {
    this.off(ANY_EVENT, listener);
  }

  /**
   * Remove a listener from `ERROR_EVENT`.
   */
  public offError(listener: ErrorRemitterListener): void {
    this.off(ERROR_EVENT, listener);
  }

  /**
   * Add an `ANY_EVENT` listener to receive all events.
   * @internal
   */
  public on(eventName: ANY_EVENT, listener: AnyRemitterListener<TConfig>): RemitterDisposer;

  /**
   * Add an `ERROR_EVENT` listener to receive unhandled subscriber errors.
   * @internal
   */
  public on(eventName: ERROR_EVENT, listener: ErrorRemitterListener): RemitterDisposer;
  /**
   * Add a listener to the eventName.
   */
  public on<TEventName extends RemitterEventNames<TConfig>>(
    eventName: TEventName,
    listener: RemitterListener<TConfig, TEventName>,
  ): RemitterDisposer;
  /**
   * Add a listener to the eventName.
   * @internal
   */
  public on<TEventName extends RemitterEventNames<TConfig>>(
    eventName: TEventName | ANY_EVENT,
    listener: RemitterListenerInternal<TConfig, TEventName>,
  ): RemitterDisposer;
  /**
   * Add a listener to the eventName.
   */
  public on<TEventName extends RemitterEventNames<TConfig>>(
    eventName: TEventName | ANY_EVENT,
    listener: RemitterListenerInternal<TConfig, TEventName>,
  ): RemitterDisposer {
    const listeners = (this._l ||= new Map<AllRemitterEventNames<TConfig>, AdaptiveSet<Fn>>()).get(eventName);
    const oldSize = size(listeners);
    this._l.set(eventName, add(listeners, listener));

    if (!oldSize && this._rl) {
      for (const listener of this._rl) {
        if (!listener.d && (listener.e === ANY_EVENT || this.has(listener.e) || this.has(ANY_EVENT))) {
          this._sr(listener);
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
   * Add a one-time listener to `ANY_EVENT` to receive all events.
   * @internal
   */
  public once(eventName: ANY_EVENT, listener: AnyRemitterListener<TConfig>): RemitterDisposer;
  /**
   * Add a one-time listener to `ERROR_EVENT` to receive unhandled subscriber errors.
   * @internal
   */
  public once(eventName: ERROR_EVENT, listener: ErrorRemitterListener): RemitterDisposer;
  /**
   * Add a one-time listener to the eventName.
   */
  public once<TEventName extends RemitterEventNames<TConfig>>(
    eventName: TEventName,
    listener: RemitterListener<TConfig, TEventName>,
  ): RemitterDisposer;
  /**
   * Add a one-time listener to the eventName.
   */
  public once<TEventName extends RemitterEventNames<TConfig>>(
    eventName: TEventName | ANY_EVENT,
    listener: RemitterListenerInternal<TConfig, TEventName>,
  ): RemitterDisposer {
    const off = abortable(() => this.off(eventName, onceListener));
    const onceListener = ((eventData) => (off(), listener(eventData))) as RemitterListenerInternal<TConfig, TEventName>;
    (this._ol ||= new WeakMap()).set(listener, onceListener);
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
   * Add an `ERROR_EVENT` listener to receive unhandled subscriber errors.
   */
  public onError(listener: ErrorRemitterListener): RemitterDisposer {
    return this.on(ERROR_EVENT, listener);
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
  public remit<TEventName extends RemitterEventNames<TConfig>>(
    eventName: TEventName,
    start: (remitter: Remitter<TConfig>) => RemitterDisposer,
  ): RemitterDisposer;

  /**
   * @internal
   */
  public remit<TEventName extends AllRemitterEventNames<TConfig>>(
    eventName: TEventName,
    start: (remitter: Remitter<TConfig>) => RemitterDisposer,
  ): RemitterDisposer;
  public remit<TEventName extends AllRemitterEventNames<TConfig>>(
    eventName: TEventName,
    start: (remitter: Remitter<TConfig>) => RemitterDisposer,
  ): RemitterDisposer {
    const relayListener: RelayListener<TConfig> = {
      e: eventName,
      s: start,
    };
    this._rl = add(this._rl, relayListener);
    if (eventName === ANY_EVENT ? this.has() : this.has(eventName) || this.has(ANY_EVENT)) {
      this._sr(relayListener);
    }
    return () => {
      this._rl = remove(this._rl, relayListener);
      this._er(relayListener);
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
  public remitAny(start: (remitter: Remitter<TConfig>) => RemitterDisposer): RemitterDisposer {
    return this.remit(ANY_EVENT, start);
  }

  /**
   * @internal
   * emit
   */
  private _m<TEventName extends AllRemitterEventNames<TConfig>>(event: TEventName, data: any): void {
    const listeners = this._l?.get(event);
    if (listeners) {
      for (const listener of listeners) {
        this._tc(listener, data);
      }
    }
  }

  /**
   * @internal
   * handle error
   */
  private _h = (e: unknown) => {
    if (this.has(ERROR_EVENT)) {
      this._m(ERROR_EVENT, e);
    } else {
      console.error(e);
    }
  };

  /**
   * @internal
   * start relay
   */
  private async _sr(listener: RelayListener) {
    listener.d = this._tc(listener.s, this) || Promise.resolve();
  }

  /**
   * @internal
   * end relay
   */
  private async _er(listener: RelayListener): Promise<void> {
    const pDisposer = listener.d;
    if (pDisposer) {
      listener.d = null;
      const disposer = isPromise(pDisposer) ? await pDisposer : pDisposer;
      if (disposer) {
        this._tc(disposer);
      }
    }
  }

  /**
   * @internal
   * try call
   */
  private _tc<TReturn = void>(fn: () => TReturn): Promise<TReturn | undefined>;
  /**
   * @internal
   */
  private _tc<TReturn = void, TArg = any>(fn: (arg: TArg) => TReturn, arg: TArg): Promise<TReturn | undefined>;
  /**
   * @internal
   */
  private _tc<TReturn = void, TArg = any>(
    fn: (arg?: TArg) => Promise<TReturn> | TReturn,
    arg?: TArg,
  ): Promise<TReturn | undefined | void> | TReturn | undefined {
    try {
      const p = fn(arg);
      return isPromise(p) ? p.catch(this._h) : p;
    } catch (e) {
      this._h(e);
    }
  }

  /**
   * @internal
   * try stop all relay
   */
  private _ter() {
    if (this._rl) {
      for (const listener of this._rl) {
        if (listener.d && (listener.e === ANY_EVENT ? !this.has() : !this.has(ANY_EVENT) && !this.has(listener.e))) {
          this._er(listener);
        }
      }
    }
  }
}
