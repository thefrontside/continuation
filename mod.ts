// deno-lint-ignore-file no-explicit-any

export interface Computation<T = any> {
  [Symbol.iterator](): Iterator<Control, T, any>;
}

export interface Continuation<T = any, R = any> {
  (value: T): R;
}

export function* reset<T>(block: () => Computation): Computation<T> {
  return yield { type: "reset", block };
}

export function* shift<T>(
  block: (resolve: Continuation<T>, reject: Continuation<Error>) => Computation,
): Computation<T> {
  return yield { type: "shift", block };
}

export function evaluate<T>(block: () => Computation, getNext = $next()): T {
  let stack = [block()];
  let value: any;
  for (let current = stack.pop(); current; current = stack.pop()) {
    let prog = current[Symbol.iterator]();
    try {
      let next = getNext(prog);
      getNext = (iter) => iter.next(value);
      if (next.done) {
        value = next.value;
      } else {
        let cont = ({ [Symbol.iterator]: () => prog });
        let control = next.value;
        if (control.type === "reset") {
          stack.push(cont);
          stack.push(control.block());
        } else {
          let resolve: Continuation = oneshot((value) =>
            evaluate(() => cont, $next(value))
          );
          let reject: Continuation<Error> = oneshot((error) =>
            evaluate(() => cont, $throw(error))
          );
          stack.push(control.block(resolve, reject));
        }
      }
    } catch (error) {
      if (!stack.length) {
        throw error;
      } else {
        getNext = $throw(error);
      }
    }
  }
  return value;
}

function oneshot<T, R>(fn: Continuation<T, R>): Continuation<T, R> {
  let continued = false;
  let failure: { error: unknown };
  let result: any;

  return ((value) => {
    if (!continued) {
      continued = true;
      try {
        return result = fn(value);
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

const $next = (value?: any) => (i: Iterator<Control>) => i.next(value);
const $throw = (error: Error) =>
  (i: Iterator<Control>) => {
    if (i.throw) {
      return i.throw(error);
    } else {
      throw error;
    }
  };

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
