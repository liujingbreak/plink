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
        path_1.default.resolve(__filename);
}
exports.register = register;
if (process.send && /[\\\/]fork-ts-checker-webpack-plugin[\\\/]/.test(process.argv[1])) {
    // Current process is a child process forked by fork-ts-checker-webpack-plugin
    require('@wfh/plink/wfh/dist/node-path');
    const plink = require('@wfh/plink/wfh/dist');
    plink.initAsChildProcess();
    require('./hack-fork-ts-checker-worker');
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaGFjay1mb3JrLXRzLWNoZWNrZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJoYWNrLWZvcmstdHMtY2hlY2tlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7O0dBS0c7Ozs7OztBQUVILGdEQUF3QjtBQUd4QixTQUFnQixRQUFRO0lBQ3RCLE9BQU8sQ0FBQyxHQUFHLENBQUMsWUFBWSxHQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxZQUFZLElBQUksRUFBRSxDQUFDLEdBQUcsTUFBTTtRQUNuRSxjQUFJLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFDO0FBQzdCLENBQUM7QUFIRCw0QkFHQztBQUVELElBQUksT0FBTyxDQUFDLElBQUksSUFBSSw0Q0FBNEMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFO0lBQ3RGLDhFQUE4RTtJQUM5RSxPQUFPLENBQUMsK0JBQStCLENBQUMsQ0FBQztJQUN6QyxNQUFNLEtBQUssR0FBa0IsT0FBTyxDQUFDLHFCQUFxQixDQUFDLENBQUM7SUFDNUQsS0FBSyxDQUFDLGtCQUFrQixFQUFFLENBQUM7SUFDM0IsT0FBTyxDQUFDLCtCQUErQixDQUFDLENBQUM7Q0FDMUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEhhY2sgZm9yay10cy1jaGVja2VyLXdlYnBhY2stcGx1Z2luOlxuICogIC0gY2hhbmdlIHRzLmNvbXBpbGVySG9zdC5yZWFkRmlsZSgpXG4gKiAgLSBjaGFuZ2Ugcm9vdE5hbWVzIGluIHBhcmFtZXRlcnMgb2YgdHMuY3JlYXRlUHJvZ3JhbSgpXG4gKiAgLSBjaGFuZ2UgY29tcGlsZXJPcHRpb25zLnJvb3REaXIgaW4gcGFyYW1ldGVycyBvZiB0cy5jcmVhdGVQcm9ncmFtKClcbiAqL1xuXG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCAqIGFzIF9wbGluayBmcm9tICdAd2ZoL3BsaW5rL3dmaC9kaXN0JztcblxuZXhwb3J0IGZ1bmN0aW9uIHJlZ2lzdGVyKCkge1xuICBwcm9jZXNzLmVudi5OT0RFX09QVElPTlMgPSAgKHByb2Nlc3MuZW52Lk5PREVfT1BUSU9OUyB8fCAnJykgKyAnIC1yICcgK1xuICAgIFBhdGgucmVzb2x2ZShfX2ZpbGVuYW1lKTtcbn1cblxuaWYgKHByb2Nlc3Muc2VuZCAmJiAvW1xcXFxcXC9dZm9yay10cy1jaGVja2VyLXdlYnBhY2stcGx1Z2luW1xcXFxcXC9dLy50ZXN0KHByb2Nlc3MuYXJndlsxXSkpIHtcbiAgLy8gQ3VycmVudCBwcm9jZXNzIGlzIGEgY2hpbGQgcHJvY2VzcyBmb3JrZWQgYnkgZm9yay10cy1jaGVja2VyLXdlYnBhY2stcGx1Z2luXG4gIHJlcXVpcmUoJ0B3ZmgvcGxpbmsvd2ZoL2Rpc3Qvbm9kZS1wYXRoJyk7XG4gIGNvbnN0IHBsaW5rOiB0eXBlb2YgX3BsaW5rID0gcmVxdWlyZSgnQHdmaC9wbGluay93ZmgvZGlzdCcpO1xuICBwbGluay5pbml0QXNDaGlsZFByb2Nlc3MoKTtcbiAgcmVxdWlyZSgnLi9oYWNrLWZvcmstdHMtY2hlY2tlci13b3JrZXInKTtcbn1cblxuIl19