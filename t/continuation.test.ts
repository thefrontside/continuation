import { describe, it } from "./bdd.ts";
import { assertEquals } from "./asserts.ts";
import { Computation, evaluate, K, reset, shift } from "../mod.ts";

describe("continuation", () => {
  it("evaluates synchronous values synchronously", () => {
    assertEquals(
      5,
      evaluate(function* () {
        return 5;
      }),
    );
  });

  it("evaluates synchronous shifts synchronously", () => {
    assertEquals(
      5,
      evaluate(function* () {
        yield* shift(function* () {
          return 5;
        });
      }),
    );
  });

  it("each continuation point function only resumes once", () => {
    let beginning, middle, end;
    let next = evaluate<K<string, K<number>>>(function* () {
      beginning = true;
      middle = yield* shift(function* (k) {
        return k;
      });
      end = yield* shift<number>(function* (k) {
        return k;
      });
      return end * 10;
    });

    assertEquals(true, beginning);
    assertEquals(undefined, middle);

    let last = next("reached middle");
    assertEquals("reached middle", middle);
    assertEquals(undefined, end);
    assertEquals("function", typeof last);

    let second = next("continue");
    assertEquals("reached middle", middle);
    assertEquals(undefined, end);
    assertEquals(last, second);

    let result = last(10);
    assertEquals(10, end);
    assertEquals(100, result);

    let result2 = last(100);
    assertEquals(10, end);
    assertEquals(100, result2);
  });

  it("each continuation point only fails once", () => {
    let bing = 0;
    let boom = evaluate<K<void>>(function* () {
      yield* shift(function* (k) {
        return k;
      });
      throw new Error(`bing ${++bing}`);
    });

    try {
      boom();
    } catch (e) {
      assertEquals("bing 1", e.message);
    }
    try {
      boom();
    } catch (e) {
      assertEquals("bing 1", e.message);
    }
  });

  it("can exit early from  recursion", () => {
    function* times([first, ...rest]: number[]): Computation<number> {
      if (first === 0) {
        return yield* shift(function* () {
          return 0;
        });
      } else if (first == null) {
        return 1;
      } else {
        return first * (yield* times(rest));
      }
    }

    assertEquals(0, evaluate(() => times([8, 0, 5, 2, 3])));
    assertEquals(240, evaluate(() => times([8, 1, 5, 2, 3])));
  });

  it("returns the value of the following shift point when continuing ", () => {
    let { k } = evaluate<{ k: K }>(function* () {
      let k = yield* reset(function* () {
        let result = yield* shift(function* (k) {
          return k;
        });
        yield* shift(function* () {
          return result * 2;
        });
      });
      return { k };
    });
    assertEquals("function", typeof k);
    assertEquals(10, k(5));
  });
});
