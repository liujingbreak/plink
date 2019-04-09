var webdriver = require('selenium-webdriver');
var Path = require('path');
var _ = require('lodash');
var log = require('log4js').getLogger('test.' + Path.basename(__filename));
var request = require('request');
var Promise = require('bluebird');
var fs = require('fs');
var fork = require('child_process').fork;
var basePage = require('./basePage');

var isWindows = process.platform.indexOf('win32') >= 0;
var driver, config, urlPrefix;
var WAIT_TIMEOUT = 10000;
var browser = 'firefox'; // default is firefox

// lazy restart webdriver and make it singleton
Object.defineProperty(exports, 'driver', {
	enumerable: true,
	configurable: true,
	get() {
		ensureDriver();
		return driver;
	}
});

exports.driver = driver;
exports.waitForServer = waitForServer;
exports.waitForServerStart = waitForServerStart;
exports.run = run;
exports.wait = wait;
exports.waitForElement = waitForElement;
exports.waitAndFind = waitAndFind;
/**
 * @param  {function} theConfig  config object
 * @param  {string} browser
 * @param {string} serverModule server file
 * @param {string} cwd in which start server
 * @param  {function} runTest   Start your jasmine test in this callback, must return Promise
 * @return {Promise}
 */
function run(theConfig, browser, serverModule, cwd, runTest) {
	config = theConfig;
	if (config.get('e2etestHelper.selenium.driverPath'))
		process.env.PATH = process.env.PATH + (isWindows ? ';' : ':') + Path.resolve(config.resolve('e2etestHelper.selenium.driverPath'));
	log.debug(process.env.PATH);
	var target = config.get('e2etestHelper.target');
	if (target)
		exports.urlPrefix = urlPrefix = target;
	else if (config.get('ssl.enabled')) {
		exports.urlPrefix = urlPrefix = 'https://localhost:' + config().ssl.port;
	} else {
		exports.urlPrefix = urlPrefix = 'http://localhost:' + config().port;
	}
	WAIT_TIMEOUT = config.get('e2etestHelper.waitTimeout', 10000);
	// `basePage` relies on `urlPrefix`
	exports.basePage = basePage;
	basePage.prototype._urlPrefix = urlPrefix;

	setBrowser(browser);
	var serverProcess;
	var serverStopProm = Promise.resolve();
	if (serverModule) {
		serverModule = Path.resolve(serverModule);
		log.info('start server ' + serverModule);
		var workDir = cwd ? Path.resolve(cwd) : process.cwd();
		serverProcess = fork(serverModule, {cwd: workDir});

		serverStopProm = new Promise((resolve, reject) => {
			serverProcess.on('exit', (code, signal) => {
				log.info('server exits with ' + code + '-' + signal);
				resolve();
			});
			serverProcess.on('error', err => {
				log.error(err);
				reject('Server encouters error: ' + err);
			});
		});
	}
	return waitForServerStart()
	.then(runTest)
	.catch(err => {
		log.error('Test failure', err);
		throw err;
	})
	.finally(() => {
		teardown();
		if (serverProcess) {
			log.info('stop server');
			serverProcess.kill('SIGINT');
		}
		return serverStopProm;
	});
}

exports.setup = function() {
	beforeAll(startup);
	afterAll(() => {
		log.debug('Test spec afterall');
		teardown();
	});
	//afterAll(teardown); //Jasmine seems to have a bug: afterAll executed too early for async test case
};

exports.statusCodeOf = function(path) {
	return new Promise((resolve, reject) => {
		if (!_.startsWith(path, '/')) {
			path = '/' + path;
		}
		request(urlPrefix + path, (error, response, body) => {
			if (error) {
				log.error(error);
				return reject(error);
			}
			resolve(response.statusCode);
		});
	});
};

exports.saveScreen = function(fileName) {
	var file = Path.resolve(config.resolve('destDir'), (fileName ? fileName : 'out.png'));
	driver.takeScreenshot().then(function(data) {
		var base64Data = data.replace(/^data:image\/png;base64,/, '');
		fs.writeFile(file, base64Data, 'base64', function(err) {
			if (err) {
				log.error(err);
			}
		});
	});
};

