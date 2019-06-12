/* tslint:disable max-line-length */
// import './node-inject';
// import {
// 	BuildEvent,
// 	BuilderConfiguration
//   } from '@angular-devkit/architect';
//   import { WebpackBuilder } from '@angular-devkit/build-webpack';
//   import { normalize, resolve, virtualFs } from '@angular-devkit/core';
//   import * as fs from 'fs';
//   import { Observable, of } from 'rxjs';
//   import { concatMap } from 'rxjs/operators';
//   import { augmentAppWithServiceWorker } from '@angular-devkit/build-angular/src/angular-cli-files/utilities/service-worker';
//   import { normalizeBuilderSchema } from '@angular-devkit/build-angular/src/utils';
// import { BrowserBuilderSchema } from '@angular-devkit/build-angular/src/browser/schema';
// import {BrowserBuilder as GoogleBrowserBuilder, getBrowserLoggingCb} from '@angular-devkit/build-angular';
// import * as drcpCommon from './common';
// export default class BrowserBuilder extends GoogleBrowserBuilder {
// 	run(builderConfig: BuilderConfiguration<BrowserBuilderSchema>): Observable<BuildEvent> {
// 	const root = this.context.workspace.root;
// 	const projectRoot = resolve(root, builderConfig.root);
// 	const host = new virtualFs.AliasHost(this.context.host as virtualFs.Host<fs.Stats>);
// 	const webpackBuilder = new WebpackBuilder({ ...this.context, host });
// 	const options = normalizeBuilderSchema(
// 		host,
// 		root,
// 		builderConfig
// 	);
// 	return of(null).pipe(
// 		concatMap(() => options.deleteOutputPath
// 		? (this as any)._deleteOutputDir(root, normalize(options.outputPath), this.context.host)
// 		: of(null)),
// 		concatMap(() => {
// 			return drcpCommon.compile(builderConfig.root, options,
// 				() => this.buildWebpackConfig(root, projectRoot, host, options));
// 		}),
// 		concatMap((webpackConfig) => {
// 			return webpackBuilder.runWebpack(webpackConfig, getBrowserLoggingCb(options.verbose));
// 		}),
// 		concatMap((buildEvent) => {
// 		if (buildEvent.success && !options.watch && options.serviceWorker) {
// 			return new Observable<BuildEvent>(obs => {
// 				augmentAppWithServiceWorker(
// 					this.context.host,
// 					root,
// 					projectRoot,
// 					resolve(root, normalize(options.outputPath)),
// 					options.baseHref || '/',
// 					options.ngswConfigPath
// 				).then(
// 					() => {
// 						obs.next({ success: true });
// 						obs.complete();
// 					},
// 					(err: Error) => {
// 						obs.error(err);
// 					}
// 				);
// 			});
// 		} else {
// 			return of(buildEvent);
// 		}
// 		})
// 	);
//   }
// }

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci90cy9uZy9icm93c2VyLWJ1aWxkZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsb0NBQW9DO0FBQ3BDLDBCQUEwQjtBQUUxQixXQUFXO0FBQ1gsZUFBZTtBQUNmLHdCQUF3QjtBQUN4Qix3Q0FBd0M7QUFDeEMsb0VBQW9FO0FBQ3BFLDBFQUEwRTtBQUMxRSw4QkFBOEI7QUFDOUIsMkNBQTJDO0FBQzNDLGdEQUFnRDtBQUNoRCxnSUFBZ0k7QUFDaEksc0ZBQXNGO0FBQ3RGLDJGQUEyRjtBQUUzRiw2R0FBNkc7QUFDN0csMENBQTBDO0FBRTFDLHFFQUFxRTtBQUNyRSw0RkFBNEY7QUFDNUYsNkNBQTZDO0FBQzdDLDBEQUEwRDtBQUMxRCx3RkFBd0Y7QUFDeEYseUVBQXlFO0FBRXpFLDJDQUEyQztBQUMzQyxVQUFVO0FBQ1YsVUFBVTtBQUNWLGtCQUFrQjtBQUNsQixNQUFNO0FBRU4seUJBQXlCO0FBQ3pCLDZDQUE2QztBQUM3Qyw2RkFBNkY7QUFDN0YsaUJBQWlCO0FBQ2pCLHNCQUFzQjtBQUN0Qiw0REFBNEQ7QUFDNUQsd0VBQXdFO0FBQ3hFLFFBQVE7QUFDUixtQ0FBbUM7QUFDbkMsNEZBQTRGO0FBQzVGLFFBQVE7QUFDUixnQ0FBZ0M7QUFDaEMseUVBQXlFO0FBQ3pFLGdEQUFnRDtBQUNoRCxtQ0FBbUM7QUFDbkMsMEJBQTBCO0FBQzFCLGFBQWE7QUFDYixvQkFBb0I7QUFDcEIscURBQXFEO0FBQ3JELGdDQUFnQztBQUNoQyw4QkFBOEI7QUFDOUIsY0FBYztBQUNkLGVBQWU7QUFDZixxQ0FBcUM7QUFDckMsd0JBQXdCO0FBQ3hCLFVBQVU7QUFDVix5QkFBeUI7QUFDekIsd0JBQXdCO0FBQ3hCLFNBQVM7QUFDVCxTQUFTO0FBQ1QsU0FBUztBQUNULGFBQWE7QUFDYiw0QkFBNEI7QUFDNUIsTUFBTTtBQUNOLE9BQU87QUFDUCxNQUFNO0FBQ04sTUFBTTtBQUVOLElBQUkiLCJmaWxlIjoibm9kZV9tb2R1bGVzL0Bkci1jb3JlL25nLWFwcC1idWlsZGVyL2Rpc3QvbmcvYnJvd3Nlci1idWlsZGVyLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLyogdHNsaW50OmRpc2FibGUgbWF4LWxpbmUtbGVuZ3RoICovXG4vLyBpbXBvcnQgJy4vbm9kZS1pbmplY3QnO1xuXG4vLyBpbXBvcnQge1xuLy8gXHRCdWlsZEV2ZW50LFxuLy8gXHRCdWlsZGVyQ29uZmlndXJhdGlvblxuLy8gICB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9hcmNoaXRlY3QnO1xuLy8gICBpbXBvcnQgeyBXZWJwYWNrQnVpbGRlciB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9idWlsZC13ZWJwYWNrJztcbi8vICAgaW1wb3J0IHsgbm9ybWFsaXplLCByZXNvbHZlLCB2aXJ0dWFsRnMgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvY29yZSc7XG4vLyAgIGltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcbi8vICAgaW1wb3J0IHsgT2JzZXJ2YWJsZSwgb2YgfSBmcm9tICdyeGpzJztcbi8vICAgaW1wb3J0IHsgY29uY2F0TWFwIH0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuLy8gICBpbXBvcnQgeyBhdWdtZW50QXBwV2l0aFNlcnZpY2VXb3JrZXIgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvYnVpbGQtYW5ndWxhci9zcmMvYW5ndWxhci1jbGktZmlsZXMvdXRpbGl0aWVzL3NlcnZpY2Utd29ya2VyJztcbi8vICAgaW1wb3J0IHsgbm9ybWFsaXplQnVpbGRlclNjaGVtYSB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9idWlsZC1hbmd1bGFyL3NyYy91dGlscyc7XG4vLyBpbXBvcnQgeyBCcm93c2VyQnVpbGRlclNjaGVtYSB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9idWlsZC1hbmd1bGFyL3NyYy9icm93c2VyL3NjaGVtYSc7XG5cbi8vIGltcG9ydCB7QnJvd3NlckJ1aWxkZXIgYXMgR29vZ2xlQnJvd3NlckJ1aWxkZXIsIGdldEJyb3dzZXJMb2dnaW5nQ2J9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9idWlsZC1hbmd1bGFyJztcbi8vIGltcG9ydCAqIGFzIGRyY3BDb21tb24gZnJvbSAnLi9jb21tb24nO1xuXG4vLyBleHBvcnQgZGVmYXVsdCBjbGFzcyBCcm93c2VyQnVpbGRlciBleHRlbmRzIEdvb2dsZUJyb3dzZXJCdWlsZGVyIHtcbi8vIFx0cnVuKGJ1aWxkZXJDb25maWc6IEJ1aWxkZXJDb25maWd1cmF0aW9uPEJyb3dzZXJCdWlsZGVyU2NoZW1hPik6IE9ic2VydmFibGU8QnVpbGRFdmVudD4ge1xuLy8gXHRjb25zdCByb290ID0gdGhpcy5jb250ZXh0LndvcmtzcGFjZS5yb290O1xuLy8gXHRjb25zdCBwcm9qZWN0Um9vdCA9IHJlc29sdmUocm9vdCwgYnVpbGRlckNvbmZpZy5yb290KTtcbi8vIFx0Y29uc3QgaG9zdCA9IG5ldyB2aXJ0dWFsRnMuQWxpYXNIb3N0KHRoaXMuY29udGV4dC5ob3N0IGFzIHZpcnR1YWxGcy5Ib3N0PGZzLlN0YXRzPik7XG4vLyBcdGNvbnN0IHdlYnBhY2tCdWlsZGVyID0gbmV3IFdlYnBhY2tCdWlsZGVyKHsgLi4udGhpcy5jb250ZXh0LCBob3N0IH0pO1xuXG4vLyBcdGNvbnN0IG9wdGlvbnMgPSBub3JtYWxpemVCdWlsZGVyU2NoZW1hKFxuLy8gXHRcdGhvc3QsXG4vLyBcdFx0cm9vdCxcbi8vIFx0XHRidWlsZGVyQ29uZmlnXG4vLyBcdCk7XG5cbi8vIFx0cmV0dXJuIG9mKG51bGwpLnBpcGUoXG4vLyBcdFx0Y29uY2F0TWFwKCgpID0+IG9wdGlvbnMuZGVsZXRlT3V0cHV0UGF0aFxuLy8gXHRcdD8gKHRoaXMgYXMgYW55KS5fZGVsZXRlT3V0cHV0RGlyKHJvb3QsIG5vcm1hbGl6ZShvcHRpb25zLm91dHB1dFBhdGgpLCB0aGlzLmNvbnRleHQuaG9zdClcbi8vIFx0XHQ6IG9mKG51bGwpKSxcbi8vIFx0XHRjb25jYXRNYXAoKCkgPT4ge1xuLy8gXHRcdFx0cmV0dXJuIGRyY3BDb21tb24uY29tcGlsZShidWlsZGVyQ29uZmlnLnJvb3QsIG9wdGlvbnMsXG4vLyBcdFx0XHRcdCgpID0+IHRoaXMuYnVpbGRXZWJwYWNrQ29uZmlnKHJvb3QsIHByb2plY3RSb290LCBob3N0LCBvcHRpb25zKSk7XG4vLyBcdFx0fSksXG4vLyBcdFx0Y29uY2F0TWFwKCh3ZWJwYWNrQ29uZmlnKSA9PiB7XG4vLyBcdFx0XHRyZXR1cm4gd2VicGFja0J1aWxkZXIucnVuV2VicGFjayh3ZWJwYWNrQ29uZmlnLCBnZXRCcm93c2VyTG9nZ2luZ0NiKG9wdGlvbnMudmVyYm9zZSkpO1xuLy8gXHRcdH0pLFxuLy8gXHRcdGNvbmNhdE1hcCgoYnVpbGRFdmVudCkgPT4ge1xuLy8gXHRcdGlmIChidWlsZEV2ZW50LnN1Y2Nlc3MgJiYgIW9wdGlvbnMud2F0Y2ggJiYgb3B0aW9ucy5zZXJ2aWNlV29ya2VyKSB7XG4vLyBcdFx0XHRyZXR1cm4gbmV3IE9ic2VydmFibGU8QnVpbGRFdmVudD4ob2JzID0+IHtcbi8vIFx0XHRcdFx0YXVnbWVudEFwcFdpdGhTZXJ2aWNlV29ya2VyKFxuLy8gXHRcdFx0XHRcdHRoaXMuY29udGV4dC5ob3N0LFxuLy8gXHRcdFx0XHRcdHJvb3QsXG4vLyBcdFx0XHRcdFx0cHJvamVjdFJvb3QsXG4vLyBcdFx0XHRcdFx0cmVzb2x2ZShyb290LCBub3JtYWxpemUob3B0aW9ucy5vdXRwdXRQYXRoKSksXG4vLyBcdFx0XHRcdFx0b3B0aW9ucy5iYXNlSHJlZiB8fCAnLycsXG4vLyBcdFx0XHRcdFx0b3B0aW9ucy5uZ3N3Q29uZmlnUGF0aFxuLy8gXHRcdFx0XHQpLnRoZW4oXG4vLyBcdFx0XHRcdFx0KCkgPT4ge1xuLy8gXHRcdFx0XHRcdFx0b2JzLm5leHQoeyBzdWNjZXNzOiB0cnVlIH0pO1xuLy8gXHRcdFx0XHRcdFx0b2JzLmNvbXBsZXRlKCk7XG4vLyBcdFx0XHRcdFx0fSxcbi8vIFx0XHRcdFx0XHQoZXJyOiBFcnJvcikgPT4ge1xuLy8gXHRcdFx0XHRcdFx0b2JzLmVycm9yKGVycik7XG4vLyBcdFx0XHRcdFx0fVxuLy8gXHRcdFx0XHQpO1xuLy8gXHRcdFx0fSk7XG4vLyBcdFx0fSBlbHNlIHtcbi8vIFx0XHRcdHJldHVybiBvZihidWlsZEV2ZW50KTtcbi8vIFx0XHR9XG4vLyBcdFx0fSlcbi8vIFx0KTtcbi8vICAgfVxuXG4vLyB9XG4iXX0=
