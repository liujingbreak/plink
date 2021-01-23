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
    plink.initProcess();
    require('./hack-fork-ts-checker-worker');
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaGFjay1mb3JrLXRzLWNoZWNrZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJoYWNrLWZvcmstdHMtY2hlY2tlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7O0dBS0c7Ozs7OztBQUVILGdEQUF3QjtBQUd4QixTQUFnQixRQUFRO0lBQ3RCLE9BQU8sQ0FBQyxHQUFHLENBQUMsWUFBWSxHQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxZQUFZLElBQUksRUFBRSxDQUFDLEdBQUcsTUFBTTtRQUNuRSxjQUFJLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFDO0FBQzdCLENBQUM7QUFIRCw0QkFHQztBQUVELElBQUksT0FBTyxDQUFDLElBQUksSUFBSSw0Q0FBNEMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFO0lBQ3RGLDhFQUE4RTtJQUM5RSxPQUFPLENBQUMsK0JBQStCLENBQUMsQ0FBQztJQUN6QyxNQUFNLEtBQUssR0FBa0IsT0FBTyxDQUFDLHFCQUFxQixDQUFDLENBQUM7SUFDNUQsS0FBSyxDQUFDLFdBQVcsRUFBRSxDQUFDO0lBQ3BCLE9BQU8sQ0FBQywrQkFBK0IsQ0FBQyxDQUFDO0NBQzFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBIYWNrIGZvcmstdHMtY2hlY2tlci13ZWJwYWNrLXBsdWdpbjpcbiAqICAtIGNoYW5nZSB0cy5jb21waWxlckhvc3QucmVhZEZpbGUoKVxuICogIC0gY2hhbmdlIHJvb3ROYW1lcyBpbiBwYXJhbWV0ZXJzIG9mIHRzLmNyZWF0ZVByb2dyYW0oKVxuICogIC0gY2hhbmdlIGNvbXBpbGVyT3B0aW9ucy5yb290RGlyIGluIHBhcmFtZXRlcnMgb2YgdHMuY3JlYXRlUHJvZ3JhbSgpXG4gKi9cblxuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgKiBhcyBfcGxpbmsgZnJvbSAnQHdmaC9wbGluay93ZmgvZGlzdCc7XG5cbmV4cG9ydCBmdW5jdGlvbiByZWdpc3RlcigpIHtcbiAgcHJvY2Vzcy5lbnYuTk9ERV9PUFRJT05TID0gIChwcm9jZXNzLmVudi5OT0RFX09QVElPTlMgfHwgJycpICsgJyAtciAnICtcbiAgICBQYXRoLnJlc29sdmUoX19maWxlbmFtZSk7XG59XG5cbmlmIChwcm9jZXNzLnNlbmQgJiYgL1tcXFxcXFwvXWZvcmstdHMtY2hlY2tlci13ZWJwYWNrLXBsdWdpbltcXFxcXFwvXS8udGVzdChwcm9jZXNzLmFyZ3ZbMV0pKSB7XG4gIC8vIEN1cnJlbnQgcHJvY2VzcyBpcyBhIGNoaWxkIHByb2Nlc3MgZm9ya2VkIGJ5IGZvcmstdHMtY2hlY2tlci13ZWJwYWNrLXBsdWdpblxuICByZXF1aXJlKCdAd2ZoL3BsaW5rL3dmaC9kaXN0L25vZGUtcGF0aCcpO1xuICBjb25zdCBwbGluazogdHlwZW9mIF9wbGluayA9IHJlcXVpcmUoJ0B3ZmgvcGxpbmsvd2ZoL2Rpc3QnKTtcbiAgcGxpbmsuaW5pdFByb2Nlc3MoKTtcbiAgcmVxdWlyZSgnLi9oYWNrLWZvcmstdHMtY2hlY2tlci13b3JrZXInKTtcbn1cblxuIl19