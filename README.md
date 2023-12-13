# Continuation

[Delimited continuations](https://en.wikipedia.org/wiki/Delimited_continuation) for JavaScript

## Install

- **deno** https://deno.land/x/continuation/mod.ts
- **npm** [@frontside/continuation](https://www.npmjs.com/package/@frontside/continuation)

## Synopsis

```typescript
//deno
import { evaluate } from "https://deno.land/x/continuation/mod.ts";
//npm
import { evaluate } from "@frontside/continuation";

evaluate(function* () {
  for (let i = 5; i > 0; i--) {
    console.log(`${i}...`);
    yield* shift(function* (resume) {
      setTimeout(resume, 1000);
    });
  }
  console.log("blast off!");
});
```

prints:

```text
5...
4...
3...
2...
1...
blast off!
```
