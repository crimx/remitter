interface TryCall {
  <TReturn = void, TArg = any>(fn: (arg: TArg) => TReturn, arg: TArg):
    | TReturn
    | undefined;
  <TReturn = void>(fn: () => TReturn): TReturn | undefined;
}

export const tryCall: TryCall = <TReturn = void, TArg = any>(
  fn: (arg?: TArg) => TReturn,
  arg?: TArg
): TReturn | undefined => {
  try {
    return fn(arg);
  } catch (e) {
    console.error(e);
  }
};

export const noop = () => {
  /* empty */
};
