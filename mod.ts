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
    block(k: K): Block
  } |
  {
    type: 'reset',
    block(): Block;
  }

export function* reset<T>(block: () => Block): Block<T> {
  return yield { type: 'reset', block };
}

export function* shift<T>(block: (k: K<T>) => Block): Block<T> {
  return yield { type: 'shift', block };
}

export function evaluate<T>(block: () => Block, value?: any): T {
  let stack = [block()];
  for (let current = stack.pop(); current; current = stack.pop()) {
    let prog = current[Symbol.iterator]();
    let next = prog.next(value);
    if (next.done) {
      value = next.value;
    } else {
      let cont = ({ [Symbol.iterator]: () => prog });
      let control = next.value;
      if (control.type === 'reset') {
        stack.push(cont);
        stack.push(control.block())
      } else {
        let k: K = oneshot(value => evaluate(() => cont, value));
        stack.push(control.block(k));
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
