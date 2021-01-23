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
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJveHktaGFuZGxlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInByb3h5LWhhbmRsZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsSUFBSSxPQUFPLEdBQUcsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDO0FBQ2pDLGtEQUF3QjtBQUN4QiwwQ0FBNEI7QUFHNUIsdURBQXVEO0FBQ3ZELDJEQUFpRDtBQUNqRCw4Q0FBc0I7QUFFdEIsdUNBQXlCO0FBQ3pCLElBQUksR0FBRyxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxTQUFTLENBQUMsZUFBRyxDQUFDLFdBQVcsR0FBRyxNQUFNLENBQUMsQ0FBQztBQUNoRSxJQUFJLE9BQU8sR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsU0FBUyxDQUFDLGVBQUcsQ0FBQyxXQUFXLEdBQUcsT0FBTyxDQUFDLENBQUM7QUFFckUsSUFBSSxLQUFLLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0FBQzdCLElBQUksa0JBQWtCLEdBQUcsZUFBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsZUFBRyxDQUFDLFdBQVcsR0FBRyxxQkFBcUIsQ0FBQyxDQUFDO0FBRWpGLElBQUksWUFBWSxHQUFHLENBQUMsQ0FBQztBQUVyQixJQUFJLGdCQUFnQixHQUFHO0lBQ3JCLG1CQUFtQjtJQUNuQixrQkFBa0I7SUFDbEIsbUJBQW1CO0lBQ25CLDZCQUE2QjtDQUM5QixDQUFDO0FBQ0YsSUFBSSxvQkFBb0IsR0FBRyxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsQ0FBQyxHQUEyQixFQUFFLElBQUksRUFBRSxFQUFFO0lBQ3ZGLEdBQUcsQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUM7SUFDL0IsT0FBTyxHQUFHLENBQUM7QUFDYixDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7QUFFUDs7Ozs7OztHQU9HO0FBQ0gsU0FBOEIsT0FBTyxDQUFDLE1BQWMsRUFBRSxHQUFvQixFQUFFLEdBQXFCLEVBQy9GLGFBQTRCLEVBQUUsU0FBaUI7O1FBQy9DLElBQUksVUFBVSxHQUFHLEVBQUUsWUFBWSxDQUFDO1FBRWhDLElBQUksS0FBSyxHQUFHLE1BQU0sR0FBRyxHQUFHLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDbkQsSUFBSSxHQUFHLENBQUMsTUFBTSxLQUFLLEtBQUs7WUFDdEIsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLFNBQVMsR0FBRyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7UUFDL0UsaUNBQWlDO1FBQ2pDLElBQUksU0FBUyxHQUFHLFdBQVcsQ0FBQyxNQUFNLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDekMsbUNBQW1DO1FBQ25DLElBQUksZ0JBQWdCLEdBQUcsT0FBTyxVQUFVLGFBQWEsS0FBSyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLElBQUksS0FBSyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSTtZQUN0RyxnQkFBZ0IsR0FBRyxDQUFDLFdBQVcsSUFBSTtZQUNuQyxrQ0FBa0M7WUFDbEMsaUVBQWlFO1lBQ2pFLGtCQUFrQixJQUFJLENBQUMsU0FBUyxDQUFDLFNBQVMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQztRQUN6RCxnRkFBZ0Y7UUFDaEYsSUFBSSxJQUFJLEdBQUc7WUFDVCxHQUFHLEVBQUUsS0FBSztZQUNWLE1BQU0sRUFBRSxHQUFHLENBQUMsTUFBTTtZQUNsQixPQUFPLEVBQUUsU0FBUztZQUNsQixTQUFTLEVBQUUsS0FBSztZQUNoQixJQUFJLEVBQUUsS0FBSztZQUNYLE9BQU8sRUFBRSxlQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxlQUFHLENBQUMsV0FBVyxHQUFHLFVBQVUsRUFBRSxLQUFLLENBQUM7WUFDNUQsd0VBQXdFO1lBQ3hFLHFDQUFxQztZQUNyQyxJQUFJLEVBQUUsU0FBUyxDQUFDLGlCQUFpQixDQUFDLElBQUksU0FBUyxDQUFDLGlCQUFpQixDQUFDLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUM7U0FDeEYsQ0FBQztRQUVGLElBQUk7WUFDRixNQUFNLFFBQVEsR0FBRyxNQUFNLDBCQUFTLENBQUMsR0FBRyxFQUFFLFNBQVMsRUFBRSxHQUFHLENBQUMsSUFBSSxFQUFFLGFBQWEsQ0FBQyxZQUFZLEVBQUUsU0FBUyxDQUFDLENBQUM7WUFDbEcsSUFBSSxRQUFRLElBQUksSUFBSSxFQUFFO2dCQUNwQixHQUFHLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLENBQUM7Z0JBQzNCLE1BQU0sR0FBRyxHQUFHLE1BQU0sT0FBTyxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsVUFBVSxFQUFFLEdBQUcsRUFBRSxHQUFHLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUM7Z0JBQ2hGLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7Z0JBQ2QsR0FBRyxDQUFDLElBQUksQ0FBQyxrQkFBa0IsR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQ3RHLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO2FBQ2hDO2lCQUFNO2dCQUNMLE1BQU0sTUFBTSxHQUFHLE1BQU0sMEJBQVMsQ0FBQyxHQUFHLEVBQUUsU0FBUyxFQUFFLEdBQUcsQ0FBQyxJQUFJLEVBQUUsYUFBYSxDQUFDLFdBQVcsRUFBRSxTQUFTLENBQUMsQ0FBQztnQkFDL0YsTUFBTSxPQUFPLEdBQUcsTUFBTSxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDO2dCQUNuRCxNQUFNLEdBQUcsR0FBRyxNQUFNLE9BQU8sQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLFVBQVUsRUFBRSxHQUFHLEVBQUUsT0FBTyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUM7Z0JBQy9FLGdCQUFnQixJQUFJLEdBQUcsQ0FBQztnQkFDeEIsTUFBTSxJQUFJLEdBQUcsTUFBTSxJQUFJLENBQUMsR0FBRyxFQUFFLElBQUksRUFBRSxnQkFBZ0IsRUFBRSxVQUFVLEVBQUUsR0FBRyxFQUFFLGFBQWEsQ0FBQyxDQUFDO2dCQUNyRixNQUFNLElBQUksR0FBRyxNQUFNLDBCQUFTLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxhQUFhLENBQUMsV0FBVyxFQUFFLFNBQVMsQ0FBQyxDQUFDO2dCQUNqRyxJQUFJLElBQUk7b0JBQ04sT0FBTyxDQUFDLElBQUksQ0FBQywwQkFBMEIsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQzt3QkFDMUUsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztnQkFDbEUsSUFBSSxJQUFJLENBQUMsR0FBRyxDQUFDLFVBQVU7b0JBQ3JCLEdBQUcsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUM7YUFDekU7U0FDRjtRQUFDLE9BQU0sR0FBRyxFQUFFO1lBQ1gsR0FBRyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUNmLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQztTQUNuQztJQUNILENBQUM7Q0FBQTtBQXJERCwwQkFxREM7QUFFRCxTQUFTLElBQUksQ0FBQyxHQUFvQixFQUFFLElBQVMsRUFBRSxnQkFBcUIsRUFBRSxVQUFrQixFQUFFLEdBQXFCLEVBQzdHLGFBQTRCO0lBRTVCLE9BQU8sSUFBSSxPQUFPLENBQUMsQ0FBQyxPQUFPLEVBQUUsTUFBTSxFQUFFLEVBQUU7UUFDckMsSUFBSSxRQUFRLEdBQWEsRUFBRSxDQUFDO1FBQzVCLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQyxHQUFVLEVBQUUsR0FBb0IsRUFBRSxJQUFtQixFQUFFLEVBQUU7WUFDdEUsR0FBRyxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO1lBQzNCLElBQUksaUJBQWlCLEdBQUcsS0FBSyxVQUFVLGFBQWEsQ0FBQztZQUNyRCxJQUFJLEdBQUcsRUFBRTtnQkFDUCxHQUFHLENBQUMsS0FBSyxDQUFDLGlCQUFpQixHQUFHLEVBQUUsQ0FBQyxDQUFDO2dCQUNsQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUM7Z0JBQ1osT0FBTzthQUNSO1lBQ0QsSUFBSSxHQUFHLENBQUMsVUFBVSxJQUFJLENBQUMsR0FBRyxDQUFDLFVBQVUsR0FBRyxHQUFHLElBQUksR0FBRyxDQUFDLFVBQVUsR0FBRyxHQUFHLENBQUM7Z0JBQ2xFLEdBQUcsQ0FBQyxJQUFJLENBQUMsZUFBZSxFQUFFLEdBQUcsQ0FBQyxVQUFVLEVBQUUsR0FBRyxDQUFDLGFBQWEsQ0FBQyxDQUFDOztnQkFFN0QsaUJBQWlCLElBQUksV0FBVyxHQUFHLENBQUMsVUFBVSxJQUFJLEdBQUcsQ0FBQyxhQUFhLElBQUksQ0FBQztZQUMxRSxpQkFBaUIsSUFBSSxxQkFBcUIsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQ2xGLG1CQUFtQixDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsT0FBTyxFQUFFLEdBQUcsRUFBRSxhQUFhLENBQUMsQ0FBQztZQUMxRCxHQUFHLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLENBQUM7WUFFNUIsSUFBSSxXQUFXLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsT0FBTyxFQUFFLGNBQWMsQ0FBQyxDQUFDO1lBQ3JELElBQUksV0FBVyxJQUFJLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksV0FBVyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDO2dCQUNyRixXQUFXLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBRSxFQUFFO2dCQUNwQyxPQUFPLENBQUMsSUFBSSxDQUFDLG1CQUFtQixLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQztnQkFDcEQsT0FBTyxPQUFPLENBQUMsRUFBQyxPQUFPLEVBQUUsR0FBRyxDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBQyxDQUFDLENBQUM7YUFDeEQ7WUFDRCxJQUFJLEdBQUcsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBQ2xDLE9BQU8sT0FBTyxDQUFDLEVBQUMsT0FBTyxFQUFFLEdBQUcsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFDLENBQUMsQ0FBQztRQUM5RCxDQUFDLENBQUM7YUFDRCxFQUFFLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBUyxFQUFFLEVBQUUsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO2FBQzNDLEVBQUUsQ0FBQyxLQUFLLEVBQUUsR0FBRyxFQUFFLEdBQUUsQ0FBQyxDQUFDLENBQUM7SUFDdkIsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDO0FBRUQ7Ozs7OztHQU1HO0FBQ0gsU0FBUyxXQUFXLENBQUMsVUFBa0IsRUFBRSxHQUFvQixFQUFFLE9BQVksRUFBRSxJQUF3QjtJQUVuRyxJQUFJLFVBQVUsR0FBdUIsR0FBRyxDQUFDLE9BQU8sQ0FBQztJQUNqRCxJQUFJLE1BQU0sQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsRUFBRTtRQUNuRCxHQUFHO1FBQ0gsSUFBSSxDQUFDLElBQUksR0FBRyxPQUFPLENBQUM7UUFDcEIsT0FBTyw0QkFBNEIsR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDO0tBQ3REO1NBQU0sSUFBSSxDQUFDLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxFQUFFO1FBQzlCLGdEQUFnRDtRQUNoRCxNQUFNLGNBQWMsR0FBRyxVQUFVLENBQUMsY0FBYyxDQUFDLENBQUM7UUFDbEQsSUFBSSxjQUFjLElBQUksY0FBYyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEVBQUU7WUFDekQsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQ3BDLE9BQU8sZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQztTQUNyQzthQUFNLElBQUksY0FBYyxJQUFJLGNBQWMsQ0FBQyxPQUFPLENBQUMsbUNBQW1DLENBQUMsSUFBSSxDQUFDLEVBQUU7WUFDN0YsSUFBSSxDQUFDLElBQUksR0FBRyxPQUFPLENBQUM7WUFDcEIsT0FBTyxnQkFBZ0IsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztTQUNyRDtLQUNGO0lBRUQseUJBQXlCO0lBQ3pCLElBQUksa0JBQWtCLEVBQUU7UUFDdEIsTUFBTSxRQUFRLEdBQVcsZUFBRyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLGVBQWUsR0FBRyxVQUFVLENBQUMsQ0FBQztRQUNyRixJQUFJLEdBQUcsR0FBRyxFQUFFLENBQUMsaUJBQWlCLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDekMsT0FBTyxJQUFJLE9BQU8sQ0FBQyxDQUFDLE9BQU8sRUFBRSxNQUFNLEVBQUUsRUFBRTtZQUNyQyxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxRQUFRLEVBQUUsR0FBRyxFQUFFO2dCQUM5QixHQUFHLENBQUMsSUFBSSxDQUFDLDZDQUE2QyxFQUFFLFFBQVEsQ0FBQyxDQUFDO2dCQUNsRSxJQUFJLENBQUMsSUFBSSxHQUFHLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLENBQUMsQ0FBQztnQkFDMUMsT0FBTyxDQUFDLHlCQUF5QixDQUFDLENBQUM7WUFDckMsQ0FBQyxDQUFDLENBQUM7UUFDTCxDQUFDLENBQUMsQ0FBQztLQUNKO1NBQU07UUFDTCxJQUFJLENBQUMsSUFBSSxHQUFHLEdBQUcsQ0FBQztRQUNoQixPQUFPLHlCQUF5QixDQUFDO0tBQ2xDO0FBQ0gsQ0FBQztBQUVELFNBQVMsV0FBVyxDQUFDLE1BQWMsRUFBRSxHQUFvQjtJQUN2RCxJQUFJLFNBQVMsR0FBRyxDQUFDLENBQUMsTUFBTSxDQUFDLEVBQUUsRUFBRSxHQUFHLENBQUMsT0FBTyxFQUFFO1FBQ3hDLFdBQVcsRUFBRSxHQUFHLENBQUMsRUFBRTtRQUNuQixpQkFBaUIsRUFBRSxHQUFHLENBQUMsRUFBRTtRQUN6QixpQkFBaUIsRUFBRSxHQUFHLENBQUMsRUFBRTtLQUMxQixDQUFDLENBQUM7SUFDSCxJQUFJLFlBQVksR0FBRyxhQUFHLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQ3JDLFNBQVMsQ0FBQyxJQUFJLEdBQUcsWUFBWSxDQUFDLElBQUssQ0FBQztJQUNwQyxPQUFPLFNBQVMsQ0FBQyxNQUFNLENBQUM7SUFDeEIsSUFBSSxHQUFHLENBQUMsTUFBTSxLQUFLLE1BQU0sRUFBRTtRQUN6QixTQUFTLENBQUMsTUFBTSxHQUFHLFlBQVksQ0FBQyxRQUFTLEdBQUcsSUFBSSxHQUFHLFlBQVksQ0FBQyxJQUFJLENBQUM7S0FDdEU7SUFDRCxJQUFJLFNBQVMsQ0FBQyxPQUFPLEVBQUU7UUFDckIsMkNBQTJDO1FBQzNDLFNBQVMsQ0FBQyxPQUFPLEdBQUcsR0FBRyxZQUFZLENBQUMsUUFBUSxLQUFLLFlBQVksQ0FBQyxJQUFJLEdBQUcsYUFBRyxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsT0FBaUIsQ0FBQyxDQUFDLFFBQVEsRUFBRSxDQUFDO0tBQ3hIO0lBQ0QsT0FBTyxTQUFTLENBQUM7QUFDbkIsQ0FBQztBQUVELFNBQVMsbUJBQW1CLENBQUMsR0FBb0IsRUFBRSxhQUFpQyxFQUFFLFFBQTBCLEVBQzlHLGFBQTRCO0lBQzVCLENBQUMsQ0FBQyxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFO1FBQzdCLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLG9CQUFvQixFQUFFLENBQUMsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxFQUFFO1lBQ2pELElBQUksQ0FBQyxLQUFLLFlBQVksSUFBSSxhQUFhLENBQUMsb0JBQW9CLEVBQUU7Z0JBQzVELENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsTUFBVyxFQUFFLEVBQUU7b0JBQ3hCLElBQUksS0FBSyxHQUFhLE1BQU0sQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7b0JBQ3hDLE9BQU8sS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO2dCQUN4RSxDQUFDLENBQUMsQ0FBQztnQkFDSCxHQUFHLENBQUMsSUFBSSxDQUFDLHNEQUFzRCxFQUFFLENBQUMsQ0FBQyxDQUFDO2FBQ3JFO1lBQ0QsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7U0FDcEI7O1lBQ0MsR0FBRyxDQUFDLEtBQUssQ0FBQywwQkFBMEIsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUM3QyxDQUFDLENBQUMsQ0FBQztBQUNMLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJ2YXIgcmVxdWVzdCA9IHJlcXVpcmUoJ3JlcXVlc3QnKTtcbmltcG9ydCBhcGkgZnJvbSAnX19hcGknO1xuaW1wb3J0ICogYXMgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0ICogYXMgZXhwcmVzcyBmcm9tICdleHByZXNzJztcbmltcG9ydCB7IFByb3h5SW5zdGFuY2UgfSBmcm9tICcuL3NlcnZlcic7XG4vLyBpbXBvcnQge0JvZHlIYW5kbGVyLCBIZWFkZXJIYW5kbGVyfSBmcm9tICcuL3NlcnZlcic7XG5pbXBvcnQge2ludGVyY2VwdH0gZnJvbSAnLi4vaXNvbS9wcm94eS1pbnN0YW5jZSc7XG5pbXBvcnQgVXJsIGZyb20gJ3VybCc7XG5pbXBvcnQge0luY29taW5nTWVzc2FnZX0gZnJvbSAnaHR0cCc7XG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XG52YXIgbG9nID0gcmVxdWlyZSgnbG9nNGpzJykuZ2V0TG9nZ2VyKGFwaS5wYWNrYWdlTmFtZSArICcubXNnJyk7XG52YXIgbG9nQm9keSA9IHJlcXVpcmUoJ2xvZzRqcycpLmdldExvZ2dlcihhcGkucGFja2FnZU5hbWUgKyAnLmJvZHknKTtcblxudmFyIGNoYWxrID0gcmVxdWlyZSgnY2hhbGsnKTtcbnZhciB0cmFja1JlcXVlc3RTdHJlYW0gPSBhcGkuY29uZmlnLmdldChhcGkucGFja2FnZU5hbWUgKyAnLnRyYWNrUmVxdWVzdFN0cmVhbScpO1xuXG52YXIgY291bnRSZXF1ZXN0ID0gMDtcblxudmFyIFNLSVBfUkVTX0hFQURFUlMgPSBbXG4gICd0cmFuc2Zlci1lbmNvZGluZycsXG4gICdjb250ZW50LWVuY29kaW5nJyxcbiAgLy8gJ2NhY2hlLWNvbnRyb2wnLFxuICAnYWNjZXNzLWNvbnRyb2wtYWxsb3ctb3JpZ2luJ1xuXTtcbnZhciBTS0lQX1JFU19IRUFERVJTX1NFVCA9IFNLSVBfUkVTX0hFQURFUlMucmVkdWNlKChzZXQ6IHtbazogc3RyaW5nXTogYm9vbGVhbn0sIG5hbWUpID0+IHtcbiAgc2V0W25hbWUudG9Mb3dlckNhc2UoKV0gPSB0cnVlO1xuICByZXR1cm4gc2V0O1xufSwge30pO1xuXG4vKipcbiAqIEBwYXJhbSB7Kn0gdGFyZ2V0IHtzdHJpbmd9IFVSTCBvZiBwcm94eWluZyB0YXJnZXRcbiAqIEBwYXJhbSB7Kn0gcmVxIHtyZXF1ZXN0fVxuICogQHBhcmFtIHsqfSByZXMge3Jlc3BvbnNlfVxuICogQHBhcmFtIHsqfSBwcm94eUluc3RhbmNlXG4gKiBAcGFyYW0geyp9IHByb3h5TmFtZSB7c3RyaW5nfSBwcm94eSBzdWIgcGF0aCB3aGljaCBzaG91bGQgbm90IHN0YXJ0cyB3aXRoICcvJ1xuICogQHJldHVybiB1bmRlZmluZWRcbiAqL1xuZXhwb3J0IGRlZmF1bHQgYXN5bmMgZnVuY3Rpb24gZG9Qcm94eSh0YXJnZXQ6IHN0cmluZywgcmVxOiBleHByZXNzLlJlcXVlc3QsIHJlczogZXhwcmVzcy5SZXNwb25zZSxcbiAgcHJveHlJbnN0YW5jZTogUHJveHlJbnN0YW5jZSwgcHJveHlOYW1lOiBzdHJpbmcpIHtcbiAgdmFyIHJlcXVlc3ROdW0gPSArK2NvdW50UmVxdWVzdDtcblxuICB2YXIgdG9VcmwgPSB0YXJnZXQgKyByZXEudXJsLnJlcGxhY2UoL1xcL1xcLy9nLCAnLycpO1xuICBpZiAocmVxLm1ldGhvZCA9PT0gJ0dFVCcpXG4gICAgdG9VcmwgKz0gKHJlcS51cmwuaW5kZXhPZignPycpID49IDAgPyAnIycgOiAnPycpICsgJ3JhbmRvbT0nICsgTWF0aC5yYW5kb20oKTtcbiAgLy8gLS0tLS0tLS0tLS0taGFjayBiZWdpbnMgLS0tLS0tXG4gIHZhciB0b0hlYWRlcnMgPSBoYWNrSGVhZGVycyh0YXJnZXQsIHJlcSk7XG4gIC8vIC0tLS0tLS0tLS0tIGhhY2sgZW5kcyAtLS0tLS0tLS0tXG4gIGxldCByZXF1ZXN0RGVidWdJbmZvID0gYFxcblsjJHtyZXF1ZXN0TnVtfV0gUkVRVUVTVCAke2NoYWxrLnllbGxvdyhyZXEubWV0aG9kKX0gJHtjaGFsay5jeWFuKHRvVXJsKX1cXG5gICtcbiAgYE9yaWdpbmFsVXJsOiAke3JlcS5vcmlnaW5hbFVybH1cXG5gICtcbiAgLy8gYEhvc3Q6ICR7cmVxLmhlYWRlcnMuaG9zdH1cXG5gICtcbiAgLy8gYHJlcXVlc3QgaGVhZGVyczogJHtKU09OLnN0cmluZ2lmeShyZXEuaGVhZGVycywgbnVsbCwgMil9XFxuYCArXG4gIGBIYWNrZWQgaGVhZGVyOiAke0pTT04uc3RyaW5naWZ5KHRvSGVhZGVycywgbnVsbCwgMil9XFxuYDtcbiAgLy8gbG9nLmluZm8oJ2hhY2tlZCByZXF1ZXN0IGhlYWRlcnM6IFxcbiVzJywgSlNPTi5zdHJpbmdpZnkodG9IZWFkZXJzLCBudWxsLCAyKSk7XG4gIHZhciBvcHRzID0ge1xuICAgIHVybDogdG9VcmwsXG4gICAgbWV0aG9kOiByZXEubWV0aG9kLFxuICAgIGhlYWRlcnM6IHRvSGVhZGVycyxcbiAgICBzdHJpY3RTU0w6IGZhbHNlLFxuICAgIHRpbWU6IGZhbHNlLFxuICAgIHRpbWVvdXQ6IGFwaS5jb25maWcuZ2V0KGFwaS5wYWNrYWdlTmFtZSArICcudGltZW91dCcsIDIwMDAwKSxcbiAgICAvLyBcInJlcXVlc3RcIiB3aWxsIG5vdCBhdXRvbWF0aWNhbGx5IGRvIGd6aXAgZGVjb2Rpbmcgb24gaW5jb21pbmdNZXNzYWdlLFxuICAgIC8vIG11c3QgZXhwbGljaXRseSBzZXQgYGd6aXBgIHRvIHRydWVcbiAgICBnemlwOiB0b0hlYWRlcnNbJ2FjY2VwdC1lbmNvZGluZyddICYmIHRvSGVhZGVyc1snYWNjZXB0LWVuY29kaW5nJ10uaW5kZXhPZignZ3ppcCcpID49IDBcbiAgfTtcblxuICB0cnkge1xuICAgIGNvbnN0IG1vY2tCb2R5ID0gYXdhaXQgaW50ZXJjZXB0KHJlcSwgdG9IZWFkZXJzLCByZXEuYm9keSwgcHJveHlJbnN0YW5jZS5tb2NrSGFuZGxlcnMsIHByb3h5TmFtZSk7XG4gICAgaWYgKG1vY2tCb2R5ICE9IG51bGwpIHtcbiAgICAgIGxvZy5pbmZvKHJlcXVlc3REZWJ1Z0luZm8pO1xuICAgICAgY29uc3QgbXNnID0gYXdhaXQgUHJvbWlzZS5yZXNvbHZlKGRvQm9keUFzeW5jKHJlcXVlc3ROdW0sIHJlcSwgcmVxLmJvZHksIG9wdHMpKTtcbiAgICAgIGxvZy5pbmZvKG1zZyk7XG4gICAgICBsb2cuaW5mbygnTW9jayByZXNwb25zZTpcXG4nICsgY2hhbGsuYmx1ZShfLmlzU3RyaW5nKG1vY2tCb2R5KSA/IG1vY2tCb2R5IDogSlNPTi5zdHJpbmdpZnkobW9ja0JvZHkpKSk7XG4gICAgICByZXMuc3RhdHVzKDIwMCkuc2VuZChtb2NrQm9keSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGludGVyY2VwdChyZXEsIHRvSGVhZGVycywgcmVxLmJvZHksIHByb3h5SW5zdGFuY2UucmVxSGFuZGxlcnMsIHByb3h5TmFtZSk7XG4gICAgICBjb25zdCByZXFCb2R5ID0gcmVzdWx0ID09IG51bGwgPyByZXEuYm9keSA6IHJlc3VsdDtcbiAgICAgIGNvbnN0IG1zZyA9IGF3YWl0IFByb21pc2UucmVzb2x2ZShkb0JvZHlBc3luYyhyZXF1ZXN0TnVtLCByZXEsIHJlcUJvZHksIG9wdHMpKTtcbiAgICAgIHJlcXVlc3REZWJ1Z0luZm8gKz0gbXNnO1xuICAgICAgY29uc3QgZGF0YSA9IGF3YWl0IHNlbmQocmVxLCBvcHRzLCByZXF1ZXN0RGVidWdJbmZvLCByZXF1ZXN0TnVtLCByZXMsIHByb3h5SW5zdGFuY2UpO1xuICAgICAgY29uc3QgYm9keSA9IGF3YWl0IGludGVyY2VwdChyZXEsIGRhdGEuaGVhZGVycywgZGF0YS5ib2R5LCBwcm94eUluc3RhbmNlLnJlc0hhbmRsZXJzLCBwcm94eU5hbWUpO1xuICAgICAgaWYgKGJvZHkpXG4gICAgICAgIGxvZ0JvZHkuaW5mbyhgSGFja2VkIFJlc3BvbnNlIGJvZHk6XFxuJHtjaGFsay5ncmVlbihfLmlzU3RyaW5nKGJvZHkpID8gYm9keSA6XG4gICAgICAgICAgKEJ1ZmZlci5pc0J1ZmZlcihib2R5KSA/ICdidWZmZXInIDogSlNPTi5zdHJpbmdpZnkoYm9keSkpKX1gKTtcbiAgICAgIGlmIChkYXRhLnJlcy5zdGF0dXNDb2RlKVxuICAgICAgICByZXMuc3RhdHVzKGRhdGEucmVzLnN0YXR1c0NvZGUpLnNlbmQoYm9keSA9PSBudWxsID8gZGF0YS5ib2R5IDogYm9keSk7XG4gICAgfVxuICB9IGNhdGNoKGVycikge1xuICAgIGxvZy5lcnJvcihlcnIpO1xuICAgIHJlcy5zdGF0dXMoNTAwKS5zZW5kKGVyci5tZXNzYWdlKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBzZW5kKHJlcTogZXhwcmVzcy5SZXF1ZXN0LCBvcHRzOiBhbnksIHJlcXVlc3REZWJ1Z0luZm86IGFueSwgcmVxdWVzdE51bTogbnVtYmVyLCByZXM6IGV4cHJlc3MuUmVzcG9uc2UsXG4gIHByb3h5SW5zdGFuY2U6IFByb3h5SW5zdGFuY2UpOlxuICBQcm9taXNlPHtoZWFkZXJzOiB7W2s6IHN0cmluZ106IGFueX0sIGJvZHk6IGFueSwgcmVzOiBJbmNvbWluZ01lc3NhZ2V9PiB7XG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgdmFyIGJ1ZkFycmF5OiBCdWZmZXJbXSA9IFtdO1xuICAgIHJlcXVlc3Qob3B0cywgKGVycjogRXJyb3IsIG1zZzogSW5jb21pbmdNZXNzYWdlLCBib2R5OiBzdHJpbmd8QnVmZmVyKSA9PiB7XG4gICAgICBsb2cuaW5mbyhyZXF1ZXN0RGVidWdJbmZvKTtcbiAgICAgIHZhciByZXNwb25zZURlYnVnSW5mbyA9IGBbIyR7cmVxdWVzdE51bX1dIFJFU1BPTlNFOmA7XG4gICAgICBpZiAoZXJyKSB7XG4gICAgICAgIGxvZy5lcnJvcihgUmVxdWVzdCBlcnJvciAke2Vycn1gKTtcbiAgICAgICAgcmVqZWN0KGVycik7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGlmIChtc2cuc3RhdHVzQ29kZSAmJiAobXNnLnN0YXR1c0NvZGUgPiAyOTkgfHwgbXNnLnN0YXR1c0NvZGUgPCAyMDApKVxuICAgICAgICBsb2cud2FybignU3RhdHVzOiAlZCAlcycsIG1zZy5zdGF0dXNDb2RlLCBtc2cuc3RhdHVzTWVzc2FnZSk7XG4gICAgICBlbHNlXG4gICAgICAgIHJlc3BvbnNlRGVidWdJbmZvICs9IGBTdGF0dXM6ICR7bXNnLnN0YXR1c0NvZGV9ICR7bXNnLnN0YXR1c01lc3NhZ2V9XFxuYDtcbiAgICAgIHJlc3BvbnNlRGVidWdJbmZvICs9ICdSZXNwb25zZSBoZWFkZXJzOlxcbicgKyBKU09OLnN0cmluZ2lmeShtc2cuaGVhZGVycywgbnVsbCwgMik7XG4gICAgICBoYWNrUmVzcG9uc2VIZWFkZXJzKHJlcSwgbXNnLmhlYWRlcnMsIHJlcywgcHJveHlJbnN0YW5jZSk7XG4gICAgICBsb2cuaW5mbyhyZXNwb25zZURlYnVnSW5mbyk7XG5cbiAgICAgIHZhciBjb250ZW50VHlwZSA9IF8uZ2V0KG1zZy5oZWFkZXJzLCAnY29udGVudC10eXBlJyk7XG4gICAgICBpZiAoY29udGVudFR5cGUgJiYgKGNvbnRlbnRUeXBlLmluZGV4T2YoJ3htbCcpID49IDAgfHwgY29udGVudFR5cGUuaW5kZXhPZigndGV4dCcpID49IDAgfHxcbiAgICAgICAgY29udGVudFR5cGUuaW5kZXhPZignanNvbicpID49IDAgKSkge1xuICAgICAgICBsb2dCb2R5LmluZm8oYFJlc3BvbnNlIGJvZHk6XFxuJHtjaGFsay5ibHVlKGJvZHkpfWApO1xuICAgICAgICByZXR1cm4gcmVzb2x2ZSh7aGVhZGVyczogbXNnLmhlYWRlcnMsIGJvZHksIHJlczogbXNnfSk7XG4gICAgICB9XG4gICAgICB2YXIgYnVmID0gQnVmZmVyLmNvbmNhdChidWZBcnJheSk7XG4gICAgICByZXR1cm4gcmVzb2x2ZSh7aGVhZGVyczogbXNnLmhlYWRlcnMsIGJvZHk6IGJ1ZiwgcmVzOiBtc2d9KTtcbiAgICB9KVxuICAgIC5vbignZGF0YScsIChiOiBCdWZmZXIpID0+IGJ1ZkFycmF5LnB1c2goYikpXG4gICAgLm9uKCdlbmQnLCAoKSA9PiB7fSk7XG4gIH0pO1xufVxuXG4vKipcbiAqIFRyYW5zcG9ydCByZXF1ZXN0IGZyb20gZXhwcmVzcyB0byBhIHJlcXVlc3Qgb3B0aW9ucy5mb3JtL2JvZHkgZm9yIFJlcXVlc3RcbiAqIEBwYXJhbSB7b2JqZWN0fSByZXFIZWFkZXJzIGV4cHJlc3NzIHJlcXVlc3QuaGVhZGVyc1xuICogQHBhcmFtIHtvYmplY3QgfCBzdHJpbmd9IHJlcUJvZHkgZXhwcmVzc3MgcmVxdWVzdC5ib2R5XG4gKiBAcGFyYW0ge29iamVjdH0gb3B0cyBSZXF1ZXN0IG9wdGlvbnNcbiAqIEByZXR1cm4gZGVidWcgc3RyaW5nXG4gKi9cbmZ1bmN0aW9uIGRvQm9keUFzeW5jKHJlcXVlc3ROdW06IG51bWJlciwgcmVxOiBleHByZXNzLlJlcXVlc3QsIHJlcUJvZHk6IGFueSwgb3B0czoge1trOiBzdHJpbmddOiBhbnl9KTpcbiAgc3RyaW5nIHwgUHJvbWlzZUxpa2U8c3RyaW5nPiB7XG4gIHZhciByZXFIZWFkZXJzOiB7W2s6IHN0cmluZ106IGFueX0gPSByZXEuaGVhZGVycztcbiAgaWYgKEJ1ZmZlci5pc0J1ZmZlcihyZXFCb2R5KSB8fCBfLmlzU3RyaW5nKHJlcUJvZHkpKSB7XG4gICAgLy8gXG4gICAgb3B0cy5ib2R5ID0gcmVxQm9keTtcbiAgICByZXR1cm4gJ0JvZHkgYXMgQnVmZmVyIG9yIHN0cmluZzogJyArIHJlcUJvZHkubGVuZ3RoO1xuICB9IGVsc2UgaWYgKF8uaXNPYmplY3QocmVxQm9keSkpIHtcbiAgICAvLyBSZXF1ZXN0IGJvZHkgaXMgb2JqZWN0IChKU09OLCBmb3JtIG9yIHN0cmVhbSlcbiAgICBjb25zdCByZXFDb250ZW50VHlwZSA9IHJlcUhlYWRlcnNbJ2NvbnRlbnQtdHlwZSddO1xuICAgIGlmIChyZXFDb250ZW50VHlwZSAmJiByZXFDb250ZW50VHlwZS5pbmRleE9mKCdqc29uJykgPj0gMCkge1xuICAgICAgb3B0cy5ib2R5ID0gSlNPTi5zdHJpbmdpZnkocmVxQm9keSk7XG4gICAgICByZXR1cm4gJ0JvZHkgYXMgSlNPTjogJyArIG9wdHMuYm9keTtcbiAgICB9IGVsc2UgaWYgKHJlcUNvbnRlbnRUeXBlICYmIHJlcUNvbnRlbnRUeXBlLmluZGV4T2YoJ2FwcGxpY2F0aW9uL3gtd3d3LWZvcm0tdXJsZW5jb2RlZCcpID49IDApIHtcbiAgICAgIG9wdHMuZm9ybSA9IHJlcUJvZHk7XG4gICAgICByZXR1cm4gJ0JvZHkgYXMgZm9ybTogJyArIEpTT04uc3RyaW5naWZ5KG9wdHMuZm9ybSk7XG4gICAgfVxuICB9XG5cbiAgLy8gUmVxdWVzdCBib2R5IGlzIHN0cmVhbVxuICBpZiAodHJhY2tSZXF1ZXN0U3RyZWFtKSB7XG4gICAgY29uc3QgdGVtcEZpbGU6IHN0cmluZyA9IGFwaS5jb25maWcucmVzb2x2ZSgnZGVzdERpcicsICdyZXF1ZXN0LWJvZHktJyArIHJlcXVlc3ROdW0pO1xuICAgIHZhciBvdXQgPSBmcy5jcmVhdGVXcml0ZVN0cmVhbSh0ZW1wRmlsZSk7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgIHJlcS5waXBlKG91dCkub24oJ2ZpbmlzaCcsICgpID0+IHtcbiAgICAgICAgbG9nLmluZm8oJ0ZpbmlzaGVkIHdyaXRpbmcgcmVxdWVzdCBib2R5IHRvIHRlbXAgZmlsZSAnLCB0ZW1wRmlsZSk7XG4gICAgICAgIG9wdHMuYm9keSA9IGZzLmNyZWF0ZVJlYWRTdHJlYW0odGVtcEZpbGUpO1xuICAgICAgICByZXNvbHZlKCdCb2R5IGFzIFJlYWRhYmxlIFN0cmVhbScpO1xuICAgICAgfSk7XG4gICAgfSk7XG4gIH0gZWxzZSB7XG4gICAgb3B0cy5ib2R5ID0gcmVxO1xuICAgIHJldHVybiAnQm9keSBhcyBSZWFkYWJsZSBTdHJlYW0nO1xuICB9XG59XG5cbmZ1bmN0aW9uIGhhY2tIZWFkZXJzKHRhcmdldDogc3RyaW5nLCByZXE6IGV4cHJlc3MuUmVxdWVzdCk6IHtbazogc3RyaW5nXTogYW55fSB7XG4gIHZhciB0b0hlYWRlcnMgPSBfLmFzc2lnbih7fSwgcmVxLmhlYWRlcnMsIHtcbiAgICAneC1yZWFsLWlwJzogcmVxLmlwLFxuICAgICd4LWZvcndhcmRlZF9mb3InOiByZXEuaXAsXG4gICAgJ3gtZm9yd2FyZGVkLWZvcic6IHJlcS5pcFxuICB9KTtcbiAgdmFyIHBhcnNlZFRhcmdldCA9IFVybC5wYXJzZSh0YXJnZXQpO1xuICB0b0hlYWRlcnMuaG9zdCA9IHBhcnNlZFRhcmdldC5ob3N0ITtcbiAgZGVsZXRlIHRvSGVhZGVycy5vcmlnaW47XG4gIGlmIChyZXEubWV0aG9kID09PSAnUE9TVCcpIHtcbiAgICB0b0hlYWRlcnMub3JpZ2luID0gcGFyc2VkVGFyZ2V0LnByb3RvY29sISArICcvLycgKyBwYXJzZWRUYXJnZXQuaG9zdDtcbiAgfVxuICBpZiAodG9IZWFkZXJzLnJlZmVyZXIpIHtcbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6bWF4LWxpbmUtbGVuZ3RoXG4gICAgdG9IZWFkZXJzLnJlZmVyZXIgPSBgJHtwYXJzZWRUYXJnZXQucHJvdG9jb2x9Ly8ke3BhcnNlZFRhcmdldC5ob3N0fSR7VXJsLnBhcnNlKHRvSGVhZGVycy5yZWZlcmVyIGFzIHN0cmluZykucGF0aG5hbWV9YDtcbiAgfVxuICByZXR1cm4gdG9IZWFkZXJzO1xufVxuXG5mdW5jdGlvbiBoYWNrUmVzcG9uc2VIZWFkZXJzKHJlcTogZXhwcmVzcy5SZXF1ZXN0LCBvcmlnaW5IZWFkZXJzOiB7W2s6IHN0cmluZ106IGFueX0sIHJlc3BvbnNlOiBleHByZXNzLlJlc3BvbnNlLFxuICBwcm94eUluc3RhbmNlOiBQcm94eUluc3RhbmNlKSB7XG4gIF8uZWFjaChvcmlnaW5IZWFkZXJzLCAodiwgbikgPT4ge1xuICAgIGlmICghXy5nZXQoU0tJUF9SRVNfSEVBREVSU19TRVQsIG4udG9Mb3dlckNhc2UoKSkpIHtcbiAgICAgIGlmIChuID09PSAnc2V0LWNvb2tpZScgJiYgcHJveHlJbnN0YW5jZS5pc1JlbW92ZUNvb2tpZURvbWFpbikge1xuICAgICAgICB2ID0gdi5tYXAoKGNvb2tpZTogYW55KSA9PiB7XG4gICAgICAgICAgdmFyIGF0dHJzOiBzdHJpbmdbXSA9IGNvb2tpZS5zcGxpdCgnOycpO1xuICAgICAgICAgIHJldHVybiBhdHRycy5maWx0ZXIoKHZhbHVlKSA9PiAhdmFsdWUuc3RhcnRzV2l0aCgnZG9tYWluJykpLmpvaW4oJzsnKTtcbiAgICAgICAgfSk7XG4gICAgICAgIGxvZy5pbmZvKCdEb21haW4gYXR0cmlidXRlIGlzIHJlbW92ZWQgZnJvbSBzZXQtY29va2llIGhlYWRlcjogJywgdik7XG4gICAgICB9XG4gICAgICByZXNwb25zZS5zZXQobiwgdik7XG4gICAgfSBlbHNlXG4gICAgICBsb2cuZGVidWcoJ3NraXAgcmVzcG9uc2UgaGVhZGVyOiAlcycsIG4pO1xuICB9KTtcbn1cbiJdfQ==