function ensureDriver() {
	if (!driver) {
		log.info('Browser: ' + browser);
		driver = new webdriver.Builder().forBrowser(browser).build();
	}
}

/**
 * @param func {function|WebElement}
 */
function wait(func, errMsg, timeout) {
	if (_.isFunction(func))
		return driver.wait(new webdriver.until.Condition(errMsg || 'wait() timeout', func),
			timeout || WAIT_TIMEOUT,
			errMsg || 'wait() timeout');
	else {
		return waitForElement(func, errMsg, timeout);
	}
}

function waitForElement(css, errMsg, timeout) {
	var locator = webdriver.By.css(_.isString(css) ? css : css.selector);
	return driver.wait(
		webdriver.until.elementLocated(locator),
		//new webdriver.until.WebElementCondition(errMsg || 'wait() timeout', () => driver.findElement(locator)),
		timeout || WAIT_TIMEOUT,
		errMsg || 'wait() timeout');
}

_.assign(webdriver.WebElement.prototype, {

	waitAndFind(css, timeout) {
		return waitAndFind(this, css, timeout);
	},

	findElementsByCss(css) {
		return this.findElements(webdriver.By.css(css));
	},

	findElementByCss(css) {
		return this.findElement(webdriver.By.css(css));
	}
});

function waitAndFind(parentElPromise, css, timeout) {
	return Promise.coroutine(function*() {
		var parent = yield Promise.resolve(parentElPromise);
		var children;
		try {
			yield wait(() => {
				return parent.findElements(webdriver.By.css(css))
				.then(els => {
					if (els && els.length > 0) {
						children = els;
						return true;
					}
					return false;
				});
			}, 'no-elements', timeout);
		} catch (e) {
			if (e.message.indexOf('no-elements') >= 0)
				return [];
			throw e;
		}
		return children;
	})();
}


function startup() {
	ensureDriver();
	log.debug('test case startup');
	jasmine.DEFAULT_TIMEOUT_INTERVAL = 10 * 1000;
}

function teardown(done) {
	log.debug('test case teardown');
	if (driver) {
		log.info('driver close');
		driver.close();
		driver.quit();
		driver = null;
		if (done) {
			done();
		}
	} else {
		if (done) {
			done();
		}
	}
}

function setBrowser(name) {
	name = name ? name : 'firefox';
	log.debug('set browser ' + name);
	browser = name;
}

function waitForServerStart() {
	var tryCount = 1;
	log.debug('wait for server starting');//setTimeout(done, WAIT_TIMEOUT);

	return new Promise((resolve, reject) => {
		tryConnectServer();
		function tryConnectServer() {
			if (tryCount > config.get('e2etestHelper.connectionTryCount', 15)) {
				reject('Server is not available');
				return;
			}
			tryCount++;
			log.debug('try to connect to server for times: ' + tryCount);
			setTimeout(() => {
				request({
					url: config.get('e2etestHelper.target') || ('http://localhost:' + config().port),
					timeout: 10000
				}, (error, response, body) => {
					if (error) {
						if (error.code === 'ECONNREFUSED') {
							tryConnectServer();
						} else {
							log.error(error);
							reject('Server is not available');
							return;
						}
					} else {
						resolve();
					}
					if (response) {
						log.debug(response.statusCode);
					}
				});
			}, 1000);
		}
	});
}
/**
 * @Deprecated
 * This function is used in test spec;
 */
function waitForServer(done) {
	var tryCount = 1;
	log.debug('wait for server starting');//setTimeout(done, WAIT_TIMEOUT);
	tryConnectServer(done);

	function tryConnectServer(done) {
		if (tryCount > config.get('e2etestHelper.tryConnectTimes', 15)) {
			done.fail('Server is not available');
			return;
		}
		tryCount++;
		log.debug('try to connect to server for times: ' + tryCount);
		setTimeout(() => {
			request(config.get('e2etestHelper.target') || ('http://localhost:' + config().port), (error, response, body) => {
				if (error) {
					if (error.code === 'ECONNREFUSED') {
						tryConnectServer(done);
					} else {
						log.error(error);
						done.fail('Server is not available');
						return;
					}
				} else {
					done();
				}
				if (response) {
					log.debug(response.statusCode);
				}
			});
		}, 1000);
	}
}
