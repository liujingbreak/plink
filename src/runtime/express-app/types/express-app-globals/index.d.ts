import express from 'express';
// import {DrcpApi} from '__api';

declare module '@wfh/plink/wfh/globals' {
  interface DrcpApi {
    express: typeof express;
    expressApp: express.Application;
    // swig: any;
    use: express.Router['use'];
    /** return a pre-created express Router whose context path by default is package name,
     * 
    */
    router(): express.Router;
    /**
     * Before any system middleware
       e.g.
      ```
	     	api.expressAppSet((app, express) => {
 	     		app.set('trust proxy', true);
 	     		app.set('views', Path.resolve(api.config().rootPath, '../web/views/'));
          });
      ```
     * @param callable 
     */
    expressAppSet(callable: (app: express.Application, exp: typeof express) => void): void;
    /**
     * Add middleware after system middleware
     * @param callable 
     */
    expressAppUse(callable: (app: express.Application, exp: typeof express) => void): void;
    /**
     * e.g.
  ```
    api.expressAppSet((app, express) => {
      app.use(api.contentPath, api.cors());
    });
  ```
    * @return void
    */
    cors(allowedOrigins?: string[]): express.RequestHandler;

    param(name: string, ...rest: any[]): any;
    _router: express.Router;
  }
}
