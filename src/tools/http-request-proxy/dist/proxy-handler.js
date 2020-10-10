"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var request = require('request');
const __api_1 = __importDefault(require("__api"));
const _ = __importStar(require("lodash"));
// import {BodyHandler, HeaderHandler} from './server';
const proxy_instance_1 = require("../isom/proxy-instance");
const url_1 = __importDefault(require("url"));
const fs = __importStar(require("fs"));
var log = require('log4js').getLogger(__api_1.default.packageName + '.msg');
var logBody = require('log4js').getLogger(__api_1.default.packageName + '.body');
var chalk = require('chalk');
var trackRequestStream = __api_1.default.config.get(__api_1.default.packageName + '.trackRequestStream');
var countRequest = 0;
var SKIP_RES_HEADERS = [
    'transfer-encoding',
    'content-encoding',
    // 'cache-control',
    'access-control-allow-origin'
];
var SKIP_RES_HEADERS_SET = SKIP_RES_HEADERS.reduce((set, name) => {
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
function doProxy(target, req, res, proxyInstance, proxyName) {
    return __awaiter(this, void 0, void 0, function* () {
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
            timeout: __api_1.default.config.get(__api_1.default.packageName + '.timeout', 20000),
            // "request" will not automatically do gzip decoding on incomingMessage,
            // must explicitly set `gzip` to true
            gzip: toHeaders['accept-encoding'] && toHeaders['accept-encoding'].indexOf('gzip') >= 0
        };
        try {
            const mockBody = yield proxy_instance_1.intercept(req, toHeaders, req.body, proxyInstance.mockHandlers, proxyName);
            if (mockBody != null) {
                log.info(requestDebugInfo);
                const msg = yield Promise.resolve(doBodyAsync(requestNum, req, req.body, opts));
                log.info(msg);
                log.info('Mock response:\n' + chalk.blue(_.isString(mockBody) ? mockBody : JSON.stringify(mockBody)));
                res.status(200).send(mockBody);
            }
            else {
                const result = yield proxy_instance_1.intercept(req, toHeaders, req.body, proxyInstance.reqHandlers, proxyName);
                const reqBody = result == null ? req.body : result;
                const msg = yield Promise.resolve(doBodyAsync(requestNum, req, reqBody, opts));
                requestDebugInfo += msg;
                const data = yield send(req, opts, requestDebugInfo, requestNum, res, proxyInstance);
                const body = yield proxy_instance_1.intercept(req, data.headers, data.body, proxyInstance.resHandlers, proxyName);
                if (body)
                    logBody.info(`Hacked Response body:\n${chalk.green(_.isString(body) ? body :
                        (Buffer.isBuffer(body) ? 'buffer' : JSON.stringify(body)))}`);
                if (data.res.statusCode)
                    res.status(data.res.statusCode).send(body == null ? data.body : body);
            }
        }
        catch (err) {
            log.error(err);
            res.status(500).send(err.message);
        }
    });
}
exports.default = doProxy;
function send(req, opts, requestDebugInfo, requestNum, res, proxyInstance) {
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
            if (msg.statusCode && (msg.statusCode > 299 || msg.statusCode < 200))
                log.warn('Status: %d %s', msg.statusCode, msg.statusMessage);
            else
                responseDebugInfo += `Status: ${msg.statusCode} ${msg.statusMessage}\n`;
            responseDebugInfo += 'Response headers:\n' + JSON.stringify(msg.headers, null, 2);
            hackResponseHeaders(req, msg.headers, res, proxyInstance);
            log.info(responseDebugInfo);
            var contentType = _.get(msg.headers, 'content-type');
            if (contentType && (contentType.indexOf('xml') >= 0 || contentType.indexOf('text') >= 0 ||
                contentType.indexOf('json') >= 0)) {
                logBody.info(`Response body:\n${chalk.blue(body)}`);
                return resolve({ headers: msg.headers, body, res: msg });
            }
            var buf = Buffer.concat(bufArray);
            return resolve({ headers: msg.headers, body: buf, res: msg });
        })
            .on('data', (b) => bufArray.push(b))
            .on('end', () => { });
    });
}
/**
 * Transport request from express to a request options.form/body for Request
 * @param {object} reqHeaders expresss request.headers
 * @param {object | string} reqBody expresss request.body
 * @param {object} opts Request options
 * @return debug string
 */
function doBodyAsync(requestNum, req, reqBody, opts) {
    var reqHeaders = req.headers;
    if (Buffer.isBuffer(reqBody) || _.isString(reqBody)) {
        // 
        opts.body = reqBody;
        return 'Body as Buffer or string: ' + reqBody.length;
    }
    else if (_.isObject(reqBody)) {
        // Request body is object (JSON, form or stream)
        const reqContentType = reqHeaders['content-type'];
        if (reqContentType && reqContentType.indexOf('json') >= 0) {
            opts.body = JSON.stringify(reqBody);
            return 'Body as JSON: ' + opts.body;
        }
        else if (reqContentType && reqContentType.indexOf('application/x-www-form-urlencoded') >= 0) {
            opts.form = reqBody;
            return 'Body as form: ' + JSON.stringify(opts.form);
        }
    }
    // Request body is stream
    if (trackRequestStream) {
        const tempFile = __api_1.default.config.resolve('destDir', 'request-body-' + requestNum);
        var out = fs.createWriteStream(tempFile);
        return new Promise((resolve, reject) => {
            req.pipe(out).on('finish', () => {
                log.info('Finished writing request body to temp file ', tempFile);
                opts.body = fs.createReadStream(tempFile);
                resolve('Body as Readable Stream');
            });
        });
    }
    else {
        opts.body = req;
        return 'Body as Readable Stream';
    }
}
function hackHeaders(target, req) {
    var toHeaders = _.assign({}, req.headers, {
        'x-real-ip': req.ip,
        'x-forwarded_for': req.ip,
        'x-forwarded-for': req.ip
    });
    var parsedTarget = url_1.default.parse(target);
    toHeaders.host = parsedTarget.host;
    delete toHeaders.origin;
    if (req.method === 'POST') {
        toHeaders.origin = parsedTarget.protocol + '//' + parsedTarget.host;
    }
    if (toHeaders.referer) {
        // tslint:disable-next-line:max-line-length
        toHeaders.referer = `${parsedTarget.protocol}//${parsedTarget.host}${url_1.default.parse(toHeaders.referer).pathname}`;
    }
    return toHeaders;
}
function hackResponseHeaders(req, originHeaders, response, proxyInstance) {
    _.each(originHeaders, (v, n) => {
        if (!_.get(SKIP_RES_HEADERS_SET, n.toLowerCase())) {
            if (n === 'set-cookie' && proxyInstance.isRemoveCookieDomain) {
                v = v.map((cookie) => {
                    var attrs = cookie.split(';');
                    return attrs.filter((value) => !value.startsWith('domain')).join(';');
                });
                log.info('Domain attribute is removed from set-cookie header: ', v);
            }
            response.set(n, v);
        }
        else
            log.debug('skip response header: %s', n);
    });
}

//# sourceMappingURL=proxy-handler.js.map
