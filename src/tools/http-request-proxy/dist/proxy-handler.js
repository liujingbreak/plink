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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3dlYi1mdW4taG91c2Uvc3JjL3Rvb2xzL2h0dHAtcmVxdWVzdC1wcm94eS90cy9wcm94eS1oYW5kbGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLElBQUksT0FBTyxHQUFHLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQztBQUNqQyxrREFBd0I7QUFDeEIsMENBQTRCO0FBRzVCLHVEQUF1RDtBQUN2RCwyREFBaUQ7QUFDakQsOENBQXNCO0FBRXRCLHVDQUF5QjtBQUN6QixJQUFJLEdBQUcsR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsU0FBUyxDQUFDLGVBQUcsQ0FBQyxXQUFXLEdBQUcsTUFBTSxDQUFDLENBQUM7QUFDaEUsSUFBSSxPQUFPLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxlQUFHLENBQUMsV0FBVyxHQUFHLE9BQU8sQ0FBQyxDQUFDO0FBRXJFLElBQUksS0FBSyxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQztBQUM3QixJQUFJLGtCQUFrQixHQUFHLGVBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLGVBQUcsQ0FBQyxXQUFXLEdBQUcscUJBQXFCLENBQUMsQ0FBQztBQUVqRixJQUFJLFlBQVksR0FBRyxDQUFDLENBQUM7QUFFckIsSUFBSSxnQkFBZ0IsR0FBRztJQUNyQixtQkFBbUI7SUFDbkIsa0JBQWtCO0lBQ2xCLG1CQUFtQjtJQUNuQiw2QkFBNkI7Q0FDOUIsQ0FBQztBQUNGLElBQUksb0JBQW9CLEdBQUcsZ0JBQWdCLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBMkIsRUFBRSxJQUFJLEVBQUUsRUFBRTtJQUN2RixHQUFHLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDO0lBQy9CLE9BQU8sR0FBRyxDQUFDO0FBQ2IsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO0FBRVA7Ozs7Ozs7R0FPRztBQUNILFNBQThCLE9BQU8sQ0FBQyxNQUFjLEVBQUUsR0FBb0IsRUFBRSxHQUFxQixFQUMvRixhQUE0QixFQUFFLFNBQWlCOztRQUMvQyxJQUFJLFVBQVUsR0FBRyxFQUFFLFlBQVksQ0FBQztRQUVoQyxJQUFJLEtBQUssR0FBRyxNQUFNLEdBQUcsR0FBRyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQ25ELElBQUksR0FBRyxDQUFDLE1BQU0sS0FBSyxLQUFLO1lBQ3RCLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxTQUFTLEdBQUcsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1FBQy9FLGlDQUFpQztRQUNqQyxJQUFJLFNBQVMsR0FBRyxXQUFXLENBQUMsTUFBTSxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQ3pDLG1DQUFtQztRQUNuQyxJQUFJLGdCQUFnQixHQUFHLE9BQU8sVUFBVSxhQUFhLEtBQUssQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxJQUFJLEtBQUssQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUk7WUFDdEcsZ0JBQWdCLEdBQUcsQ0FBQyxXQUFXLElBQUk7WUFDbkMsa0NBQWtDO1lBQ2xDLGlFQUFpRTtZQUNqRSxrQkFBa0IsSUFBSSxDQUFDLFNBQVMsQ0FBQyxTQUFTLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUM7UUFDekQsZ0ZBQWdGO1FBQ2hGLElBQUksSUFBSSxHQUFHO1lBQ1QsR0FBRyxFQUFFLEtBQUs7WUFDVixNQUFNLEVBQUUsR0FBRyxDQUFDLE1BQU07WUFDbEIsT0FBTyxFQUFFLFNBQVM7WUFDbEIsU0FBUyxFQUFFLEtBQUs7WUFDaEIsSUFBSSxFQUFFLEtBQUs7WUFDWCxPQUFPLEVBQUUsZUFBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsZUFBRyxDQUFDLFdBQVcsR0FBRyxVQUFVLEVBQUUsS0FBSyxDQUFDO1lBQzVELHdFQUF3RTtZQUN4RSxxQ0FBcUM7WUFDckMsSUFBSSxFQUFFLFNBQVMsQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLFNBQVMsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDO1NBQ3hGLENBQUM7UUFFRixJQUFJO1lBQ0YsTUFBTSxRQUFRLEdBQUcsTUFBTSwwQkFBUyxDQUFDLEdBQUcsRUFBRSxTQUFTLEVBQUUsR0FBRyxDQUFDLElBQUksRUFBRSxhQUFhLENBQUMsWUFBWSxFQUFFLFNBQVMsQ0FBQyxDQUFDO1lBQ2xHLElBQUksUUFBUSxJQUFJLElBQUksRUFBRTtnQkFDcEIsR0FBRyxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO2dCQUMzQixNQUFNLEdBQUcsR0FBRyxNQUFNLE9BQU8sQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLFVBQVUsRUFBRSxHQUFHLEVBQUUsR0FBRyxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDO2dCQUNoRixHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO2dCQUNkLEdBQUcsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUN0RyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQzthQUNoQztpQkFBTTtnQkFDTCxNQUFNLE1BQU0sR0FBRyxNQUFNLDBCQUFTLENBQUMsR0FBRyxFQUFFLFNBQVMsRUFBRSxHQUFHLENBQUMsSUFBSSxFQUFFLGFBQWEsQ0FBQyxXQUFXLEVBQUUsU0FBUyxDQUFDLENBQUM7Z0JBQy9GLE1BQU0sT0FBTyxHQUFHLE1BQU0sSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQztnQkFDbkQsTUFBTSxHQUFHLEdBQUcsTUFBTSxPQUFPLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxVQUFVLEVBQUUsR0FBRyxFQUFFLE9BQU8sRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDO2dCQUMvRSxnQkFBZ0IsSUFBSSxHQUFHLENBQUM7Z0JBQ3hCLE1BQU0sSUFBSSxHQUFHLE1BQU0sSUFBSSxDQUFDLEdBQUcsRUFBRSxJQUFJLEVBQUUsZ0JBQWdCLEVBQUUsVUFBVSxFQUFFLEdBQUcsRUFBRSxhQUFhLENBQUMsQ0FBQztnQkFDckYsTUFBTSxJQUFJLEdBQUcsTUFBTSwwQkFBUyxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsYUFBYSxDQUFDLFdBQVcsRUFBRSxTQUFTLENBQUMsQ0FBQztnQkFDakcsSUFBSSxJQUFJO29CQUNOLE9BQU8sQ0FBQyxJQUFJLENBQUMsMEJBQTBCLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUM7d0JBQzFFLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7Z0JBQ2xFLElBQUksSUFBSSxDQUFDLEdBQUcsQ0FBQyxVQUFVO29CQUNyQixHQUFHLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDO2FBQ3pFO1NBQ0Y7UUFBQyxPQUFNLEdBQUcsRUFBRTtZQUNYLEdBQUcsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDZixHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUM7U0FDbkM7SUFDSCxDQUFDO0NBQUE7QUFyREQsMEJBcURDO0FBRUQsU0FBUyxJQUFJLENBQUMsR0FBb0IsRUFBRSxJQUFTLEVBQUUsZ0JBQXFCLEVBQUUsVUFBa0IsRUFBRSxHQUFxQixFQUM3RyxhQUE0QjtJQUU1QixPQUFPLElBQUksT0FBTyxDQUFDLENBQUMsT0FBTyxFQUFFLE1BQU0sRUFBRSxFQUFFO1FBQ3JDLElBQUksUUFBUSxHQUFhLEVBQUUsQ0FBQztRQUM1QixPQUFPLENBQUMsSUFBSSxFQUFFLENBQUMsR0FBVSxFQUFFLEdBQW9CLEVBQUUsSUFBbUIsRUFBRSxFQUFFO1lBQ3RFLEdBQUcsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztZQUMzQixJQUFJLGlCQUFpQixHQUFHLEtBQUssVUFBVSxhQUFhLENBQUM7WUFDckQsSUFBSSxHQUFHLEVBQUU7Z0JBQ1AsR0FBRyxDQUFDLEtBQUssQ0FBQyxpQkFBaUIsR0FBRyxFQUFFLENBQUMsQ0FBQztnQkFDbEMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDO2dCQUNaLE9BQU87YUFDUjtZQUNELElBQUksR0FBRyxDQUFDLFVBQVUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxVQUFVLEdBQUcsR0FBRyxJQUFJLEdBQUcsQ0FBQyxVQUFVLEdBQUcsR0FBRyxDQUFDO2dCQUNsRSxHQUFHLENBQUMsSUFBSSxDQUFDLGVBQWUsRUFBRSxHQUFHLENBQUMsVUFBVSxFQUFFLEdBQUcsQ0FBQyxhQUFhLENBQUMsQ0FBQzs7Z0JBRTdELGlCQUFpQixJQUFJLFdBQVcsR0FBRyxDQUFDLFVBQVUsSUFBSSxHQUFHLENBQUMsYUFBYSxJQUFJLENBQUM7WUFDMUUsaUJBQWlCLElBQUkscUJBQXFCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQztZQUNsRixtQkFBbUIsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLE9BQU8sRUFBRSxHQUFHLEVBQUUsYUFBYSxDQUFDLENBQUM7WUFDMUQsR0FBRyxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO1lBRTVCLElBQUksV0FBVyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLE9BQU8sRUFBRSxjQUFjLENBQUMsQ0FBQztZQUNyRCxJQUFJLFdBQVcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLFdBQVcsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQztnQkFDckYsV0FBVyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUUsRUFBRTtnQkFDcEMsT0FBTyxDQUFDLElBQUksQ0FBQyxtQkFBbUIsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7Z0JBQ3BELE9BQU8sT0FBTyxDQUFDLEVBQUMsT0FBTyxFQUFFLEdBQUcsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUMsQ0FBQyxDQUFDO2FBQ3hEO1lBQ0QsSUFBSSxHQUFHLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUNsQyxPQUFPLE9BQU8sQ0FBQyxFQUFDLE9BQU8sRUFBRSxHQUFHLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBQyxDQUFDLENBQUM7UUFDOUQsQ0FBQyxDQUFDO2FBQ0QsRUFBRSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQVMsRUFBRSxFQUFFLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQzthQUMzQyxFQUFFLENBQUMsS0FBSyxFQUFFLEdBQUcsRUFBRSxHQUFFLENBQUMsQ0FBQyxDQUFDO0lBQ3ZCLENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQztBQUVEOzs7Ozs7R0FNRztBQUNILFNBQVMsV0FBVyxDQUFDLFVBQWtCLEVBQUUsR0FBb0IsRUFBRSxPQUFZLEVBQUUsSUFBd0I7SUFFbkcsSUFBSSxVQUFVLEdBQXVCLEdBQUcsQ0FBQyxPQUFPLENBQUM7SUFDakQsSUFBSSxNQUFNLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLEVBQUU7UUFDbkQsR0FBRztRQUNILElBQUksQ0FBQyxJQUFJLEdBQUcsT0FBTyxDQUFDO1FBQ3BCLE9BQU8sNEJBQTRCLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQztLQUN0RDtTQUFNLElBQUksQ0FBQyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsRUFBRTtRQUM5QixnREFBZ0Q7UUFDaEQsTUFBTSxjQUFjLEdBQUcsVUFBVSxDQUFDLGNBQWMsQ0FBQyxDQUFDO1FBQ2xELElBQUksY0FBYyxJQUFJLGNBQWMsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxFQUFFO1lBQ3pELElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUNwQyxPQUFPLGdCQUFnQixHQUFHLElBQUksQ0FBQyxJQUFJLENBQUM7U0FDckM7YUFBTSxJQUFJLGNBQWMsSUFBSSxjQUFjLENBQUMsT0FBTyxDQUFDLG1DQUFtQyxDQUFDLElBQUksQ0FBQyxFQUFFO1lBQzdGLElBQUksQ0FBQyxJQUFJLEdBQUcsT0FBTyxDQUFDO1lBQ3BCLE9BQU8sZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7U0FDckQ7S0FDRjtJQUVELHlCQUF5QjtJQUN6QixJQUFJLGtCQUFrQixFQUFFO1FBQ3RCLE1BQU0sUUFBUSxHQUFXLGVBQUcsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSxlQUFlLEdBQUcsVUFBVSxDQUFDLENBQUM7UUFDckYsSUFBSSxHQUFHLEdBQUcsRUFBRSxDQUFDLGlCQUFpQixDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ3pDLE9BQU8sSUFBSSxPQUFPLENBQUMsQ0FBQyxPQUFPLEVBQUUsTUFBTSxFQUFFLEVBQUU7WUFDckMsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsUUFBUSxFQUFFLEdBQUcsRUFBRTtnQkFDOUIsR0FBRyxDQUFDLElBQUksQ0FBQyw2Q0FBNkMsRUFBRSxRQUFRLENBQUMsQ0FBQztnQkFDbEUsSUFBSSxDQUFDLElBQUksR0FBRyxFQUFFLENBQUMsZ0JBQWdCLENBQUMsUUFBUSxDQUFDLENBQUM7Z0JBQzFDLE9BQU8sQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDO1lBQ3JDLENBQUMsQ0FBQyxDQUFDO1FBQ0wsQ0FBQyxDQUFDLENBQUM7S0FDSjtTQUFNO1FBQ0wsSUFBSSxDQUFDLElBQUksR0FBRyxHQUFHLENBQUM7UUFDaEIsT0FBTyx5QkFBeUIsQ0FBQztLQUNsQztBQUNILENBQUM7QUFFRCxTQUFTLFdBQVcsQ0FBQyxNQUFjLEVBQUUsR0FBb0I7SUFDdkQsSUFBSSxTQUFTLEdBQUcsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxFQUFFLEVBQUUsR0FBRyxDQUFDLE9BQU8sRUFBRTtRQUN4QyxXQUFXLEVBQUUsR0FBRyxDQUFDLEVBQUU7UUFDbkIsaUJBQWlCLEVBQUUsR0FBRyxDQUFDLEVBQUU7UUFDekIsaUJBQWlCLEVBQUUsR0FBRyxDQUFDLEVBQUU7S0FDMUIsQ0FBQyxDQUFDO0lBQ0gsSUFBSSxZQUFZLEdBQUcsYUFBRyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUNyQyxTQUFTLENBQUMsSUFBSSxHQUFHLFlBQVksQ0FBQyxJQUFLLENBQUM7SUFDcEMsT0FBTyxTQUFTLENBQUMsTUFBTSxDQUFDO0lBQ3hCLElBQUksR0FBRyxDQUFDLE1BQU0sS0FBSyxNQUFNLEVBQUU7UUFDekIsU0FBUyxDQUFDLE1BQU0sR0FBRyxZQUFZLENBQUMsUUFBUyxHQUFHLElBQUksR0FBRyxZQUFZLENBQUMsSUFBSSxDQUFDO0tBQ3RFO0lBQ0QsSUFBSSxTQUFTLENBQUMsT0FBTyxFQUFFO1FBQ3JCLDJDQUEyQztRQUMzQyxTQUFTLENBQUMsT0FBTyxHQUFHLEdBQUcsWUFBWSxDQUFDLFFBQVEsS0FBSyxZQUFZLENBQUMsSUFBSSxHQUFHLGFBQUcsQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLE9BQWlCLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQztLQUN4SDtJQUNELE9BQU8sU0FBUyxDQUFDO0FBQ25CLENBQUM7QUFFRCxTQUFTLG1CQUFtQixDQUFDLEdBQW9CLEVBQUUsYUFBaUMsRUFBRSxRQUEwQixFQUM5RyxhQUE0QjtJQUM1QixDQUFDLENBQUMsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRTtRQUM3QixJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsRUFBRSxDQUFDLENBQUMsV0FBVyxFQUFFLENBQUMsRUFBRTtZQUNqRCxJQUFJLENBQUMsS0FBSyxZQUFZLElBQUksYUFBYSxDQUFDLG9CQUFvQixFQUFFO2dCQUM1RCxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLE1BQVcsRUFBRSxFQUFFO29CQUN4QixJQUFJLEtBQUssR0FBYSxNQUFNLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO29CQUN4QyxPQUFPLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFDeEUsQ0FBQyxDQUFDLENBQUM7Z0JBQ0gsR0FBRyxDQUFDLElBQUksQ0FBQyxzREFBc0QsRUFBRSxDQUFDLENBQUMsQ0FBQzthQUNyRTtZQUNELFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1NBQ3BCOztZQUNDLEdBQUcsQ0FBQyxLQUFLLENBQUMsMEJBQTBCLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDN0MsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDIiwiZmlsZSI6InRvb2xzL2h0dHAtcmVxdWVzdC1wcm94eS9kaXN0L3Byb3h5LWhhbmRsZXIuanMiLCJzb3VyY2VzQ29udGVudCI6W251bGxdfQ==
