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

export interface Remitter<TConfig = any> {
  /*
   * An event name to listen to all events or to remit on any event listener.
   */
  readonly ANY_EVENT: ANY_EVENT;

  /*
   * An event name to listen to unhandled subscriber errors.
   */
  readonly ERROR_EVENT: ERROR_EVENT;

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

  /**
   * Add an `ANY_EVENT` listener to receive all events.
   */
  on(
    eventName: typeof ANY_EVENT,
    listener: AnyRemitterListener<TConfig>
  ): RemitterDisposer;
  /**
   * Add an `ERROR_EVENT` listener to receive unhandled subscriber errors.
   */
  on(
    eventName: typeof ERROR_EVENT,
    listener: ErrorRemitterListener
  ): RemitterDisposer;
  /**
   * Add a listener to the eventName.
   */
  on<TEventName extends RemitterEventNames<TConfig>>(
    eventName: TEventName,
    listener: RemitterListener<TConfig, TEventName>
  ): RemitterDisposer;

  /**
   * Add an `ANY_EVENT` listener to receive all events.
   */
  onAny(listener: AnyRemitterListener<TConfig>): RemitterDisposer;

  /**
   * Add an `ERROR_EVENT` listener to receive unhandled subscriber errors.
   */
  onError(listener: ErrorRemitterListener): RemitterDisposer;

  /**
   * Add a one-time listener to `ANY_EVENT` to receive all events.
   */
  once(
    eventName: typeof ANY_EVENT,
    listener: AnyRemitterListener<TConfig>
  ): RemitterDisposer;
  /**
   * Add a one-time listener to `ERROR_EVENT` to receive unhandled subscriber errors.
   */
  once(
    eventName: typeof ERROR_EVENT,
    listener: ErrorRemitterListener
  ): RemitterDisposer;
  /**
   * Add a one-time listener to the eventName.
   */
  once<TEventName extends RemitterEventNames<TConfig>>(
    eventName: TEventName,
    listener: RemitterListener<TConfig, TEventName>
  ): RemitterDisposer;

  /**
   * Add a one-time listener to `ANY_EVENT` to receive all events.
   */
  onceAny(listener: AnyRemitterListener<TConfig>): RemitterDisposer;

  /**
   * Add a one-time listener to `ERROR_EVENT` to receive unhandled subscriber errors.
   */
  onceError(listener: ErrorRemitterListener): RemitterDisposer;

  /**
   * Remove a listener from the eventName.
   */
  off<TEventName extends AllRemitterEventNames<TConfig>>(
    eventName: TEventName,
    listener: Fn
  ): boolean;

  /**
   * Remove a listener from `ANY_EVENT`.
   */
  offAny(listener: AnyRemitterListener<TConfig>): boolean;

  /**
   * Remove a listener from `ERROR_EVENT`.
   */
  offError(listener: ErrorRemitterListener): boolean;

  /**
   * Remove all listeners.
   * @param eventName Optional eventName to clear.
   */
  clear<TEventName extends AllRemitterEventNames<TConfig>>(
    eventName?: TEventName
  ): void;

  /**
   * Remove all listeners from `ANY_EVENT`.
   */
  clearAny(): void;

  /**
   * Remove all listeners from `ERROR_EVENT`.
   */
  clearError(): void;

  /**
   * If the eventName has any listener.
   * @param eventName Optional eventName to check.
   * @returns `true` if the eventName has any listener, `false` otherwise. If no eventName is provided, returns `true` if the Remitter has any listener.
   */
  has<TEventName extends AllRemitterEventNames<TConfig>>(
    eventName?: TEventName
  ): boolean;

  /**
   * If the `ANY_EVENT` has any listener.
   * @returns `true` if the `ANY_EVENT` has any listener, `false` otherwise.
   */
  hasAny(): boolean;

  /**
   * If the `ERROR_EVENT` has any listener.
   * @returns `true` if the `ERROR_EVENT` has any listener, `false` otherwise.
   */
  hasError(): boolean;

  /**
   * Remove all listeners and all remit listeners.
   */
  dispose(): void;
}

export type EventReceiver<TConfig = any> = Omit<
  Remitter<TConfig>,
  "emit" | "remit" | "remitAny"
>;

