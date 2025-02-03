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

export type RemitterConfig<TConfig> = TConfig & {
  [name in ANY_EVENT]: AnyEventData<TConfig>;
};

export type RemitterDatalessEventName<TConfig> = {
  [EventName in keyof RemitterConfig<TConfig>]: RemitterConfig<TConfig>[EventName] extends
    | never
    | undefined
    | void
    ? EventName
    : never;
}[keyof RemitterConfig<TConfig>];

export type RemitterDisposer = () => void;

export type RemitterEventNames<TConfig> = keyof TConfig;

export type RemitterListener<
  TConfig,
  TEventName extends RemitterEventNames<
    RemitterConfig<TConfig>
  > = RemitterEventNames<RemitterConfig<TConfig>>,
> = (eventData: RemitterConfig<TConfig>[TEventName]) => void;
