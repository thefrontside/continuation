import { evaluate, K, reset, shift } from "../mod.ts";
import { assertEquals, assertObjectMatch, assertThrows } from "./asserts.ts";
import { describe, it } from "./bdd.ts";

describe("error", () => {
  it("is raised from evaluate", () => {
    assertThrows(
      () =>
        evaluate(function* () {
          throw new Error("boom!");
        }),
      Error,
      "boom!",
    );
  });

  it("is raised from a reset", () => {
    assertThrows(
      () =>
        evaluate(function* () {
          yield* reset(function* () {
            throw new Error("boom!");
          });
        }),
      Error,
      "boom!",
    );
  });

  it("is raised from a shift", () => {
    assertThrows(
      () =>
        evaluate(function* () {
          yield* reset(function* () {
            yield* shift(function* () {
              throw new Error("boom!");
            });
          });
        }),
      Error,
      "boom!",
    );
  });

  it("can be caught from a shift", () => {
    assertObjectMatch(
      evaluate(function* () {
        try {
          yield* reset(function* () {
            yield* shift(function* () {
              throw new Error("boom!");
            });
          });
        } catch (error) {
          return error;
        }
      }),
      { message: "boom!" },
    );
  });

  it("can be raised programatically from a shift", () => {
    let reject = evaluate<K<Error>>(function* () {
      try {
        yield* shift(function* (_, reject) {
          return reject;
        });
      } catch (error) {
        return { caught: true, error };
      }
    });

    let error = new Error("boom!");

    assertEquals({ caught: true, error }, reject(error));
  });

  it("blows up the caller if it is not caught inside the continuation", () => {
    let reject = evaluate<K<Error>>(function* () {
      yield* shift(function* (_, reject) {
        return reject;
      });
    });

    assertThrows(() => reject(new Error("boom!")), Error, "boom!");
  });
});
