// deno-lint-ignore-file no-explicit-any

export interface Computation<T = any> {
  [Symbol.iterator](): Iterator<Control, T, any>;
}

export interface Continuation<T = any, R = any> {
  (value: T): R;
}

function* _continue<T>(
  block: (resolve: Continuation<T>, reject: Continuation<Error>) => Computation,
  value?: T,
): Computation<T> {
  return yield { type: "continue", block, value };
}

function* _throw(block: () => Computation, value: Error): Computation<Error> {
  return yield { type: "throw", block, value };
}

export function* reset(block: () => Computation): Computation {
  return yield* _continue(function* (resolve) {
    resolve(undefined);
    yield* block();
  });
}

export function* shift<T>(
  block: (resolve: Continuation<T>, reject: Continuation<Error>) => Computation,
): Computation<T> {
  return yield* _continue<T>(block);
}

export function evaluate<T>(block: () => Computation): T {
  let stack = [block()];
  return reduce(stack);
}

function reduce<T>(initStack: Computation[]): T {
  let stack = [...initStack];
  let value: any;
  let reducing = true;
  let current = stack.pop();
  let getNext = $next();

  while (current) {
    let prog = current[Symbol.iterator]();
    try {
      let next = getNext(prog);
      if (next.done) {
        value = next.value;
      } else {
        let cont = {
          [Symbol.iterator]: () => prog,
        };
        let control = next.value;
        if (control.type === "continue") {
          getNext = (iter) => iter.next(control.value);
          let resolve = oneshot((v: T) => {
            stack.push(_continue(() => cont, v));
            if (reducing) return;
            return reduce(stack);
          });
          let reject = oneshot((v: Error) => {
            stack.push(_throw(() => cont, v));
            if (reducing) return;
            return reduce(stack);
          });
          stack.push(control.block(resolve, reject));
        } else if (control.type === "throw") {
          getNext = $throw(control.value);
          stack.push(cont);
        }
      }
    } catch (error) {
      if (!stack.length) {
        throw error;
      } else {
        getNext = $throw(error);
      }
    } finally {
      current = stack.pop();
    }
  }

  reducing = false;
  return value;
}

function oneshot<T, R>(fn: Continuation<T, R>): Continuation<T, R> {
  let continued = false;
  let result: any;
  return ((value) => {
    if (!continued) {
      continued = true;
      return result = fn(value);
    } else {
      return result;
    }
  }) as Continuation<T, R>;
}

const $next = (value?: any) => (i: Iterator<Control>) => i.next(value);
const $throw = (error: Error) => (i: Iterator<Control>) => {
  if (i.throw) {
    return i.throw(error);
  } else {
    throw error;
  }
};

export type K<T = any, R = any> = Continuation<T, R>;

export type Control<V = any> =
  | {
    type: "continue";
    block(resolve?: Continuation, reject?: Continuation<Error>): Computation;
    value: V | undefined;
  }
  | { type: "throw"; block(): Computation; value: Error };
