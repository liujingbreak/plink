import * as express from 'express';
export interface ExpressAppApi {
	express: any;
	expressApp: express.Application;
	swig: any;
	router(): express.Router;
	expressAppSet(callable: (app: express.Express, express: any) => void): void;
	cors(): any;
	use(path: string | any, ...rest: any[]): any;
	param(name: string, ...rest: any[]): any;
}
