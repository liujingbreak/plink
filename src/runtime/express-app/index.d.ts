import * as express from 'express';
export interface ExpressAppApi {
	express: typeof express;
	expressApp: express.Application;
	swig: any;
	router(): express.Router;
	expressAppSet(callable: (app: express.Application, express: any) => void): void;
	expressAppUse(callable: (app: express.Application, express: any) => void): void;
	cors(): any;
	use(path: string | any, ...rest: any[]): any;
	param(name: string, ...rest: any[]): any;
}
