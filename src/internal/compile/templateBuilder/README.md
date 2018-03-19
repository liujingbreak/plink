Template Builder
=========

- [Compile template in server side in compilation phase. (vs Server side runtime rendering)](#compile-template-in-server-side-in-compilation-phase-vs-server-side-runtime-rendering)
- [Which kind of files will be considered as templates](#which-kind-of-files-will-be-considered-as-templates)
- [Ouput multiple files](#ouput-multiple-files) (New!)

> We replaced swig with [swig-templates](https://www.npmjs.com/package/swig-templates) as its successor.

Under the hood, this is just a transform plugin for Browserify.


### Compile template in server side in compilation phase. (vs Server side runtime rendering)

If you have some initial pages contains configurable data, or your web app runs on pure static CDN stack, you can pre-compile view template during build phase.

As long as your data is not so much dynamic like fetching from database and result changes based on per request, you may consider giving up server side runtime rendering like calling express's  `request.render()`. With no runtime rendering
involve, your compiled HTML file can be served by CMS, CDN to be accelerated.

Setup package.json
-----------
First of all, the package must act as a Browser side package,
package.json
```json
{
	...
	"browser": "browser.js",
	"main": "server.js"
}
```
Not matter what content `browser.js` has, it could be empty file, but the file must exist,
so that Browserify builder can consider this package as compile target.

Set Local variables for template file
-----------
Under the hood, there is a *Swig* template engine runs as a Browserify transform.

Your package's main node entry JS file `server.js`
```js
exports.onCompileTemplate = function(relativeHtmlFilePath, swig) {
	var locals = getLocalVariablesForFile(relativeHtmlFilePath);
	return locals ? { locals: locals } : null;
	// return null has same effect as returning {locals: {}}
	// or a promise
	return Promise.resolve({locals: locals});
};
```
Exports object contains a function type property `onCompileTemplate` as compiling handler.

- Parameter `relativeHtmlFilePath` is a package relative path of that template file. If you put file in
	```
		<package-folder>/view/index.html
	```
	you got `relativeHtmlFilePath` value equals `"view/index.html"`.

- Parameter `swig` is swig instance, just in case you want to do something to it.

That function returns a Swig options object, which will be passed to `swig.render(templateContent, swigOptions)`.

You html template file maybe like:

```html
<div>
 {= localVariable =}
</div>
```
Yes, default Swig options is
```javascript
{
	"varControls": ['{=', '=}'],
	"filename": <absolute file path>
}
```
You may override any options by the returned value from `onCompileTemplate()`, check out [Swig doc](http://paularmstrong.github.io/swig/docs/api/#render).

If your `onCompileTemplate()` returns falsy value like `null`, then that specific file will be skipped.

## Which kind of files will be considered as templates
- File extension name is '.html'
- In Browserify dependency graph, meaning it is `require('xxx.html')` in browser side JS file
- The file you configured as `"dr"."entryPage"` in package.json
 > `"dr"."entryView"` file will not be considered as compilation template, because it is already as express server side rendering template, so no need to do one more round compiling.

Global predefined Swig variable and utility function
-----------
- `__api` All compile-time API is availabe through this.
e.g. Display config.yaml property via API
```
{= __api.config().someProperty =}
```
- `__renderFile(filePath)` unlike swig "include" tag, it accept a variable as `filePath`
```
{% set toRenderFile = "npm://package-name/path/name" %}
{= __renderFile(toRenderFile) =}
```

## Ouput multiple files
Some times we need to generate mutiple files HTML files based on one html template source file.

Assume you have a source HTML file `index.html`, you want to compile it and output 3 more files: `pages/index-page1.html`, `pages/index-page2.html`, `pages/index-page3.html`

```js
exports.onCompileTemplate = function(relativeFilePath, swig) {
	var locals;
	switch (relativeFilePath) {
		case 'index.html':
			return {
				locals: {...},
				emitFiles: [
					'pages/index-page1.html',
					'pages/index-page2.html',
					'pages/index-page3.html'
				]
			};
		case 'pages/index-page-1.html':
			return {
				locals: {...}
			}
		case 'pages/index-page-2.html':
			return {
				locals: {...}
			}
		case 'pages/index-page-3.html':
			return {
				locals: {...}
			}
	}
};
```
You return object with `emitFiles` property when the `relativeFilePath` is the source template file.

> The files path in `emitFiles` are relative to source template file. All output files are considered as `"entryPage"` of that component package.


Configure Swig
-----------
If you want to set filter to Swig or call some other API on swig before compiling starts.

Create a package, set its package.json `"dr.builderPriority"`'s value to "`before @dr/templateBuilder`".

```json
	dr: {
		"type": "builder",
		"builderPriority": "before @dr/template-builder"
	}
```

And the main entry file is like:

```javascript
exports.compile = function() {
	var swig = require('@dr/template-builder').swig;
	// or require('swig')
	// Do things to swig instance
}
```
Now you can manipulate Swig [swig-templates](https://github.com/node-swig/swig-templates) instance.
