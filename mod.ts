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

export function evaluate<T>(block: () => Block, done: K = v => v, value?: unknown): T {
  let prog = block()[Symbol.iterator]();
  let next = prog.next(value);
  if (next.done) {
    return done(next.value);
  } else {
    let control = next.value;
    let cont = ({ [Symbol.iterator]: () => prog });
    if (control.type === 'reset') {
      return evaluate(control.block, v => evaluate(() => cont, done, v));
    } else {
      let k: K = oneshot(value => evaluate(() => cont, v => v, value));
      return evaluate(() => control.block(k), done);
    }
  }
}

function oneshot<T, R>(fn: K<T,R>): K<T,R> {
  let call: () => R;

  return (input: T extends void ? void : T) => {
    if (call == null) {
      try {
        let result = fn(input) as R;
        call = () => result
      } catch (error) {
        call = () => { throw error; }
      }
    }
    return call();
  };
}
