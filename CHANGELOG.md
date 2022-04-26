# Changelog

- migrate from Deno.test to BDD https://deno.com/blog/v1.21#bdd-style-testing

## \[0.1.4]

- now that automatic cross releasing is working for both deno.land/x and
  npmjs.org, this has both release matching the exact same commit.

## \[0.1.3]

- debugging cross release to both deno.land/x and npm, do not use.

## \[0.1.2]

- re-release since npm and deno.land had different versions

## \[0.1.1]

- include README.md in NPM release

## \[0.1.0]

- add support for raising errors within a continuation

## \[0.0.2]

- include sourcemaps for npm distribution
- support iterative evaluation instead of recursive evaluation. This means that
  stacktraces are considerably smaller whenever an evaluation resumes

## \[0.0.1]

- initial release, support for one-shot `evaluate, reset, shift` with no way to
  raise errors
