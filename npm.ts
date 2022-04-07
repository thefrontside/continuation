import { build, emptyDir } from "https://deno.land/x/dnt@0.17.0/mod.ts";

await emptyDir("./npm");

await build({
  entryPoints: ["./mod.ts"],
  outDir: "./npm",
  shims: {
    deno: false,
  },
  test: false,
  typeCheck: false,
  compilerOptions: {
    target: "ES2020",
    sourceMap: true,
  },
  package: {
    // package.json properties
    name: "@frontside/continuation",
    version: "0.1.2",
    description: "Delimited continuations for JavaScript",
    license: "MIT",
    repository: {
      author: "engineering@frontside.com",
      type: "git",
      url: "git+https://github.com/thefrontside/continuation.git",
    },
    bugs: {
      url: "https://github.com/thefrontside/continuation/issues",
    },
    engines: {
      node: ">= 14",
    },
  },
});

await Deno.copyFile("README.md", "npm/README.md");
