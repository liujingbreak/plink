```
 ╦═╗ ╔═╗ ╔═╗  ╦ ╦ ╦ ╦═╗ ╔═╗      ╦ ╔╗╔  ╦ ╔═╗ ╔═╗ ╔╦╗ ╔═╗ ╦═╗ 
 ╠╦╝ ║╣  ║═╬╗ ║ ║ ║ ╠╦╝ ║╣       ║ ║║║  ║ ║╣  ║    ║  ║ ║ ╠╦╝ 
 ╩╚═ ╚═╝ ╚═╝╚ ╚═╝ ╩ ╩╚═ ╚═╝      ╩ ╝╚╝ ╚╝ ╚═╝ ╚═╝  ╩  ╚═╝ ╩╚═
```
# require-injector
![Travis CI](https://travis-ci.org/liujingbreak/require-injector.svg?branch=master)


Injecting and replacing `require()` and `import` statement in both NodeJS and browser side JS or Typescript file via packing tool like Webpack.

When it is used for Node, it is a little bit like [app-module-path](https://www.npmjs.com/package/app-module-path),
when it is used for browser environment JS bundle tool, it is like Webpack `resolve.alias` configuration, but more fine-grained.

You may use it as a simple IoC container, which helps you decouple modules. Or if you just want to replace some third-party package's dependency without doing git-fork and create a whole new package.

> Be aware that Node.js ECMAScript modules is not supported at this moment.

- [Installation](#installation)
- [Node project example](#node-project-example)
	- [Injection for local files](#injection-for-local-files)
	- [No relative path needed in require()](#no-relative-path-needed-in-require)
	- [Injection for Node packages](#injection-for-node-packages)
- [Browserify transform](#browserify-transform)
- [Webpack loader](#webpack-loader)
- [Webpack-like split loading module replacement: `require.ensure()`](#webpack-like-split-loading-module-replacement-requireensure)
- [Replacement](#replacement)
- [Solution for NodeJS and browser environment](#solution-for-nodejs-and-browser-environment)
- [ES6 Import syntax and import async syntax](#es6-import-syntax-and-import-async-syntax)
- [Support as Webapck loader to replace Typescript file](#support-as-webapck-loader-to-replace-typescript-file)
- [Injection for server side Swig template](#injection-for-server-side-swig-template)
- [Injector API](#injector-api)
	- [require('require-injector')( `{object}` opts )](#requirerequire-injector-object-opts-)
		- [Parameters](#parameters)
	- [fromPackage( `{string|array}` nodePackageName, `{function}` resolve, `{object}` opts)](#frompackage-stringarray-nodepackagename-function-resolve-object-opts)
		- [Parameters](#parameters-1)
	- [fromDir( `{string|array}` directory)](#fromdir-stringarray-directory)
		- [Parameters](#parameters-2)
	- [transform(filePath)](#transformfilepath)
	- [injectToFile(`{string}` filePath, `{string}` code, `{object}` ast)](#injecttofilestring-filepath-string-code-object-ast)
		- [Parameters](#parameters-3)
	- [cleanup()](#cleanup)
- [Events](#events)
	- ["inject" event](#inject-event)
	- ["replace" event](#replace-event)
	- ["ast" event](#ast-event)
- [FactoryMap API](#factorymap-api)
	- [substitute(`{string|RegExp}` requiredModule, `{string|function}` newModule)](#substitutestringregexp-requiredmodule-stringfunction-newmodule)
		- [Parameters](#parameters-4)
	- [factory(`{string|RegExp}` requiredModule, `{function}` factory)](#factorystringregexp-requiredmodule-function-factory)
		- [Parameters](#parameters-5)
	- [replaceCode(`{string|RegExp}` moduleName, `{string | function}` jsCode)](#replacecodestringregexp-modulename-string--function-jscode)
	- [value(`{string|RegExp}` requiredModule, `{*|function}` value)](#valuestringregexp-requiredmodule-function-value)
		- [Parameters](#parameters-6)
	- [swigTemplateDir(`{string}` packageName, `{string}` dir)](#swigtemplatedirstring-packagename-string-dir)

### Installation
```
npm install require-injector
```


### Node project example

Assume you have project structure like below,
```
/
├─── src
│    ├─── dir1
│    │     ├─── sub-dir
│    │     │      └─── feature1-1.js
│    │     └─── feature1.js
│    └─── dir2
│          └─── feature2.js
├─── app.js
├─── utils
│      └─── index.js
└─── node_modules
      ├─── module1/index.js, package.json, ...
      └─── module2/index.js, package.json, ...
```

#### Injection for local files
In src/dir1/some1.js, there is `require()` calling to `module1`
```js
var m1 = require('module1');
```
You can inject this `require('module1')` with the exports value from `module2`.

In your entry js file app.js:
```js
const Injector = require('require-injector').default;

let rj = new Injector({basedir: __dirname});
rj.fromDir('src/dir1')
  .substitute('module1', 'module2');
```
Or in Typescript
```ts
import Injector from 'require-injector';
let rj = new Injector({basedir: __dirname});
rj.fromDir('src/dir1')
  .substitute('module1', 'module2');

```
From then on, any file `require('module1')` will actually be requiring module2 instead.

Also you can inject it with a value returned from a lazy factory function, or just give a value to it;
```js
rj.fromDir(['src/dir1', 'src/dir2'])
	.factory('module1', function(file) { return something;})
	.value('module2', 123);
```

#### No relative path needed in require()
You may don't need require messy relative path anymore. Image you have a common `utils` always be required by different feature folders. Same effect like [app-module-path](https://www.npmjs.com/package/app-module-path)
```js
// In app.js
const Injector = require('require-injector').default;
let rj = new Injector();
rj.fromDir(['src/dir1', 'src/dir2']).factory('_utils', function() {
	return require('./utils');
});
```
Now you have a common fake module name called `_utils` to be required from dir1,dir2
In dir1/feature1.js
```js
// var utils = require('../utils');
var utils = require('_utils');
```
In dir1/sub-dir/feature1-1.js
```js
// var utils = require('../../utils');
var utils = require('_utils');
```
Since v2.0.0
hierarchical directors setting is supported. Injector setting can be configured on
different level directories, lower level directory's setting takes precedence. 
```js
rj.fromDir('src/dir1')
	.substitute('module1', 'module2');
rj.fromDir('src')
	.substitute('module1', 'module3');
```
All files under `src/dir1` will be injected with 'module2'.
Any of other files from `src/**/*` will be injected with 'module3'.

#### Injection for Node packages
You can setup injection for JS file of specific packages, e.g. module1
```js
...
rj.fromPackage('module1')
	.substitute('module1-dependencyA', 'anotherPackage');
// If module1 is a Browserify package
rj.fromPackage('module1', require('browser-resolve').sync)
    .substitute('module1-dependencyA', 'anotherPackage');
```


### Browserify transform
If you are packing files to browser side by Browserify,
```js
let Injector = require('require-injector').default;
let rj = new Injector({noNode: true});
rj.fromPackage('...')
...
var browserify = require('browserify');
var b = browserify();
b.transform(rj.transform, {global: true});
```
It uses [acorn](https://www.npmjs.com/package/acorn) JavaScript language parser to parse each JS file and replace line of `require("matchedModule")`.
Set `noNode` to `true` to disable injection on NodeJS modules, only work as a replacer.

Browserify from command line
```shell
browserify entry.js --global-transform
 [ require-injector/transform --inject inject.js ]
```
`inject.js` is where you initialize require-injector settings
```js
var rj = require('require-injector').getInstance({noNode: true});

rj.fromDir('folderA')
	.value('moduleX', 'anotherPackage')
	.factory('moduleY', function() {return something;})
	.substitute('moduleZ', 'anotherPackage');

rj.fromPackage('moduleB')
	...
```

### Webpack loader
> Requires Webpack version above 2.0

The whole module is a Webpack loader, you can use it in `webpack.config.js`.
Consider it as more advanced solution for Webpack `resolve.alias` option.

e.g. You want to resolve `jquery` to `zepto` only for a part of source code.

Also we provide a `css-loader` to replace "import" syntax:
- `@import "npm://<package>/path"`
- `@import "~<package>/path"`
- LESS like `@import (reference | ...)` syntax
But only work for `.substitute()`, `.alias()` to replace dependency, and `replaceCode(<package>, '')` to delete dependency. 

```js
var browserInjector = rj({noNode: true});
browserInjector.fromDir('src/mobile').substitute('jquery', 'zepto');
module.exports = {
  ...
  module: {
    rules: [
      {
        test: /\.js$/,
        use: [{loader: 'require-injector', options: {injector:  browserInjector}],
        parser: {
          amd: false
          // Currently we only support CommonJS style, so you need to disable `amd` mode for safe if you don't use AMD.
        }
      },
	  {
		  test: /\.css$/,
		  use: [
			  ...
			  {loader: 'require-injector/css-loader', options: {
								injector: browserInjector
			  }}
		  ]
	  }
  }
};
```

### Webpack-like split loading module replacement: `require.ensure()`
`.substitute()` works for call expression like `require.ensure()`\
Injection setup in gulp script for Webpack like below,
```js
rj({noNode: true, basedir: __dirname});
rj.fromDir('dir1').substitute('replaceMe', 'module1');
```
In browser side file
```js
require.ensure(['replaceMe', 'module2'], function() {
	....
})
```
will be replaced to
```js
require.ensure(['module1', 'module2'], function() {
	....
})
```


### Replacement
You can write your own replacement function for Browserify or Webpack, just call `.injectToFile()`,
```js
var fs = require('fs');
var code = fs.readFileSync(filePath, 'utf8');
var replacedCode = rj.injectToFile(filePath, code);
fs.writeFileSync(filePath, replacedCode);
```

<a name="solution-for-nodejs-and-browser-environment"></a>
### Solution for NodeJS and browser environment
- For NodeJS, the injector kidnaps Node's native API `Module.prototype.require()`, so that each `require()` call goes to injector's control, it returns injecting value according to callee file's id (file path).

- For browsers, if you are packing your code by any tool like Browsersify and Webpack, this module plays a role of `tranform`, `loader` or `replacer`, parsing JS code and replacing `require()` expression with stringified injecting value.

You can even create 2 instances, one for Node injection, another for browser side replacement, so they don't interfere each other.
```js
// Node injection
var rj = require('require-injector');
var rjNode = rj();
rjNode.fromPackage('feature1')
	.substitute('dependency1', 'module1');

var rjReplace = rj({noNode: true});
rjReplace.fromPackage('feature2')
	.substitute('dependency2', 'module2');

```

### ES6 Import syntax and import async syntax
Since v3.0.0, it also supports replacing **import** syntax to work with Webpack2, you no longer need to use babel to translate **import** syntax to `require()` before require-injector kicks in, which is also for enabling Webpack tree-shaking function.
```
import defaultMember from "module-name";
import * as name from "module-name";
import { member } from "module-name";
import { member as alias } from "module-name";
import { member1 , member2 } from "module-name";
import { member1 , member2 as alias2 , [...] } from "module-name";
import defaultMember, { member [ , [...] ] } from "module-name";
import defaultMember, * as name from "module-name";
import "module-name";
```
Even asyc import syntax `import("module-name")`

### Support as Webapck loader to replace Typescript file
You can either put this loader either behide or before babel loader, it can recoganize

### Injection for server side Swig template
We also extend injection function to resource type other than Javascript, if you are using server side Swig template engine,
this injector can work with [swig-package-tmpl-loader injection](https://www.npmjs.com/package/swig-package-tmpl-loader#injection)


### Injector API
#### require('require-injector')( `{object}` opts )
Must call this function at as beginning as possible of your entry script.
It kidnaps Node's native API `Module.prototype.require()`, so every `require()`
call actually goes to its management.
##### Parameters
`opts`: optional, global options:

- `opts.basedir`: `{string}` default is process.cwd(), used to resolve relative path in `.fromDir(path)`
- `opts.resolve`: `{function(id)}`, default is[reolve](https://www.npmjs.com/package/resolve)`.sync`, you may also use Node API `require.resolve` or [browser-resolve](https://www.npmjs.com/package/browser-resole)`.sync`
- `opts.resolveOpts`:  `{object}`  set a global [resolve](https://www.npmjs.com/package/resolve) options which is for `.fromPackage(path, opts)`
- `noNode`: `{boolean}`  default is false, if you only use it as a replacer like Browserify's transform or Webpack's loader, you don't want injection work on NodeJS side, no kidnapping on `Module.prototype.require`, just set this property to `true`. And this will turn default `opts.resolve` to `require('browser-resolve').sync`.
- `opts.debug`: `{boolean}` if true, log4js will be enabled to print out logs


#### fromPackage( `{string|array}` nodePackageName, `{basedir: string}` opts)
Adding one or multiple packages to injection setting, all files under this package's directory will be injectable. This function calls `.fromDir()` internally.
##### Parameters
- `nodePackageName`: Node package's name or array of multiple package names

- `opts`: optional, `{basedir}` default is current directory `process.cwd()`, lookup package from `basedir/node_modules/<pkg>, basedir/../node_modules/<pkg>, ...`,

Underneath, it uses [resolve](https://www.npmjs.com/package/resolve) to locate package's root directory, which mean it could not only be a Node package, but also a _Browser_ side package which has a "`browser`" property instead of "`main`" property in package.json, you may use [browserResolve](https://www.npmjs.com/package/browser-resolve).sync instead of [resolve](https://www.npmjs.com/package/resolve).

_returns_ chainable FactoryMap

#### fromDir( `{string|array}` directory)
Adding one or multiple directories to injection setting, all files under this directory will be injectable.
> The internal directory list are sorted and can be binary searched when `Module.prototype.require()` is called against each file. So the performance of dynamic injection should be not bad

##### Parameters
- `directory`: if this is a relative path, you must call `requireInjector({basedir: rootDir})`
	to tell a base directory
_returns_ chainable FactoryMap

#### transform(filePath)
A Browserify JS file transform function to replace `require()` expression with proper injection.
```js
// add to Browserify as a transform
browserify.transform(rj.transform, {global: true});
```
_returns_ through-stream

#### injectToFile(`{string}` filePath, `{string}` code, `{object}` ast)
Here "inject" is actually "replacement".
Parsing a matched file to Esprima AST tree, looking for matched `require(module)` expression and replacing them with proper values, expression.
##### Parameters
- `filePath`: file path
- `code`: content of file
- `ast`: optional, if you have already parsed code to[esrima](https://www.npmjs.com/package/esprima) AST tree with `{range: true}` option, pass it to this function which helps to speed up process by skip parsing again.

_returns_ replaced source code, if there is no injectable `require()`, same source code will be returned.

#### cleanup()
Remove all packages and directories set by `.fromDir()` and `.fromPackage()`, also release `Module.prototype.require()`, injection will stop working.

### Events
require-injector extends Node `Events` module.

#### "inject" event
Emitted when a Node module is matched to be injected with something.
```js
rj.on('inject', moduleId => {});
```

#### "replace" event
Emitted when `injectToFile` is called on injector.
```js
rj.on('replace', (moduleName: string, replacement: string) => {});
```
#### "ast" event
In replacement mode, requir-injector use Acorn or Typescript engine to parse JS/JSX, TS/TSX file into AST object, if you want to reuse this AST object, add listerner to this event

### FactoryMap API

#### substitute(`{string|RegExp}` requiredModule, `{string|function}` newModule)
Or
`alias(requiredModule, newModule)`

Replacing a required module with requiring another module.
> Also support `npm://package` reference in Swig template tags `include` and `import`,
check this out [swig-package-tmpl-loader injection](https://www.npmjs.com/package/swig-package-tmpl-loader#injection)

> It works very like **Webpack**'s `resolve.alias`,
it also matches module name which is consist of node package name and specific path

e.g.
When injector is configured as
```js
rj.fromDir('.').alias('moduleA', 'moduleB');
```
Then the file contains `require('moduleA/foo/bar.js')` will be replaced with `require('moduleB/foo/bar.js')`



##### Parameters
- `requiredModule`: the original module name which is required for, it can't be relative file path, only supports absolute path, a package name or Regular Expression.
	> Package name like `lodash/throttle` also works, as long as it can be resolved to same absolute path all the time.

- `newModule`: the new module name that is replaced with.\
If `newModule` is a function, it will be passed in 2 parameters: `sourceFilePath` and `regexpExecResult`, and must return string value of replaced module name.


_returns_ chainable FactoryMap

#### factory(`{string|RegExp}` requiredModule, `{function}` factory)
Replacing a required module with a function returned value.
> Not work for `require.ensure()`

##### Parameters
- `requiredModule`: the original module name which is required for, it can't be a relative file path.
- `factory`: A function invoked with 1 argument: `sourceFilePath` and returns a value which then will replace the original module of `requiredModule`.

	**Note**: In browser side replacement mode, it replaces entire `require('requiredModule')` expression in source code with Immediately-Invoked Function Expression (IIFE) of the factory function`.toString()`:
	```js
	// require('requiredModule'); ->
	'(' + factory.toString() + ')(sourceFilePath, regexpExecResult)';
	```
	> In replacement mode, parameter `sourceFilePath` will be null by default, since this would expose
	original source file path of your file system, if you still want to obtain `sourceFilePath`, set option `.enableFactoryParamFile`
	to `true`

	The factory eventually stands in source code, not NodeJS runtime.
	Thus you can not have any reference to any closure variable in factory function.


_returns_ chainable FactoryMap

#### replaceCode(`{string|RegExp}` moduleName, `{string | function}` jsCode)
Arbitrary JS code replacement
> Only work in replacement mode, not NodeJs side

```ts
import Injector from 'require-injector';
var rjReplace = new Injector({noNode: true});
rjReplace.fromPackage([packageA...])
	.replaceCode('foobar', JSON.stringify({foo: 'bar'}));
```
In which "`var foobar = require('foobar');"` is replaced with:
```ts
var  foobar = {"foo": "bar"};
```

#### value(`{string|RegExp}` requiredModule, `{*|function}` value)
Replacing a required module with any object or primitive value.
> Not work for `require.ensure()`

##### Parameters
- `requiredModule`: the original module name which is required for, it can't be a relative file path.
- `value`: the value to replace `requiredModule` exports.

	When `.injectToFile()` is called or `.transform` is used for Browserify, meaning it is not a Node environment, the solution is actually replacing entire `require('requiredModule')`‘’ expression with result of `JSON.stringify(value)`.

	Sometimes, the value is variable reference,
	you wouldn't want `JSON.stringify` for it, you can use an object expression:
	- `{string}` `value.replacement`: The replaced string literal as variable expression, same as what `.replaceCode()` does.
	- `{object}` `value.value`: Node require injection value
	```js
	rj.fromDir('dir1')
	.value('replaceMe', {
		replacement: 'window.jQuery', // for Browserify transform
		value: cheerio   // for Node require() injection
	})
	```
	If `value` is a function, it will be passed in 2 parameters: `sourceFilePath` and `regexpExecResult`, and must return some value.

_returns_ chainable FactoryMap

#### swigTemplateDir(`{string}` packageName, `{string}` dir)
Replace `npm://package` reference in Swig template tags `include` and `import`,
check this out [swig-package-tmpl-loader injection](https://www.npmjs.com/package/swig-package-tmpl-loader#injection)

-----
Now you can require some cool fake module name in your code, and inject/replace them with the real package or value later.

All have been covered by tests.

Anyone willing to contribute for Webpack loader will be very welcome.
