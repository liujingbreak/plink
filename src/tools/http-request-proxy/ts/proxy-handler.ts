var request = require('request');
import api from '__api';
import * as _ from 'lodash';
import * as express from 'express';
import { ProxyInstance } from './server';
// import {BodyHandler, HeaderHandler} from './server';
import {intercept} from '../isom/proxy-instance';
import Url from 'url';
import {IncomingMessage} from 'http';
import * as fs from 'fs';
var log = require('log4js').getLogger(api.packageName + '.msg');
var logBody = require('log4js').getLogger(api.packageName + '.body');

var chalk = require('chalk');
var trackRequestStream = api.config.get(api.packageName + '.trackRequestStream');

var countRequest = 0;

var SKIP_RES_HEADERS = [
	'transfer-encoding',
	'content-encoding',
	'cache-control',
	'access-control-allow-origin'
];
var SKIP_RES_HEADERS_SET = SKIP_RES_HEADERS.reduce((set: {[k: string]: boolean}, name) => {
	set[name.toLowerCase()] = true;
	return set;
}, {});

/**
 * @param {*} target {string} URL of proxying target
 * @param {*} req {request}
 * @param {*} res {response}
 * @param {*} proxyInstance
 * @param {*} proxyName {string} proxy sub path which should not starts with '/'
 * @return undefined
 */
