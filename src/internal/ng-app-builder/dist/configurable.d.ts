/**
```

```
 */
export interface DrcpSetting {
    /**
     * Other than main.ts and polyfill.ts, you need to specify those lazy route module which are
     * not directly referenced in Typescript file, but in Angular's lazy route configrations, so that
     * Typescript compiler can have clue to involve them in compilation.
     *
     * Glob pattern should be relative to repository directory and if it belongs to a DRCP
     * package and is symlink, then use symlink path like `node_modules/<package-name>/.../*.modules.ts`
     */
    tsconfigInclude: string[];
}
