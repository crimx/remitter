import { type Fn } from "./interface";

const isFunction = (value: any): value is Fn =>
  !!(value && value.constructor && value.call && value.apply);

export const isPromise = <T>(value: any): value is Promise<T> =>
  isFunction(value?.then);
