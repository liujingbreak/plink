import * as express from 'express';
import { ProxyInstance } from './server';
/**
 * @param {*} target {string} URL of proxying target
 * @param {*} req {request}
 * @param {*} res {response}
 * @param {*} proxyInstance
 * @param {*} proxyName {string} proxy sub path which should not starts with '/'
 * @return undefined
 */
export default function doProxy(target: string, req: express.Request, res: express.Response, proxyInstance: ProxyInstance, proxyName: string): Promise<void>;
