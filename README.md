# Continuation

Delimited continuations for JavaScript


## Synopsis

``` typescript
import { evaluate } from "https://deno.land/x/continuation/mod.ts"

evaluate(function*() {
  for (let i = 5; i > 0; i--) {
    console.log(`${i}...`);
    yield* shift(function*(resume) {
      setTimeout(resume, 1000);
    });
  }
  console.log('blast off!');
});
```

prints:

``` text
5...
4...
3...
2...
1...
blast off!
```
