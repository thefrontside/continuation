// deno-lint-ignore-file no-explicit-any

interface ThunkNext<V = unknown> {
  method: "next";
  iterator: Iterator<Control, unknown, unknown>;
  value: V;
}

interface ThunkThrow {
  method: "throw";
  caller?: Thunk;
  iterator: Iterator<Control, unknown, unknown>;
  error: Error;
}

type Thunk<V = unknown> = ThunkNext<V> | ThunkThrow;

export interface Computation<T = any, C = Control> {
  [Symbol.iterator](): Iterator<C, T, any>;
}

export interface Continuation<T = any, R = any> {
  (value: T): R;
}

export interface ContinuationTail<T = any, R = any> extends Continuation<T, R> {
  tail(value: T): void;
}

export function $next<V>(
  t: Pick<ThunkNext<V>, "iterator" | "value">,
): Thunk<V> {
  return {
    method: "next",
    ...t,
  };
}

export function $throw(
  t: Pick<ThunkThrow, "iterator" | "error" | "caller">,
): Thunk {
  return {
    method: "throw",
    ...t,
  };
}

export function* reset<T>(block: () => Computation): Computation<T> {
  return yield { type: "reset", block };
}

export function* shift<T>(
  block: (resolve: Continuation<T>, reject: Continuation<Error>) => Computation,
): Computation<T> {
  return yield { type: "shift", block };
}

export function evaluate<T>(iterator: () => Computation): T {
  let stack = [
    $next({ iterator: iterator()[Symbol.iterator](), value: undefined }),
  ];
  return reduce(stack);
}

function reduce<T>(initStack: Thunk[]): T {
  let stack = [...initStack];
  let ferror: any;
  let value: any;
  let reducing = true;
  let current = stack.pop();

  while (current) {
    let prog = current;
    try {
      let next = getNext(prog);
      value = next.value;

      if (!next.done) {
        if (prog.method !== "next") continue;
        let control = next.value;
        if (control.type === "reset") {
          stack.push(
            $next({
              iterator: prog.iterator,
              value: prog.value,
            }),
            $next({
              iterator: control.block()[Symbol.iterator](),
              value: void 0,
            }),
          );
          continue;
        } // implied: now contol.type must be "shift"

        // force prog to be ThunkNext
        if (prog.method !== "next") continue;

        let resolve = oneshot((v: unknown) => {
          stack.push(
            $next({
              iterator: prog.iterator,
              get value() {
                return v;
              },
            }),
          );
          return reduce(stack);
        });
        resolve.tail = oneshot((v: unknown) => {
          stack.push(
            $next({
              iterator: prog.iterator,
              get value() {
                return v;
              },
            }),
          );
          if (!reducing) {
            reduce(stack);
          }
        });
        let reject = oneshot((error: Error) => {
          stack.push(
            $throw({
              iterator: prog.iterator,
              error,
              caller: prog,
            }),
          );
          if (!reducing) {
            return reduce(stack);
          }
        });

        stack.push(
          $next({
            iterator: control.block(resolve, reject)[Symbol.iterator](),
            value: void 0,
          }),
        );
      }
    } catch (error) {
      ferror = error;

      if (prog.method === "next") {
        stack.push(
          $throw({
            iterator: prog.iterator,
            error,
            caller: prog,
          }),
        );
      } else {
        stack.push(
          $next({
            iterator: prog.iterator,
            value: error,
          }),
        );
      }
    } finally {
      current = stack.pop();
    }
  }

  if (ferror) {
    throw ferror;
  }
  reducing = false;
  return value;
}

function getNext(thunk: Thunk) {
  let { iterator } = thunk;
  if (thunk.method === "next") {
    return iterator.next(thunk.value);
  } else {
    if (iterator.throw) {
      return iterator.throw(thunk.error);
    } else {
      throw thunk.error;
    }
  }
}

function oneshot<T, R>(fn: Continuation<T, R>): ContinuationTail<T, R> {
  let continued = false;
  let result: any;
  return ((value) => {
    if (!continued) {
      continued = true;
      return (result = fn(value));
    } else {
      return result;
    }
  }) as ContinuationTail<T, R>;
}

export type K<T = any, R = any> = Continuation<T, R>;

export type Control =
  | {
    type: "shift";
    block(resolve: Continuation, reject: Continuation<Error>): Computation;
  }
  | {
    type: "reset";
    block(): Computation;
  };
