// deno-lint-ignore-file no-explicit-any

export interface Block<T = any> {
  [Symbol.iterator](): Iterator<Control, T, any>;
}

export interface K<T = any, R = any> {
  (value: T extends void ? void : T): R;
}

export type Control =
  {
    type: 'shift',
    block(resolve: K, reject: K<Error>): Block
  } |
  {
    type: 'reset',
    block(): Block;
  }

export function* reset<T>(block: () => Block): Block<T> {
  return yield { type: 'reset', block };
}

export function* shift<T>(block: (resolve: K<T>, reject: K<Error>) => Block): Block<T> {
  return yield { type: 'shift', block };
}

export function evaluate<T>(block: () => Block, getNext = $next()): T {
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
        if (control.type === 'reset') {
          stack.push(cont);
          stack.push(control.block())
        } else {
          let resolve: K = oneshot(value => evaluate(() => cont, $next(value)));
          let reject: K<Error> = oneshot(error => evaluate(() => cont, $throw(error)))
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

function oneshot<T, R>(fn: K<T,R>): K<T,R> {
  let continued = false;
  let result: any;
  return value => {
    if (!continued) {
      continued = true;
      return result = fn(value);
    } else {
      return result;
    }
  }
}

const $next = (value?: any) => (i: Iterator<Control>) => i.next(value)
const $throw = (error: Error) => (i: Iterator<Control>) => {
  if (i.throw) {
    return i.throw(error);
  } else {
    throw error;
  }
}