export default async function doProxy(target: string, req: express.Request, res: express.Response,
	proxyInstance: ProxyInstance, proxyName: string) {
	var requestNum = ++countRequest;

	var toUrl = target + req.url.replace(/\/\//g, '/');
	if (req.method === 'GET')
		toUrl += (req.url.indexOf('?') >= 0 ? '#' : '?') + 'random=' + Math.random();
	// ------------hack begins ------
	var toHeaders = hackHeaders(target, req);
	// ----------- hack ends ----------
	let requestDebugInfo = `\n[#${requestNum}] REQUEST ${chalk.yellow(req.method)} ${chalk.cyan(toUrl)}\n` +
	`OriginalUrl: ${req.originalUrl}\n` +
	// `Host: ${req.headers.host}\n` +
	// `request headers: ${JSON.stringify(req.headers, null, 2)}\n` +
	`Hacked header: ${JSON.stringify(toHeaders, null, 2)}\n`;
	// log.info('hacked request headers: \n%s', JSON.stringify(toHeaders, null, 2));
	var opts = {
		url: toUrl,
		method: req.method,
		headers: toHeaders,
		strictSSL: false,
		time: false,
		timeout: api.config.get(api.packageName + '.timeout', 20000),
		// "request" will not automatically do gzip decoding on incomingMessage,
		// must explicitly set `gzip` to true
		gzip: toHeaders['accept-encoding'] && toHeaders['accept-encoding'].indexOf('gzip') >= 0
	};

	try {
		const mockBody = await intercept(req, toHeaders, req.body, proxyInstance.mockHandlers, proxyName);
		if (mockBody != null) {
			log.info(requestDebugInfo);
			const msg = await Promise.resolve(doBodyAsync(requestNum, req, req.body, opts));
			log.info(msg);
			log.info('Mock response:\n' + chalk.blue(_.isString(mockBody) ? mockBody : JSON.stringify(mockBody)));
			res.status(200).send(mockBody);
		} else {
			const result = await intercept(req, toHeaders, req.body, proxyInstance.reqHandlers, proxyName);
			const reqBody = result == null ? req.body : result;
			const msg = await Promise.resolve(doBodyAsync(requestNum, req, reqBody, opts));
			requestDebugInfo += msg;
			const data = await send(req, opts, requestDebugInfo, requestNum, res, proxyInstance);
			const body = await intercept(req, data.headers, data.body, proxyInstance.resHandlers, proxyName);
			if (body)
				logBody.info(`Hacked Response body:\n${chalk.green(_.isString(body) ? body :
					(Buffer.isBuffer(body) ? 'buffer' : JSON.stringify(body)))}`);
			if (data.res.statusCode)
				res.status(data.res.statusCode).send(body == null ? data.body : body);
		}
	} catch(err) {
		log.error(err);
		res.status(500).send(err.message);
	}
}

function send(req: express.Request, opts: any, requestDebugInfo: any, requestNum: number, res: express.Response,
	proxyInstance: ProxyInstance):
	Promise<{headers: {[k: string]: any}, body: any, res: IncomingMessage}> {
	return new Promise((resolve, reject) => {
		var bufArray: Buffer[] = [];
		request(opts, (err: Error, msg: IncomingMessage, body: string|Buffer) => {
			log.info(requestDebugInfo);
			var responseDebugInfo = `[#${requestNum}] RESPONSE:`;
			if (err) {
				log.error(`Request error ${err}`);
				reject(err);
				return;
			}
			if (msg.statusCode && (msg.statusCode > 299 || msg.statusCode < 200))
				log.warn('Status: %d %s', msg.statusCode, msg.statusMessage);
			else
				responseDebugInfo += `Status: ${msg.statusCode} ${msg.statusMessage}\n`;
			responseDebugInfo += 'Response headers:\n' + JSON.stringify(msg.headers, null, 2);
			hackResponseHeaders(req, msg.headers, res, proxyInstance);
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
		.on('data', (b: Buffer) => bufArray.push(b))
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
function doBodyAsync(requestNum: number, req: express.Request, reqBody: any, opts: {[k: string]: any}):
	string | PromiseLike<string> {
	var reqHeaders: {[k: string]: any} = req.headers;
	if (Buffer.isBuffer(reqBody) || _.isString(reqBody)) {
		// 
		opts.body = reqBody;
		return 'Body as Buffer or string: ' + reqBody.length;
	} else if (_.isObject(reqBody)) {
		// Request body is object (JSON, form or stream)
		const reqContentType = reqHeaders['content-type'];
		if (reqContentType && reqContentType.indexOf('json') >= 0) {
			opts.body = JSON.stringify(reqBody);
			return 'Body as JSON: ' + opts.body;
		} else if (reqContentType && reqContentType.indexOf('application/x-www-form-urlencoded') >= 0) {
			opts.form = reqBody;
			return 'Body as form: ' + JSON.stringify(opts.form);
		}
	}

	// Request body is stream
	if (trackRequestStream) {
		const tempFile: string = api.config.resolve('destDir', 'request-body-' + requestNum);
		var out = fs.createWriteStream(tempFile);
		return new Promise((resolve, reject) => {
			req.pipe(out).on('finish', () => {
				log.info('Finished writing request body to temp file ', tempFile);
				opts.body = fs.createReadStream(tempFile);
				resolve('Body as Readable Stream');
			});
		});
	} else {
		opts.body = req;
		return 'Body as Readable Stream';
	}
}

function hackHeaders(target: string, req: express.Request): {[k: string]: any} {
	var toHeaders = _.assign({}, req.headers, {
		'x-real-ip': req.ip,
		'x-forwarded_for': req.ip,
		'x-forwarded-for': req.ip
	});
	var parsedTarget = Url.parse(target);
	toHeaders.host = parsedTarget.host;
	delete toHeaders.origin;
	if (toHeaders.referer) {
		// tslint:disable-next-line:max-line-length
		toHeaders.referer = `${parsedTarget.protocol}//${parsedTarget.host}${Url.parse(toHeaders.referer as string).pathname}`;
	}
	return toHeaders;
}

function hackResponseHeaders(req: express.Request, originHeaders: {[k: string]: any}, response: express.Response,
	proxyInstance: ProxyInstance) {
	_.each(originHeaders, (v, n) => {
		if (!_.get(SKIP_RES_HEADERS_SET, n.toLowerCase())) {
			if (n === 'set-cookie' && proxyInstance.isRemoveCookieDomain) {
				v = v.map((cookie: any) => {
					var attrs: string[] = cookie.split(';');
					return attrs.filter((value) => !value.startsWith('domain')).join(';');
				});
				log.info('Domain attribute is removed from set-cookie header: ', v);
			}
			response.set(n, v);
		} else
			log.debug('skip response header: %s', n);
	});
}
