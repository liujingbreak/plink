var Markdown = require('markdown-it');
var hljs = require('highlight.js');
//const api = require('__api');
const log = require('log4js').getLogger('wfh.markdown-loader');

module.exports = function(content, map) {
	var callback = this.async();
	if (!callback)
		return load(content, this);
	loadAsync(content, this)
	.then(result => callback(null, result, map))
	.catch(err => callback(err));
};

function load(content, loader) {
	return compileMarkdown(content, loader);
}

function loadAsync(content, loader) {
	try {
		return Promise.resolve(load(content, loader));
	} catch (e) {
		log.error(e);
		loader.emitError(e);
		return Promise.reject(e);
	}
}

var mk = new Markdown({
	html: true,
	highlight(str, lang) {
		if (lang && hljs.getLanguage(lang)) {
			try {
				return hljs.highlight(lang, str, true).value;
			} catch (__) {}
		}
		return ''; // use external default escaping
	}
});

function compileMarkdown(text) {
	var html = mk.render(text);
	return html;
}
