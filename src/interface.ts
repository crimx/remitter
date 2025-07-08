import { type ANY_EVENT, type ERROR_EVENT } from "./constants";

export type AllRemitterEventNames<TConfig> =
  | ANY_EVENT
  | ERROR_EVENT
  | keyof TConfig;

export type AnyEventData<
  TConfig,
  TEventName extends keyof TConfig = keyof TConfig,
> = TEventName extends any
  ? { data: TConfig[TEventName]; event: TEventName }
  : never;

export type AnyRemitterListener<TConfig> = (
  data: AnyEventData<TConfig>
) => void;

export type ErrorRemitterListener = (error: unknown) => void;

export type Fn = (...args: any[]) => any;

export type RemitterDatalessEventName<TConfig> = {
  [EventName in keyof TConfig]: TConfig[EventName] extends
    | never
    | undefined
    | void
    ? EventName
    : never;
}[keyof TConfig];

export type RemitterDisposer = () => void;

export type RemitterEventNames<TConfig> = keyof TConfig;

export type RemitterListener<
  TConfig,
  TEventName extends RemitterEventNames<TConfig> = RemitterEventNames<TConfig>,
> = (eventData: TConfig[TEventName]) => void;

export type RemitterConfigInternal<TConfig> = TConfig & {
  [name in ANY_EVENT]: AnyEventData<TConfig>;
};

export type RemitterListenerInternal<
  TConfig,
  TEventName extends RemitterEventNames<
    RemitterConfigInternal<TConfig>
  > = RemitterEventNames<RemitterConfigInternal<TConfig>>,
> = (eventData: RemitterConfigInternal<TConfig>[TEventName]) => void;
