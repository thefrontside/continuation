// deno-lint-ignore-file no-explicit-any

interface Thunk {
  method: "next" | "throw";
  iterator: Iterator<Control, unknown, unknown>;
  value?: unknown | Error;
}

interface Stack {
  reducing: boolean;
  push(...thunks: Thunk[]): number;
  pop(): Thunk | undefined;
  value?: any;
}

export interface Computation<T = any> {
  [Symbol.iterator](): Iterator<Control, T, any>;
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

function createStack(): Stack {
  let list: Thunk[] = [];
  return {
    reducing: false,
    push(...thunks: Thunk[]): number {
      return list.push(...thunks);
    },
    pop(): Thunk | undefined {
      return list.pop();
    },
  };
}

export function evaluate<T>(iterator: () => Computation): T {
  let stack = createStack();
  stack.push({
    method: "next",
    iterator: iterator()[Symbol.iterator](),
  });
  return reduce(stack);
}

function reduce<T>(stack: Stack): T {
  try {
    stack.reducing = true;
    for (let current = stack.pop(); current; current = stack.pop()) {
      try {
        let next = getNext(current);
        stack.value = next.value;

        if (!next.done) {
          let control = next.value;
          if (control.type === "reset") {
            stack.push(
              {
                ...current,
                method: "next",
                get value() {
                  return stack.value;
                },
              },
              {
                method: "next",
                iterator: control.block()[Symbol.iterator](),
              },
            );
          } else {
            let thunk = current;
            let resolve = oneshot((value: unknown) => {
              stack.push({
                method: "next",
                iterator: thunk.iterator,
                value,
              });
              return reduce(stack);
            });
            resolve.tail = oneshot((value: unknown) => {
              stack.push({
                method: "next",
                iterator: thunk.iterator,
                value,
              });
              if (!stack.reducing) {
                reduce(stack);
              }
            });
            let reject = oneshot((error: Error) => {
              stack.push({
                method: "throw",
                iterator: thunk.iterator,
                value: error,
              });
              return reduce(stack);
            });
            reject.tail = oneshot((error: Error) => {
              stack.push({
                method: "throw",
                iterator: thunk.iterator,
                value: error,
              });

              if (!stack.reducing) {
                reduce(stack);
              }
            });

            stack.push({
              method: "next",
              iterator: control.block(resolve, reject)[Symbol.iterator](),
              value: void 0,
            });
          }
        }
      } catch (error) {
        let top = stack.pop();
        if (top) {
          stack.push({ ...top, method: "throw", value: error });
        } else {
          throw error;
        }
      }
    }
  } finally {
    stack.reducing = false;
  }

  return stack.value;
}

function getNext(thunk: Thunk) {
  let { iterator } = thunk;
  if (thunk.method === "next") {
    return iterator.next(thunk.value);
  } else {
    let value = thunk.value as Error;
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
