type RemitterDatalessEventName<TConfig> = {
  [EventName in keyof TConfig]: TConfig[EventName] extends
    | undefined
    | void
    | never
    ? EventName
    : never;
}[keyof TConfig];

type RelayListener<TEventName = any> = {
  start_: (eventName: TEventName) => void;
  dispose_: (eventName?: TEventName) => void;
};

export type RemitterEventNames<TConfig> = Extract<keyof TConfig, string>;

export type RemitterListener<
  TConfig,
  TEventName extends RemitterEventNames<TConfig> = RemitterEventNames<TConfig>
> = TConfig[TEventName] extends undefined | void | never
  ? () => void
  : (eventData: TConfig[TEventName]) => void;

export type RemitterDisposer = () => void;

export class Remitter<TConfig = any> {
  private readonly listeners_ = new Map<
    RemitterEventNames<TConfig>,
    Set<RemitterListener<TConfig, any>>
  >();

  private readonly relayListeners_ = new Set<RelayListener>();

  /**
   * Emit an event to `eventName` listeners.
   */
  public emit<TEventName extends RemitterDatalessEventName<TConfig>>(
    eventName: TEventName
  ): void;
  public emit<TEventName extends RemitterEventNames<TConfig>>(
    eventName: TEventName,
    eventData: TConfig[TEventName]
  ): void;
  public emit<TEventName extends RemitterEventNames<TConfig>>(
    eventName: TEventName,
    eventData?: TConfig[TEventName]
  ): void {
    this.listeners_
      .get(eventName)
      ?.forEach(listener => listener(eventData as TConfig[TEventName]));
  }

  /**
   * Add a listener to the eventName.
   */
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
      this.relayListeners_.forEach(listener => listener.start_(eventName));
    }

    return () => {
      this.off(eventName, listener);
    };
  }

  /**
   * Remove a listener from the eventName.
   */
  public off<TEventName extends RemitterEventNames<TConfig>>(
    eventName: TEventName,
    listener: RemitterListener<TConfig, TEventName>
  ): boolean {
    const listeners = this.listeners_.get(eventName);
    if (listeners) {
      const result = listeners.delete(listener);
      if (listeners.size <= 0) {
        this.listeners_.delete(eventName);
        this.relayListeners_.forEach(listener => listener.dispose_(eventName));
      }
      return result;
    }
    return false;
  }

  public clear<TEventName extends RemitterEventNames<TConfig>>(
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
  public count<TEventName extends RemitterEventNames<TConfig>>(
    eventName?: TEventName
  ): number {
    if (eventName) {
      return this.listeners_.get(eventName)?.size || 0;
    } else {
      let count = 0;
      this.listeners_.forEach(listeners => {
        count += listeners.size;
      });
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
          disposer = start(this);
        }
      },
      dispose_: name => {
        if (disposer && (!name || name === eventName)) {
          disposer();
        }
      },
    };
    this.relayListeners_.add(relayListener);
    if ((this.listeners_.get(eventName)?.size || 0) > 0) {
      disposer = start(this);
    }
    return () => {
      this.relayListeners_.delete(relayListener);
      if (disposer) {
        disposer();
      }
    };
  }

  public destroy(): void {
    this.clear();
    this.relayListeners_.forEach(listener => listener.dispose_());
    this.relayListeners_.clear();
  }
}

export type ReadonlyRemitter<TConfig = any> = Pick<
  Remitter<TConfig>,
  "destroy" | "count" | "on" | "off" | "clear"
>;
