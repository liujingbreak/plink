import {join} from 'path';
import {log4File} from '@wfh/plink';
import {Request, Response, NextFunction} from 'express';
import {readFile, existsSync} from 'fs-extra';
import * as _ from 'lodash';
import api from '__api';
const log = log4File(__filename);

export const ROUTE_MAP_FILE = 'prerender-routes.json';
const staticDir: string = api.config.resolve('staticDir');

export class PrerenderForExpress {
  // noPrerender = false;
  prerenderPages: {[route: string]: string} = {}; // page contents
  // lastQueried: Map<string, number> = new Map();
  prerenderMap: {[route: string]: string} = {};

  /**
	 * constructor
	 * @param routeMapFiles array of dist/static/<app>/_prerender/prerender-routes.json
	 */
  constructor(...routeMapFiles: string[]) {
    // this.prerenderMapFile = join(staticDir, this.applName, '_prerender', ROUTE_MAP_FILE);
    // this.noPrerender = !existsSync(this.prerenderMapFile);
    // if (this.noPrerender) {
    // 	log.warn('No prerender files found in ', this.prerenderMapFile);
    // 	return;
    // }
    void this.queryPrerenderPages(routeMapFiles)
      .then(pages => this.prerenderPages = pages);

    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    api.eventBus?.on('@wfh/assets-processer.downloaded', async () => {
      log.info('assets downloaded, update prerendered pages');
      const pages = await this.queryPrerenderPages(routeMapFiles);
      this.prerenderPages = pages;
    });
  }

  asMiddleware() {
    // if (api.argv.hmr) {
    //   log.warn('Hot module replacement mode is on, no prerendered page will be served\n');
    //   return (req: Request, res: Response, next: NextFunction) => next();
    // }
    return (req: Request, res: Response, next: NextFunction) => {
      if (req.method !== 'GET')
        return next();
      const route = _.trimEnd(req.originalUrl, '/');
      if (_.has(this.prerenderPages, route)) {
        log.info('Serve with prerender page for ', route);
        if (this.prerenderPages[route] === null) {
          readFile(join(staticDir, this.prerenderMap[route]), 'utf-8', (err, cont) => {
            if (err) {
              log.error('Failed to read prerendered page: ' + this.prerenderMap[route], err);
              next();
            }
            this.prerenderPages[route] = cont;
            res.send(cont);
          });
        } else {
          res.send(this.prerenderPages[route]);
        }
      } else {
        next();
      }
    };
  }

  protected async queryPrerenderPages(routeMapFiles: string[]) {
    const pages: {[route: string]: string} = {};
    const allDone: Array<Promise<void>> = [];
    for (const prerenderMapFile of routeMapFiles) {
      if (!existsSync(prerenderMapFile))
        continue;
      log.info('read', prerenderMapFile);
      allDone.push(new Promise((resolve, rej) => {
        readFile(prerenderMapFile, 'utf-8', (err, content) => {
          if (err)
            return rej(err);
          this.prerenderMap = JSON.parse(content);
          _.forEach(this.prerenderMap, (file, route) => {
            pages[route] = file;
          });
          resolve();
        });
      }));
    }
    await Promise.all(allDone);
    return pages;
  }
}
