import { evaluate, reset, shift } from "../mod.ts";
import { describe, it } from "./bdd.ts";
import { assertEquals } from "./asserts.ts";

describe("structural guarantees", () => {
  it.ignore("always runs shift points to completion", () => {
    let finallyBlock = false;
    let result = evaluate(function* () {
      yield* shift<void>(function* (k) {
        try {
          return yield* k();
        } finally {
          finallyBlock = true;
        }
      });
      return "Hello World";
    });
    assertEquals(result, "Hello World");
    assertEquals(finallyBlock, true);
  });

  it.ignore("fully executes suspended resets", () => {
    let finales: string[] = [];
    evaluate(function* () {
      yield* reset(function* () {
        try {
          yield* shift(function* () {});
        } finally {
          finales.push("first");
        }
      });

      yield* reset(function* () {
        try {
          yield* shift(function* () {});
        } finally {
          finales.push("second");
        }
      });
    });
    assertEquals(finales, ["first", "second"]);
  });
});
