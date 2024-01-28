import type { ANY_EVENT } from "./constants";

export type Fn = (...args: any[]) => any;

export type AnyEventData<
  TConfig,
  TEventName extends keyof TConfig = keyof TConfig
> = TEventName extends any
  ? { event: TEventName; data: TConfig[TEventName] }
  : never;

export type AnyRemitterListener<TConfig> = (
  data: AnyEventData<TConfig>
) => void;

export type RemitterConfig<TConfig> = TConfig & {
  [name in ANY_EVENT]: AnyEventData<TConfig>;
};

export type RemitterDatalessEventName<TConfig> = {
  [EventName in keyof RemitterConfig<TConfig>]: RemitterConfig<TConfig>[EventName] extends
    | undefined
    | void
    | never
    ? EventName
    : never;
}[keyof RemitterConfig<TConfig>];

export type RemitterEventNames<TConfig> = keyof TConfig;

export type AllRemitterEventNames<TConfig> = keyof TConfig | ANY_EVENT;

export type RemitterListener<
  TConfig,
  TEventName extends RemitterEventNames<
    RemitterConfig<TConfig>
  > = RemitterEventNames<RemitterConfig<TConfig>>
> = RemitterConfig<TConfig>[TEventName] extends undefined | void | never
  ? () => void
  : (eventData: RemitterConfig<TConfig>[TEventName]) => void;

export type RemitterDisposer = () => void;
