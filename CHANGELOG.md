# Changelog

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
