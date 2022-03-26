import { K, evaluate, reset, shift } from '../mod.ts';
import { assertThrows, assertObjectMatch, assertEquals } from './asserts.ts';
const { test } = Deno;

test("error is raised from evaluate", () => {
  assertThrows(() => evaluate(function*() {
    throw new Error('boom!');
  }), Error, 'boom!');
});

test("error is raised from a reset", () => {
  assertThrows(() => evaluate(function*() {
    yield* reset(function*() {
      throw new Error('boom!');
    })
  }), Error, 'boom!');
});

test("error is raised from a shift", () => {
  assertThrows(() => evaluate(function*() {
    yield* reset(function*() {
      yield* shift(function*() {
        throw new Error('boom!');
      });
    })
  }), Error, 'boom!');
});

test("error can be caught from a shift", () => {
  assertObjectMatch(evaluate(function*() {
    try {
      yield* reset(function*() {
        yield* shift(function*() {
          throw new Error('boom!');
        });
      })
    } catch (error) {
      return error;
    }
  }), { message: 'boom!' });
});

test("raising an error", () => {
  let reject = evaluate<K<Error>>(function*() {
    try {
      yield* shift(function*(_, reject) {
        return reject;
      });
    } catch (error) {
      return { caught: true, error };
    }
  });

  let error = new Error('boom!');

  assertEquals({ caught: true, error }, reject(error));
})

test("raising an error blows up on you if it is not caught", () => {
  let reject = evaluate<K<Error>>(function*() {
    yield* shift(function*(_, reject) {
      return reject;
    });
  });

  assertThrows(() => reject(new Error('boom!')), Error, 'boom!');
});
