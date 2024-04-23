export type {
  RemitterConfig,
  RemitterListener,
  RemitterDisposer,
  RemitterEventNames,
  AllRemitterEventNames,
  AnyRemitterListener,
  AnyEventData,
  RemitterDatalessEventName,
} from "./interface";
export { ANY_EVENT } from "./constants";
export { Remitter, ReadonlyRemitter, type EventReceiver } from "./remitter";
