var Path = require('path');
var log = require('log4js').getLogger('test.' + Path.basename(__filename));
var _ = require('lodash');
var Promise = require('bluebird');
var helper = require('./webdriverHelper');
var webdriver = require('selenium-webdriver');

module.exports = Page;

function Page(path) {
	if (!(this instanceof Page)) {
		return new Page(path);
	}
	path = path ? path : '';

	this.url = this._urlPrefix + '/' + _.trimStart(path, '/');
	this.elements = {};
	// lazy restart webdriver
	Object.defineProperty(this, 'driver', {
		enumerable: true,
		configurable: true,
		get() {
			return require('./webdriverHelper').driver;
		}
	});
}

Page.prototype = {
	_urlPrefix: null,
	get(path, maxWaitTime) {
		var self = this;
		log.debug('get ' + this.url + (path ? path : ''));
		var getProm = this.driver.get(this.url + (path ? path : ''));
		var bothProm = [getProm, Promise.delay(maxWaitTime ? maxWaitTime : 7000)];
		// Sometimes the page can't finish loading, like trying to connect to google adv
		return Promise.any(bothProm).then(() => {
			log.debug('page loaded');
			//helper.saveScreen(encodeURIComponent(path));
			return self.check();
		});
	},
	/**
	 * check if page is properly renderred
	 * @return {[type]} [description]
	 */
	check(done) {
		var all = [];
		_.forOwn(this.elements, (prop, name) => {
			var proms = Promise.coroutine(function*() {
				if (!prop.required)
					return;
				log.debug('check element : ' + prop.selector);
				var errMsg = 'Page object has a required element "' +
						name + '[' + prop.selector + ']' + '" which is not available';
				yield helper.waitForElement(prop.selector, errMsg, 5000);
				log.debug('  found %s', prop.selector);
				//prop.cache = found; // Do not cache it, it will be stale, http://stackoverflow.com/questions/18225997/stale-element-reference-element-is-not-attached-to-the-page-document
			})()
			.catch(e => {
				log.error('Failed to locate element ', name, ' ', prop.selector, e ? e.stack : '');
				throw new Error(e);
			});
			all.push(proms);
		});
		if (all.length === 0)
			return Promise.resolve();
		return Promise.all(all);
	},

	el(name, cssSelector, isRequired) {
		var css, cache;
		if (cssSelector) {
			return this.addElement(name, cssSelector, isRequired);
		}

		if (!_.has(this.elements, name)) {
			throw new Error('Page element is not defined: ' + name);
		}
		//log.debug('element ' + this.elements[name].selector);
		var el = this.elements[name].cache;
		if (!el) {
			css = this.elements[name].selector;
			cache = this.driver.findElement(webdriver.By.css(css));
			el = this.elements[name].cache = cache;
		}
		return el;
	},

	waitForEl(name) {
		var self = this;
		return helper.waitForElement(this.elements[name].selector)
		.then(() => self.el(name));
	},

	addElement(name, cssSelector, isRequired) {
		this.elements[name] = {
			name,
			selector: cssSelector,
			required: !!isRequired,
			cache: null
		};
		var self = this;
		// Allow to access page elements by property `pageObject[elementName]`
		// as well as `pageObject.el(elementName)`
		Object.defineProperty(this, name, {
			enumerable: true,
			configurable: true,
			get() {
				return self.el(name);
			}
		});
		return this;
	}
};
