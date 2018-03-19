Express server
==========

This package contains Express web framework as core package.
Also this package is API provider.

### Supported Express middlewares
You don't need to add following middleware, they have already been onboard.
- #### cookie-parser
- #### body-parser
- #### compression

### new API

New Node API methods
| Name | description
|-- | --
| .router() | return an Express Router object
| .use() | Express use() method, to bind middleware
| .param() | Express param() method
| .expressAppSet(callback) | callback: function(app, express), whatever things you want to do before express's app getting initialized
| .swig | express view engines: `require('swig-template')`
| .express | express instance, so that you can access some express middleware, like `api.express.static`
| .expressApp | the main express app instance used by us, which is value of `express()`
| .cors() | CORS middleware for specific route path, e.g. `api.router().use('/api', api.cors());`
check [setupApi.js](setupApi.js)

Above API methods must be called within `module.exports.activate()` function
e.g.
```javascript
var api = require('__api');

exports.activate = function() {
	api.router().get(function(req, res) {
		res.render('/template.html');
	});
};

```

e.g. expressAppSet(callback)
```js
exports.activate = function(){
 	api.expressAppSet((app, express) => {
 		app.set('trust proxy', true);
		app.set('views', Path.resolve(__dirname, 'web/views/'));
	});
};
```
