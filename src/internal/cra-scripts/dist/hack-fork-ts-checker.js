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
if (process.send && /[\\/]fork-ts-checker-webpack-plugin[\\/]/.test(process.argv[1])) {
    // Current process is a child process forked by fork-ts-checker-webpack-plugin
    require('@wfh/plink/wfh/dist/node-path');
    const plink = require('@wfh/plink');
    plink.initAsChildProcess();
    plink.initConfig(JSON.parse(process.env.PLINK_CLI_OPTS));
    plink.initInjectorForNodePackages();
    // plink.logConfig(setting());
    require('./hack-fork-ts-checker-worker');
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaGFjay1mb3JrLXRzLWNoZWNrZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJoYWNrLWZvcmstdHMtY2hlY2tlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7O0dBS0c7Ozs7OztBQUVILGdEQUF3QjtBQUd4QixTQUFnQixRQUFRO0lBQ3RCLE9BQU8sQ0FBQyxHQUFHLENBQUMsWUFBWSxHQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxZQUFZLElBQUksRUFBRSxDQUFDLEdBQUcsTUFBTTtRQUNuRSxjQUFJLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsc0JBQXNCO0FBQ3BELENBQUM7QUFIRCw0QkFHQztBQUVELElBQUksT0FBTyxDQUFDLElBQUksSUFBSSwwQ0FBMEMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFO0lBQ3BGLDhFQUE4RTtJQUM5RSxPQUFPLENBQUMsK0JBQStCLENBQUMsQ0FBQztJQUN6QyxNQUFNLEtBQUssR0FBRyxPQUFPLENBQUMsWUFBWSxDQUFrQixDQUFDO0lBRXJELEtBQUssQ0FBQyxrQkFBa0IsRUFBRSxDQUFDO0lBQzNCLEtBQUssQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLGNBQWUsQ0FBQyxDQUFDLENBQUM7SUFDMUQsS0FBSyxDQUFDLDJCQUEyQixFQUFFLENBQUM7SUFDcEMsOEJBQThCO0lBQzlCLE9BQU8sQ0FBQywrQkFBK0IsQ0FBQyxDQUFDO0NBQzFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBIYWNrIGZvcmstdHMtY2hlY2tlci13ZWJwYWNrLXBsdWdpbjpcbiAqICAtIGNoYW5nZSB0cy5jb21waWxlckhvc3QucmVhZEZpbGUoKVxuICogIC0gY2hhbmdlIHJvb3ROYW1lcyBpbiBwYXJhbWV0ZXJzIG9mIHRzLmNyZWF0ZVByb2dyYW0oKVxuICogIC0gY2hhbmdlIGNvbXBpbGVyT3B0aW9ucy5yb290RGlyIGluIHBhcmFtZXRlcnMgb2YgdHMuY3JlYXRlUHJvZ3JhbSgpXG4gKi9cblxuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgKiBhcyBfcGxpbmsgZnJvbSAnQHdmaC9wbGluayc7XG5cbmV4cG9ydCBmdW5jdGlvbiByZWdpc3RlcigpIHtcbiAgcHJvY2Vzcy5lbnYuTk9ERV9PUFRJT05TID0gIChwcm9jZXNzLmVudi5OT0RFX09QVElPTlMgfHwgJycpICsgJyAtciAnICtcbiAgICBQYXRoLnJlc29sdmUoX19maWxlbmFtZSk7IC8vICsgJyAtLWluc3BlY3QtYnJrJztcbn1cblxuaWYgKHByb2Nlc3Muc2VuZCAmJiAvW1xcXFwvXWZvcmstdHMtY2hlY2tlci13ZWJwYWNrLXBsdWdpbltcXFxcL10vLnRlc3QocHJvY2Vzcy5hcmd2WzFdKSkge1xuICAvLyBDdXJyZW50IHByb2Nlc3MgaXMgYSBjaGlsZCBwcm9jZXNzIGZvcmtlZCBieSBmb3JrLXRzLWNoZWNrZXItd2VicGFjay1wbHVnaW5cbiAgcmVxdWlyZSgnQHdmaC9wbGluay93ZmgvZGlzdC9ub2RlLXBhdGgnKTtcbiAgY29uc3QgcGxpbmsgPSByZXF1aXJlKCdAd2ZoL3BsaW5rJykgYXMgdHlwZW9mIF9wbGluaztcblxuICBwbGluay5pbml0QXNDaGlsZFByb2Nlc3MoKTtcbiAgcGxpbmsuaW5pdENvbmZpZyhKU09OLnBhcnNlKHByb2Nlc3MuZW52LlBMSU5LX0NMSV9PUFRTISkpO1xuICBwbGluay5pbml0SW5qZWN0b3JGb3JOb2RlUGFja2FnZXMoKTtcbiAgLy8gcGxpbmsubG9nQ29uZmlnKHNldHRpbmcoKSk7XG4gIHJlcXVpcmUoJy4vaGFjay1mb3JrLXRzLWNoZWNrZXItd29ya2VyJyk7XG59XG5cbiJdfQ==