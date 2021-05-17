"use strict";
/**
 * Hack fork-ts-checker-webpack-plugin:
 *  - change ts.compilerHost.readFile()
 *  - change rootNames in parameters of ts.createProgram()
 *  - change compilerOptions.rootDir in parameters of ts.createProgram()
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.register = void 0;
const path_1 = __importDefault(require("path"));
function register() {
    process.env.NODE_OPTIONS = (process.env.NODE_OPTIONS || '') + ' -r ' +
        path_1.default.resolve(__filename); // + ' --inspect-brk';
}
exports.register = register;
if (process.send && /[\\\/]fork-ts-checker-webpack-plugin[\\\/]/.test(process.argv[1])) {
    // Current process is a child process forked by fork-ts-checker-webpack-plugin
    require('@wfh/plink/wfh/dist/node-path');
    const plink = require('@wfh/plink/wfh/dist');
    plink.initAsChildProcess();
    plink.initConfig(JSON.parse(process.env.PLINK_CLI_OPTS));
    plink.initInjectorForNodePackages();
    // plink.logConfig(setting());
    require('./hack-fork-ts-checker-worker');
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaGFjay1mb3JrLXRzLWNoZWNrZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJoYWNrLWZvcmstdHMtY2hlY2tlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7O0dBS0c7Ozs7OztBQUVILGdEQUF3QjtBQUd4QixTQUFnQixRQUFRO0lBQ3RCLE9BQU8sQ0FBQyxHQUFHLENBQUMsWUFBWSxHQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxZQUFZLElBQUksRUFBRSxDQUFDLEdBQUcsTUFBTTtRQUNuRSxjQUFJLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsc0JBQXNCO0FBQ3BELENBQUM7QUFIRCw0QkFHQztBQUVELElBQUksT0FBTyxDQUFDLElBQUksSUFBSSw0Q0FBNEMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFO0lBQ3RGLDhFQUE4RTtJQUM5RSxPQUFPLENBQUMsK0JBQStCLENBQUMsQ0FBQztJQUN6QyxNQUFNLEtBQUssR0FBa0IsT0FBTyxDQUFDLHFCQUFxQixDQUFDLENBQUM7SUFDNUQsS0FBSyxDQUFDLGtCQUFrQixFQUFFLENBQUM7SUFDM0IsS0FBSyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsY0FBZSxDQUFDLENBQUMsQ0FBQztJQUMxRCxLQUFLLENBQUMsMkJBQTJCLEVBQUUsQ0FBQztJQUNwQyw4QkFBOEI7SUFDOUIsT0FBTyxDQUFDLCtCQUErQixDQUFDLENBQUM7Q0FDMUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEhhY2sgZm9yay10cy1jaGVja2VyLXdlYnBhY2stcGx1Z2luOlxuICogIC0gY2hhbmdlIHRzLmNvbXBpbGVySG9zdC5yZWFkRmlsZSgpXG4gKiAgLSBjaGFuZ2Ugcm9vdE5hbWVzIGluIHBhcmFtZXRlcnMgb2YgdHMuY3JlYXRlUHJvZ3JhbSgpXG4gKiAgLSBjaGFuZ2UgY29tcGlsZXJPcHRpb25zLnJvb3REaXIgaW4gcGFyYW1ldGVycyBvZiB0cy5jcmVhdGVQcm9ncmFtKClcbiAqL1xuXG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCAqIGFzIF9wbGluayBmcm9tICdAd2ZoL3BsaW5rL3dmaC9kaXN0JztcblxuZXhwb3J0IGZ1bmN0aW9uIHJlZ2lzdGVyKCkge1xuICBwcm9jZXNzLmVudi5OT0RFX09QVElPTlMgPSAgKHByb2Nlc3MuZW52Lk5PREVfT1BUSU9OUyB8fCAnJykgKyAnIC1yICcgK1xuICAgIFBhdGgucmVzb2x2ZShfX2ZpbGVuYW1lKTsgLy8gKyAnIC0taW5zcGVjdC1icmsnO1xufVxuXG5pZiAocHJvY2Vzcy5zZW5kICYmIC9bXFxcXFxcL11mb3JrLXRzLWNoZWNrZXItd2VicGFjay1wbHVnaW5bXFxcXFxcL10vLnRlc3QocHJvY2Vzcy5hcmd2WzFdKSkge1xuICAvLyBDdXJyZW50IHByb2Nlc3MgaXMgYSBjaGlsZCBwcm9jZXNzIGZvcmtlZCBieSBmb3JrLXRzLWNoZWNrZXItd2VicGFjay1wbHVnaW5cbiAgcmVxdWlyZSgnQHdmaC9wbGluay93ZmgvZGlzdC9ub2RlLXBhdGgnKTtcbiAgY29uc3QgcGxpbms6IHR5cGVvZiBfcGxpbmsgPSByZXF1aXJlKCdAd2ZoL3BsaW5rL3dmaC9kaXN0Jyk7XG4gIHBsaW5rLmluaXRBc0NoaWxkUHJvY2VzcygpO1xuICBwbGluay5pbml0Q29uZmlnKEpTT04ucGFyc2UocHJvY2Vzcy5lbnYuUExJTktfQ0xJX09QVFMhKSk7XG4gIHBsaW5rLmluaXRJbmplY3RvckZvck5vZGVQYWNrYWdlcygpO1xuICAvLyBwbGluay5sb2dDb25maWcoc2V0dGluZygpKTtcbiAgcmVxdWlyZSgnLi9oYWNrLWZvcmstdHMtY2hlY2tlci13b3JrZXInKTtcbn1cblxuIl19