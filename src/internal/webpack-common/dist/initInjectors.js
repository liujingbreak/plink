/**
 * This file has same function of src/internal/ng-app-builder/ts/ng/injector-setup.ts,
 * so probably we should remove this file.
 */
// import {parse} from 'url';
// import Path from 'path';
// // import api from '__api';
// import _ from 'lodash';
// // import {createNgRouterPath} from '../../isom/api-share';
// import {walkPackages } from '@wfh/plink/wfh/dist/package-mgr/package-info-gathering';
// import {initInjectorForNodePackages} from '@wfh/plink/wfh/dist/package-runner';
/**
 * @deprecated
 * @param deployUrl
 * @param ssr
 */
// export default async function walkPackagesAndSetupInjector(deployUrl: string, ssr = false):
//   Promise<ReturnType<typeof walkPackages>> {
//   const packageInfo = walkPackages();
//   const apiProto = initInjectorForNodePackages()[1];
//   // await initWebInjector(pks, apiProto);
//   const publicUrlObj = parse(deployUrl || '');
//   // const baseHrefPath = baseHref ? parse(baseHref).pathname : undefined;
//   Object.assign(apiProto, {
//     deployUrl,
//     ssr,
//     ngBaseRouterPath: publicUrlObj.pathname ? _.trim(publicUrlObj.pathname, '/') : '',
//     // ngRouterPath: createNgRouterPath(baseHrefPath ? baseHrefPath : undefined),
//     ssrRequire(requirePath: string) {
//       if (ssr)
//         return require(Path.join(this.__dirname, requirePath));
//     }
//   });
//   return packageInfo;
// }
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5pdEluamVjdG9ycy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImluaXRJbmplY3RvcnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztHQUdHO0FBQ0gsNkJBQTZCO0FBQzdCLDJCQUEyQjtBQUMzQiw4QkFBOEI7QUFDOUIsMEJBQTBCO0FBQzFCLDhEQUE4RDtBQUM5RCx3RkFBd0Y7QUFDeEYsa0ZBQWtGO0FBRWxGOzs7O0dBSUc7QUFDSCw4RkFBOEY7QUFDOUYsK0NBQStDO0FBRS9DLHdDQUF3QztBQUN4Qyx1REFBdUQ7QUFDdkQsNkNBQTZDO0FBRTdDLGlEQUFpRDtBQUNqRCw2RUFBNkU7QUFFN0UsOEJBQThCO0FBQzlCLGlCQUFpQjtBQUNqQixXQUFXO0FBQ1gseUZBQXlGO0FBQ3pGLG9GQUFvRjtBQUNwRix3Q0FBd0M7QUFDeEMsaUJBQWlCO0FBQ2pCLGtFQUFrRTtBQUNsRSxRQUFRO0FBQ1IsUUFBUTtBQUNSLHdCQUF3QjtBQUN4QixJQUFJIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBUaGlzIGZpbGUgaGFzIHNhbWUgZnVuY3Rpb24gb2Ygc3JjL2ludGVybmFsL25nLWFwcC1idWlsZGVyL3RzL25nL2luamVjdG9yLXNldHVwLnRzLFxuICogc28gcHJvYmFibHkgd2Ugc2hvdWxkIHJlbW92ZSB0aGlzIGZpbGUuXG4gKi9cbi8vIGltcG9ydCB7cGFyc2V9IGZyb20gJ3VybCc7XG4vLyBpbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbi8vIC8vIGltcG9ydCBhcGkgZnJvbSAnX19hcGknO1xuLy8gaW1wb3J0IF8gZnJvbSAnbG9kYXNoJztcbi8vIC8vIGltcG9ydCB7Y3JlYXRlTmdSb3V0ZXJQYXRofSBmcm9tICcuLi8uLi9pc29tL2FwaS1zaGFyZSc7XG4vLyBpbXBvcnQge3dhbGtQYWNrYWdlcyB9IGZyb20gJ0B3ZmgvcGxpbmsvd2ZoL2Rpc3QvcGFja2FnZS1tZ3IvcGFja2FnZS1pbmZvLWdhdGhlcmluZyc7XG4vLyBpbXBvcnQge2luaXRJbmplY3RvckZvck5vZGVQYWNrYWdlc30gZnJvbSAnQHdmaC9wbGluay93ZmgvZGlzdC9wYWNrYWdlLXJ1bm5lcic7XG5cbi8qKlxuICogQGRlcHJlY2F0ZWRcbiAqIEBwYXJhbSBkZXBsb3lVcmxcbiAqIEBwYXJhbSBzc3IgXG4gKi9cbi8vIGV4cG9ydCBkZWZhdWx0IGFzeW5jIGZ1bmN0aW9uIHdhbGtQYWNrYWdlc0FuZFNldHVwSW5qZWN0b3IoZGVwbG95VXJsOiBzdHJpbmcsIHNzciA9IGZhbHNlKTpcbi8vICAgUHJvbWlzZTxSZXR1cm5UeXBlPHR5cGVvZiB3YWxrUGFja2FnZXM+PiB7XG5cbi8vICAgY29uc3QgcGFja2FnZUluZm8gPSB3YWxrUGFja2FnZXMoKTtcbi8vICAgY29uc3QgYXBpUHJvdG8gPSBpbml0SW5qZWN0b3JGb3JOb2RlUGFja2FnZXMoKVsxXTtcbi8vICAgLy8gYXdhaXQgaW5pdFdlYkluamVjdG9yKHBrcywgYXBpUHJvdG8pO1xuXG4vLyAgIGNvbnN0IHB1YmxpY1VybE9iaiA9IHBhcnNlKGRlcGxveVVybCB8fCAnJyk7XG4vLyAgIC8vIGNvbnN0IGJhc2VIcmVmUGF0aCA9IGJhc2VIcmVmID8gcGFyc2UoYmFzZUhyZWYpLnBhdGhuYW1lIDogdW5kZWZpbmVkO1xuXG4vLyAgIE9iamVjdC5hc3NpZ24oYXBpUHJvdG8sIHtcbi8vICAgICBkZXBsb3lVcmwsXG4vLyAgICAgc3NyLFxuLy8gICAgIG5nQmFzZVJvdXRlclBhdGg6IHB1YmxpY1VybE9iai5wYXRobmFtZSA/IF8udHJpbShwdWJsaWNVcmxPYmoucGF0aG5hbWUsICcvJykgOiAnJyxcbi8vICAgICAvLyBuZ1JvdXRlclBhdGg6IGNyZWF0ZU5nUm91dGVyUGF0aChiYXNlSHJlZlBhdGggPyBiYXNlSHJlZlBhdGggOiB1bmRlZmluZWQpLFxuLy8gICAgIHNzclJlcXVpcmUocmVxdWlyZVBhdGg6IHN0cmluZykge1xuLy8gICAgICAgaWYgKHNzcilcbi8vICAgICAgICAgcmV0dXJuIHJlcXVpcmUoUGF0aC5qb2luKHRoaXMuX19kaXJuYW1lLCByZXF1aXJlUGF0aCkpO1xuLy8gICAgIH1cbi8vICAgfSk7XG4vLyAgIHJldHVybiBwYWNrYWdlSW5mbztcbi8vIH1cblxuIl19