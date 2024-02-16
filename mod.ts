// deno-lint-ignore-file no-explicit-any

export interface Computation<T> {
  [Symbol.iterator](): Iterator<Control, T, any>;
}

export interface Continuation<T = unknown, R = unknown> {
  (value: T extends void ? void : T): Computation<R>;
}

export type Result<T> = { ok: true; value: T } | { ok?: false; error: Error };

export type Control =
  | {
    type: "shift";
    block(k: Continuation, reject: Continuation<Error>): Computation<unknown>;
  }
  | {
    type: "reset";
    block(): Computation<unknown>;
  }
  | {
    type: "resume";
    result: Result<unknown>;
    iter: Iterator<Control, unknown>;
  };

export function* reset<T>(block: () => Computation<any>): Computation<T> {
  return yield { type: "reset", block };
}

export function* shift<T, R = unknown>(
  block: (
    k: Continuation<T, R>,
    reject: Continuation<Error>,
  ) => Computation<any>,
): Computation<T> {
  return yield { type: "shift", block };
}

export function evaluate<T>(block: () => Computation<unknown>) {
  let stack: Iterator<Control, unknown, any>[] = [];
  let iter = block()[Symbol.iterator]();

  let current = $next(undefined);
  while (true) {
    let result = safe(() => current(iter));
    if (!result.ok) {
      if (stack.length > 0) {
        iter = stack.pop()!;
        current = $throw(result.error);
      } else {
        throw result.error;
      }
    } else {
      let next = result.value;
      if (next.done) {
        if (stack.length > 0) {
          iter = stack.pop()!;
          current = $next(next.value);
        } else {
          return next.value as T;
        }
      } else {
        const control = next.value;
        if (control.type === "reset") {
          stack.push(iter);
          iter = control.block()[Symbol.iterator]();
        } else if (control.type === "shift") {
          const continuation = iter;

          let resolve = oneshot((value: unknown) => ({
            type: "resume",
            iter: continuation,
            result: { ok: true, value },
          }));

          let reject = oneshot((error: Error) => {
            return { type: "resume", iter: continuation, result: { error } };
          });
          iter = control.block(resolve, reject)[Symbol.iterator]();
        } else {
          iter = control.iter;
          let { result } = control;
          current = result.ok ? $next(result.value) : $throw(result.error);
        }
      }
    }
  }
}

function $next(value: unknown) {
  return (iter: Iterator<Control, unknown, unknown>) => iter.next(value);
}

function $throw(error: Error): ReturnType<typeof $next> {
  return (iter) => {
    if (iter.throw) {
      return iter.throw(error);
    } else {
      throw error;
    }
  };
}

function safe<T>(fn: () => T): Result<T> {
  try {
    return { ok: true, value: fn() };
  } catch (error) {
    return { error };
  }
}

function oneshot<TArg, T>(
  fn: (arg: TArg) => Control,
): (arg: TArg) => Computation<T> {
  let computation: Computation<T> | undefined = undefined;

  return function k(arg: TArg) {
    if (!computation) {
      let control = fn(arg);
      let iterator: Iterator<Control, T> = {
        next() {
          iterator.next = () => ({
            done: true,
            value: undefined as unknown as T,
          });
          return { done: false, value: control };
        },
      };
      computation = { [Symbol.iterator]: () => iterator };
    }
    return computation;
  };
}
