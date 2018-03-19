var api = require('__api');
var request = require('request');
var _ = require('lodash');
var log = require('log4js').getLogger(api.packageName + '.msg');
var logBody = require('log4js').getLogger(api.packageName + '.body');
var Url = require('url');
var chalk = require('chalk');

var countRequest = 0;

var SKIP_RES_HEADERS = [
	'transfer-encoding',
	'content-encoding',
	'cache-control',
	'access-control-allow-origin'
];
var SKIP_RES_HEADERS_SET = SKIP_RES_HEADERS.reduce((set, name) => {
	set[name.toLowerCase()] = true;
	return set;
}, {});

module.exports = doProxy;

/**
 * @param {*} target {string} URL of proxying target
 * @param {*} req {request}
 * @param {*} res {response}
 * @param {*} proxyInstance
 * @param {*} proxyName {string} proxy sub path which should not starts with '/'
 * @return undefined
 */
function doProxy(target, req, res, proxyInstance, proxyName) {
	var requestNum = ++countRequest;

	var toUrl = target + req.url.replace(/\/\//g, '/');
	if (req.method === 'GET')
		toUrl += (req.url.indexOf('?') >= 0 ? '#' : '?') + 'random=' + Math.random();
	// ------------hack begins ------
	var toHeaders = hackHeaders(target, req, requestNum);
	// ----------- hack ends ----------
	let requestDebugInfo = `\n[#${requestNum}] REQUEST ${chalk.yellow(req.method)} ${chalk.cyan(toUrl)}\n` +
	`OriginalUrl: ${req.originalUrl}\n` +
	//`Host: ${req.headers.host}\n` +
	//`request headers: ${JSON.stringify(req.headers, null, 2)}\n` +
	`Hacked header: ${JSON.stringify(toHeaders, null, 2)}\n`;
	// log.info('hacked request headers: \n%s', JSON.stringify(toHeaders, null, 2));
	var opts = {
		url: toUrl,
		method: req.method,
		headers: toHeaders,
		strictSSL: false,
		time: false,
		timeout: 20000,
		// "request" will not automatically do gzip decoding on incomingMessage,
		// must explicitly set `gzip` to true
		gzip: toHeaders['accept-encoding'] && toHeaders['accept-encoding'].indexOf('gzip') >= 0
	};

	return intercept(req, toHeaders, req.body, proxyInstance.mockHandlers, proxyName)
	.then(mockBody => {
		if (mockBody != null) {
			log.info(requestDebugInfo);
			log.info(doBody(req.headers, req.body, opts));
			log.info('Mock response:\n' + chalk.blue(_.isString(mockBody) ? mockBody : JSON.stringify(mockBody)));
			res.status(200).send(mockBody);
		} else {
			return intercept(req, toHeaders, req.body, proxyInstance.reqHandlers, proxyName)
			.then(result => {
				let reqBody = result == null ? req.body : result;
				requestDebugInfo += doBody(req.headers, reqBody, opts);
				return send(opts, requestDebugInfo, requestNum, res);
			})
			.then(data => {
				return intercept(req, data.headers, data.body, proxyInstance.resHandlers, proxyName)
				.then(body => {
					if (body)
						logBody.info(`Hacked Response body:\n${chalk.green(_.isString(body) ? body :
							(Buffer.isBuffer(body) ? 'buffer' : JSON.stringify(body)))}`);
					res.status(data.res.statusCode).send(body == null ? data.body : body);
				});
			});
		}
	})
	.catch(err => {
		log.error(err);
		res.status(500).send(err.message);
	});
}

function send(opts, requestDebugInfo, requestNum, res) {
	return new Promise((resolve, reject) => {
		var bufArray = [];
		request(opts, (err, msg, body) => {
			log.info(requestDebugInfo);
			var responseDebugInfo = `[#${requestNum}] RESPONSE:`;
			if (err) {
				log.error(`Request error ${err}`);
				reject(err);
				return;
			}
			if (msg.statusCode > 299 || msg.statusCode < 200)
				log.warn('Status: %d %s', msg.statusCode, msg.statusMessage);
			else
				responseDebugInfo += `Status: ${msg.statusCode} ${msg.statusMessage}\n`;
			hackResponseHeaders(msg.headers, res);
			responseDebugInfo += 'Response headers:\n' + JSON.stringify(msg.headers, null, 2);
			log.info(responseDebugInfo);

			var contentType = _.get(msg.headers, 'content-type');
			if (contentType && (contentType.indexOf('xml') >= 0 || contentType.indexOf('text') >= 0 ||
				contentType.indexOf('json') >= 0 )) {
				logBody.info(`Response body:\n${chalk.blue(body)}`);
				return resolve({headers: msg.headers, body, res: msg});
			}
			var buf = Buffer.concat(bufArray);
			return resolve({headers: msg.headers, body: buf, res: msg});
		})
		.on('data', b => bufArray.push(b))
		.on('end', () => {});
	});
}

/**
 * Transport request from express to a request options.form/body for Request
 * @param {object} reqHeaders expresss request.headers
 * @param {object | string} reqBody expresss request.body
 * @param {object} opts Request options
 * @return debug string
 */
function doBody(reqHeaders, reqBody, opts) {
	if (Buffer.isBuffer(reqBody) || _.isString(reqBody))
		opts.body = reqBody;
	else if (_.isObject(reqBody) && _.size(reqBody) > 0) {
		let reqContentType = reqHeaders['content-type'];
		if (reqContentType && reqContentType.indexOf('json') >= 0) {
			opts.body = JSON.stringify(reqBody);
		} else
			opts.form = reqBody;
	}
	return 'Body/Form: ' + (opts.body || JSON.stringify(opts.form));
}

/**
 * @param {*} req
 * @param {*} headers
 * @param {*} body
 * @param {*} resHandlers
 * @return Promise<body: string>
 */
function intercept(req, headers, body, resHandlers) {
	var bodyHandlerProm;
	var handlers = [];
	var handlerSet = _.get(resHandlers, Url.parse(req.url).pathname);
	if (handlerSet)
		handlers.push(...handlerSet.values());
	var defaultHandlerSet = resHandlers['*'];
	if (defaultHandlerSet)
		handlers.push(...defaultHandlerSet.values());
	if (handlers.length > 0) {
		bodyHandlerProm = Promise.resolve({req, headers, body});
		handlers.forEach(func => {
			bodyHandlerProm = bodyHandlerProm.then(data => {
				let resolvedRes = func(data.req, data.headers, data.body, data.result);
				if (resolvedRes != null) {
					return Promise.resolve(resolvedRes)
					.then(result => {
						return Object.assign(data, {result});
					});
				}
				return data;
			});
		});
		bodyHandlerProm = bodyHandlerProm.then(data => data.result);
	} else {
		bodyHandlerProm = Promise.resolve(null);
	}
	return bodyHandlerProm;
}

function hackHeaders(target, req, requestNum) {
	var toHeaders = _.assign({}, req.headers, {
		'x-real-ip': req.ip,
		'x-forwarded_for': req.ip,
		'x-forwarded-for': req.ip
	});
	var parsedTarget = Url.parse(target);
	toHeaders.host = parsedTarget.host;
	delete toHeaders.origin;
	if (toHeaders.referer) {
		toHeaders.referer = `${parsedTarget.protocol}//${parsedTarget.host}${Url.parse(toHeaders.referer).pathname}`;
	}
	//toHeaders['X-liujing'] = 'request #' + requestNum;
	//toHeaders['User-Agent'] = 'Mozilla/5.0 (Linux; Android 5.0; SM-G900P Build/LRX21T) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/48.0.2564.23 Mobile Safari/537.36';
	return toHeaders;
}

function hackResponseHeaders(originHeaders, response) {
	_.each(originHeaders, (v, n) => {
		if (!_.get(SKIP_RES_HEADERS_SET, n.toLowerCase())) {
			if (n === 'set-cookie') {
				log.warn('set-cookie', v);
			}
			response.set(n, v);
		} else
			log.debug('skip response header: %s', n);
	});
}
