import api from '__api';
import * as _ from 'lodash';
import * as log4js from 'log4js';
import * as express from 'express';
var log = log4js.getLogger(api.packageName);
import doProxy from './proxy-handler';
import {ProxyInstanceForBrowser} from '../isom/proxy-instance';
export * from '../isom/proxy-instance';

export function activate() {
  // api.router().use('/', api.cors());
  testRouter();
  var multiProxies = api.config.get([api.packageName, 'proxies']);
  if (multiProxies) {
    _.each(multiProxies, (target, name) => useProxy(api.router(), target, name));
  } else {
    var proxyTo = api.config.get(api.packageName + '.proxyTo');
    if (proxyTo == null) {
      log.warn('No proxy configuration "%s" found', api.packageName + '.proxies');
      return;
    }
    useProxy(api.router(), proxyTo, '');
  }
}

export class ProxyInstance extends ProxyInstanceForBrowser {
  constructor(name: string, options: {[k: string]: any} = {}) {
    super(name, options);
  }

  useProxy(router: any, target: string) {
    useProxy(router, target, this.name);
  }
}

var proxyInstances: {[k: string]: ProxyInstance} = {};
export function forName(name: string, opts?: {[k: string]: any}): ProxyInstance {
  if (proxyInstances[name])
    return proxyInstances[name];
  var p = new ProxyInstance(name, opts);
  proxyInstances[name] = p;
  return p;
}

export function forEach(callback: (proxyInstance: ProxyInstance) => void): void {
  var multiProxies = api.config.get([api.packageName, 'proxies']);
  if (multiProxies) {
    _.each(multiProxies, (target, name) => callback(forName(name)));
  } else {
    callback(forName(''));
  }
}

/**
 * Add proxy middlewares to a specific router path
	* @param {Route} router Express router instance, could be `api.router()`
	* @param {string} target a full http URL, e.g. https://www-demo.foobar.com
	* @param {string} proxyPath sub path the proxy middleware will be handling on
 */
export function useProxy(router: express.Router, target: string, proxyPath: string): void {
  if (proxyPath == null)
    proxyPath = '/';
  if (!proxyPath.startsWith('/'))
    proxyPath = '/' + proxyPath;
  target = _.trimEnd(target, '/');
  var proxyName = _.trimStart(proxyPath, '/');

  router.use(proxyPath, api.cors());
  router.use(proxyPath, (req: express.Request, res: express.Response) => {
    doProxy(target, req, res, forName(proxyName), proxyName);
  });
  log.info('Proxy %s to %s', proxyPath, target);
}

function testRouter(): void {
  api.router().use('/_test', (req: express.Request, res: express.Response) => {
    var s = '<pre>';
    s += JSON.stringify(req.headers, null, '\t') + '</pre>';
    _.forIn(req, (v, k) => {
      if (k.startsWith('_') || _.isFunction(v) || k === 'headers')
        return;
      try {
        log.info(k + ': ' + v);
        s += '<b>' + k + '</b>: ' + v + '<br/>';
      } catch (e) {
        log.error('cant resolve property %s', k);
      }
    });
    res.send(s);
  });
}