export class Remitter<TConfig = any> implements Remitter<TConfig> {
  public readonly ANY_EVENT: ANY_EVENT = ANY_EVENT;
  public readonly ERROR_EVENT: ERROR_EVENT = ERROR_EVENT;

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
    this.#emit(event, data);
    if (event !== ANY_EVENT && this.has(ANY_EVENT)) {
      this.#emit(ANY_EVENT, { event, data });
    }
  }

  public on(
    eventName: typeof ANY_EVENT,
    listener: AnyRemitterListener<TConfig>
  ): RemitterDisposer;
  public on(
    eventName: typeof ERROR_EVENT,
    listener: ErrorRemitterListener
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
    const oldSize = listeners.size;
    listeners.add(listener);

    if (!oldSize && this.#relayListeners) {
      for (const listener of this.#relayListeners) {
        if (
          !listener.disposer_ &&
          (listener.eventName_ === ANY_EVENT ||
            this.has(listener.eventName_) ||
            this.has(ANY_EVENT))
        ) {
          this.#startRelay(listener);
        }
      }
    }

    return () => {
      this.off(eventName, listener);
    };
  }

  public onAny(listener: AnyRemitterListener<TConfig>): RemitterDisposer {
    return this.on(ANY_EVENT, listener);
  }

  public onError(listener: ErrorRemitterListener): RemitterDisposer {
    return this.on(ERROR_EVENT, listener);
  }

  public once(
    eventName: typeof ANY_EVENT,
    listener: AnyRemitterListener<TConfig>
  ): RemitterDisposer;
  public once(
    eventName: typeof ERROR_EVENT,
    listener: ErrorRemitterListener
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
    (this.#onceListeners ||= new WeakMap()).set(listener, onceListener);
    this.on(eventName, onceListener);
    return off;
  }

  public onceAny(listener: AnyRemitterListener<TConfig>): RemitterDisposer {
    return this.once(ANY_EVENT, listener);
  }

  public onceError(listener: ErrorRemitterListener): RemitterDisposer {
    return this.once(ERROR_EVENT, listener);
  }

  public off<TEventName extends AllRemitterEventNames<TConfig>>(
    eventName: TEventName,
    listener: Fn
  ): boolean {
    const listeners = this.#listeners.get(eventName);
    if (listeners) {
      const oldSize = listeners.size;
      let result = listeners.delete(listener);
      const onceListener = this.#onceListeners?.get(listener);
      if (onceListener) {
        result = listeners.delete(onceListener) || result;
      }
      if (oldSize && !listeners.size) {
        this.#listeners.delete(eventName);
        this.#tryStopAllRelay();
      }
      return result;
    }
    return false;
  }

  public offAny(listener: AnyRemitterListener<TConfig>): boolean {
    return this.off(ANY_EVENT, listener);
  }

  public offError(listener: ErrorRemitterListener): boolean {
    return this.off(ERROR_EVENT, listener);
  }

  public clear<TEventName extends AllRemitterEventNames<TConfig>>(
    eventName?: TEventName
  ): void {
    if (eventName) {
      this.#listeners.get(eventName)?.clear();
    } else {
      this.#listeners.clear();
    }
    this.#tryStopAllRelay();
  }

  public clearAny(): void {
    this.clear(ANY_EVENT);
  }

  public clearError(): void {
    return this.clear(ERROR_EVENT);
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

  public hasAny(): boolean {
    return this.has(ANY_EVENT);
  }

  public hasError(): boolean {
    return this.has(ERROR_EVENT);
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
      this.#startRelay(relayListener);
    }
    return () => {
      this.#relayListeners?.delete(relayListener);
      this.#stopRelay(relayListener);
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

  readonly #listeners = new Map<AllRemitterEventNames<TConfig>, Set<Fn>>();

  #relayListeners?: Set<RelayListener<TConfig>>;

  #onceListeners?: WeakMap<
    RemitterListener<TConfig, any>,
    RemitterListener<TConfig, any>
  >;

  #emit<TEventName extends AllRemitterEventNames<TConfig>>(
    event: TEventName,
    data: any
  ): void {
    const listeners = this.#listeners.get(event);
    if (listeners) {
      for (const listener of listeners) {
        this.#tryCall(listener, data);
      }
    }
  }

  async #startRelay(listener: RelayListener) {
    listener.disposer_ =
      this.#tryCall(listener.start_, this) || Promise.resolve();
  }

  async #stopRelay(listener: RelayListener): Promise<void> {
    const pDisposer = listener.disposer_;
    if (pDisposer) {
      listener.disposer_ = null;
      const disposer = isPromise(pDisposer) ? await pDisposer : pDisposer;
      disposer && this.#tryCall(disposer);
    }
  }

  #tryStopAllRelay() {
    if (this.#relayListeners) {
      for (const listener of this.#relayListeners) {
        if (
          listener.disposer_ &&
          (listener.eventName_ === ANY_EVENT
            ? !this.has()
            : !this.has(ANY_EVENT) && !this.has(listener.eventName_))
        ) {
          this.#stopRelay(listener);
        }
      }
    }
  }

  #tryCall<TReturn = void>(fn: () => TReturn): Promise<TReturn | undefined>;
  #tryCall<TReturn = void, TArg = any>(
    fn: (arg: TArg) => TReturn,
    arg: TArg
  ): Promise<TReturn | undefined>;
  #tryCall<TReturn = void, TArg = any>(
    fn: (arg?: TArg) => TReturn | Promise<TReturn>,
    arg?: TArg
  ): Promise<TReturn | undefined | void> | TReturn | undefined {
    const handleError = (e: unknown): void => {
      if (this.has(ERROR_EVENT)) {
        this.#emit(ERROR_EVENT, e);
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
