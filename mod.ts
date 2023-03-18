// deno-lint-ignore-file no-explicit-any

interface Thunk<V = unknown> {
  method: "next" | "throw";
  iterator: Iterator<Control, unknown, unknown>;
  value?: V | Error;
}

interface Stack {
  reducing: boolean;
  list: Thunk[];
}

export interface Computation<T = any, C = Control> {
  [Symbol.iterator](): Iterator<C, T, any>;
}

export interface Continuation<T = any, R = any> {
  (value: T): R;
  tail(value: T): void;
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
  let stack: Stack = {
    reducing: false,
    list: [
      {
        method: "next" as const,
        iterator: iterator()[Symbol.iterator](),
      },
    ],
  };
  return reduce(stack);
}

function reduce<T>(stack: Stack): T {
  let value: any;
  let current = stack.list.pop();

  while (current) {
    let prog = current;
    try {
      let next = getNext(prog);
      value = next.value;

      if (!next.done) {
        let control = next.value;
        if (control.type === "reset") {
          stack.list.push(
            {
              ...current,
              method: "next",
              get value() {
                return value;
              },
            },
            {
              method: "next",
              iterator: control.block()[Symbol.iterator](),
            },
          );
        } else {
          let thunk = current;
          let resolve = oneshot((v: unknown) => {
            stack.list.push({
              method: "next",
              iterator: thunk.iterator,
              value: v,
            });
            return reduce(stack);
          });
          resolve.tail = oneshot((value: unknown) => {
            stack.list.push({
              method: "next",
              iterator: prog.iterator,
              value,
            });
            if (!stack.reducing) {
              stack.reducing = true;
              reduce(stack);
            }
          });
          let reject = oneshot((error: Error) => {
            stack.list.push({
              method: "throw",
              iterator: prog.iterator,
              value: error,
            });
            return reduce(stack);
          });
          reject.tail = oneshot((error: Error) => {
            stack.list.push({
              method: "throw",
              iterator: prog.iterator,
              value: error,
            });

            if (!stack.reducing) {
              stack.reducing = true;
              reduce(stack);
            }
          });

          stack.list.push({
            method: "next",
            iterator: control.block(resolve, reject)[Symbol.iterator](),
            value: void 0,
          });
        }
      }
    } catch (error) {
      let top = stack.list.pop();
      if (top) {
        stack.list.push({ ...top, method: "throw", value: error });
      } else {
        throw error;
      }
    } finally {
      current = stack.list.pop();
    }
  }

  stack.reducing = false;
  return value;
}

function getNext<V>(thunk: Thunk<V>) {
  let { iterator } = thunk;
  if (thunk.method === "next") {
    return iterator.next(thunk.value as V);
  } else {
    const value = thunk.value as Error;
    if (iterator.throw) {
      return iterator.throw(value);
    } else {
      throw value;
    }
  }
}

function oneshot<T, R>(fn: (t: T) => R): Continuation<T, R> {
  let continued = false;
  let failure: { error: unknown };
  let result: any;

  return ((value) => {
    if (!continued) {
      continued = true;
      try {
        return (result = fn(value));
      } catch (error) {
        failure = { error };
        throw error;
      }
    } else if (failure) {
      throw failure.error;
    } else {
      return result;
    }
  }) as Continuation<T, R>;
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
