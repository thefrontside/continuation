import { assertEquals } from "https://deno.land/std@0.129.0/testing/asserts.ts";
import { evaluate, shift, K } from "./mod.ts";

Deno.test("continuation", async (t) => {
  await t.step("evaluates synchronous values synchronously", () => {
    assertEquals(
      5,
      evaluate(function* () {
        return 5;
      }),
    );
  });

  await t.step("evaluates synchronous shifts synchronously", () => {
    assertEquals(
      5,
      evaluate(function* () {
        yield* shift(function* () {
          return 5;
        });
      }),
    );
  });

  await t.step("each continuation point function only resumes once", () => {
    let beginning, middle, end;
    let next = evaluate<K<string, K<number>>>(function*() {
      beginning = true;
      middle = yield* shift(function*(k) {
        return k;
      })
      end = yield* shift<number>(function*(k) {
        return k;
      });
      return end * 10;
    });

    assertEquals(true, beginning);
    assertEquals(undefined, middle);

    let last = next("reached middle");
    assertEquals("reached middle", middle);
    assertEquals(undefined, end);
    assertEquals('function', typeof last);

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
});
