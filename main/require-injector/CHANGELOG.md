### v5.3.3
Move to monorepo, delete problematic package-lock.json

### v5.3.2
Move obsolete @types/webpack to devDependencies to avoid being installed
Remove useless files
### v5.3.1
Remove cache directory from package
### v5.3.0
Remove old dependencies to eliminate warnning message for NPM v7.x
### v5.2.1
Remove `@types/jasmine` from dependencies, since it is conflict with Jest for many React projects.
### v5.2.0
Webpack loader is re-written with TS, provide few more useful loader `options` parameters.

A new function `changeTsCompiler(ts: typeof import('typescript'))` on Injector

## v5.0.0
Rewrite all functional script with Typescript, fully support Typescript user.

**Breaking changes**
- The way to get Injector instance.
```js
const Injector = require('require-inject').default;
new INjector().on('inject', moduleId => {});

```
or Typescript

```js
import Injector from 'require-inject';
new INjector().on('inject', moduleId => {});
```

### 5.1.0
Use Typescript 3.2.x to parse all JS, JSX files, acorn is no longer used.

### 5.1.1
Enable TS compiler option "strictNullCheck" for better quality.

### 5.1.3
Support Replacing Typescript source code export statement, e.g. `export * as foobar from "To-be-replaced";`

### 5.1.4
Bug fix: Incorrect TS type definition for FactoryMapInterf.factory() function

### 5.1.5
- Bug fix: Incorrect TS type definition for FactoryMapInterf.factory() function, return type should be `any` not `string`

- New function `.fromRoot()`
### 5.1.6
- Remove acorn from dependencies, use Typescript compiler instead
  
## v4.0.0
### Support Typescript file replacement
When work with webpack as a loader for '.ts', '.tsx' file , you may put it even before ts-loader.

### 4.2.2
Rewrite lib/dir-tree.js in Typescript


