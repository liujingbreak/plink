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
// import inspector from 'inspector';
function register() {
    process.env.NODE_OPTIONS = (process.env.NODE_OPTIONS || '') + ' -r ' +
        path_1.default.resolve(__filename); // + ' --inspect-brk';
}
exports.register = register;
if (process.send && /[\\/]fork-ts-checker-webpack-plugin[\\/]/.test(process.argv[1])) {
    // Current process is a child process forked by fork-ts-checker-webpack-plugin
    require('@wfh/plink/wfh/dist/node-path');
    const plink = require('@wfh/plink');
    // inspector.open(9222, 'localhost', true);
    plink.initAsChildProcess();
    plink.initConfig(JSON.parse(process.env.PLINK_CLI_OPTS));
    plink.initInjectorForNodePackages();
    // plink.logConfig(setting());
    require('./hack-fork-ts-checker-worker');
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaGFjay1mb3JrLXRzLWNoZWNrZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJoYWNrLWZvcmstdHMtY2hlY2tlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7O0dBS0c7Ozs7OztBQUVILGdEQUF3QjtBQUV4QixxQ0FBcUM7QUFFckMsU0FBZ0IsUUFBUTtJQUN0QixPQUFPLENBQUMsR0FBRyxDQUFDLFlBQVksR0FBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsWUFBWSxJQUFJLEVBQUUsQ0FBQyxHQUFHLE1BQU07UUFDbkUsY0FBSSxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLHNCQUFzQjtBQUNwRCxDQUFDO0FBSEQsNEJBR0M7QUFFRCxJQUFJLE9BQU8sQ0FBQyxJQUFJLElBQUksMENBQTBDLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRTtJQUNwRiw4RUFBOEU7SUFDOUUsT0FBTyxDQUFDLCtCQUErQixDQUFDLENBQUM7SUFDekMsTUFBTSxLQUFLLEdBQUcsT0FBTyxDQUFDLFlBQVksQ0FBa0IsQ0FBQztJQUVyRCwyQ0FBMkM7SUFDM0MsS0FBSyxDQUFDLGtCQUFrQixFQUFFLENBQUM7SUFDM0IsS0FBSyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsY0FBZSxDQUFDLENBQUMsQ0FBQztJQUMxRCxLQUFLLENBQUMsMkJBQTJCLEVBQUUsQ0FBQztJQUNwQyw4QkFBOEI7SUFDOUIsT0FBTyxDQUFDLCtCQUErQixDQUFDLENBQUM7Q0FDMUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEhhY2sgZm9yay10cy1jaGVja2VyLXdlYnBhY2stcGx1Z2luOlxuICogIC0gY2hhbmdlIHRzLmNvbXBpbGVySG9zdC5yZWFkRmlsZSgpXG4gKiAgLSBjaGFuZ2Ugcm9vdE5hbWVzIGluIHBhcmFtZXRlcnMgb2YgdHMuY3JlYXRlUHJvZ3JhbSgpXG4gKiAgLSBjaGFuZ2UgY29tcGlsZXJPcHRpb25zLnJvb3REaXIgaW4gcGFyYW1ldGVycyBvZiB0cy5jcmVhdGVQcm9ncmFtKClcbiAqL1xuXG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCAqIGFzIF9wbGluayBmcm9tICdAd2ZoL3BsaW5rJztcbi8vIGltcG9ydCBpbnNwZWN0b3IgZnJvbSAnaW5zcGVjdG9yJztcblxuZXhwb3J0IGZ1bmN0aW9uIHJlZ2lzdGVyKCkge1xuICBwcm9jZXNzLmVudi5OT0RFX09QVElPTlMgPSAgKHByb2Nlc3MuZW52Lk5PREVfT1BUSU9OUyB8fCAnJykgKyAnIC1yICcgK1xuICAgIFBhdGgucmVzb2x2ZShfX2ZpbGVuYW1lKTsgLy8gKyAnIC0taW5zcGVjdC1icmsnO1xufVxuXG5pZiAocHJvY2Vzcy5zZW5kICYmIC9bXFxcXC9dZm9yay10cy1jaGVja2VyLXdlYnBhY2stcGx1Z2luW1xcXFwvXS8udGVzdChwcm9jZXNzLmFyZ3ZbMV0pKSB7XG4gIC8vIEN1cnJlbnQgcHJvY2VzcyBpcyBhIGNoaWxkIHByb2Nlc3MgZm9ya2VkIGJ5IGZvcmstdHMtY2hlY2tlci13ZWJwYWNrLXBsdWdpblxuICByZXF1aXJlKCdAd2ZoL3BsaW5rL3dmaC9kaXN0L25vZGUtcGF0aCcpO1xuICBjb25zdCBwbGluayA9IHJlcXVpcmUoJ0B3ZmgvcGxpbmsnKSBhcyB0eXBlb2YgX3BsaW5rO1xuXG4gIC8vIGluc3BlY3Rvci5vcGVuKDkyMjIsICdsb2NhbGhvc3QnLCB0cnVlKTtcbiAgcGxpbmsuaW5pdEFzQ2hpbGRQcm9jZXNzKCk7XG4gIHBsaW5rLmluaXRDb25maWcoSlNPTi5wYXJzZShwcm9jZXNzLmVudi5QTElOS19DTElfT1BUUyEpKTtcbiAgcGxpbmsuaW5pdEluamVjdG9yRm9yTm9kZVBhY2thZ2VzKCk7XG4gIC8vIHBsaW5rLmxvZ0NvbmZpZyhzZXR0aW5nKCkpO1xuICByZXF1aXJlKCcuL2hhY2stZm9yay10cy1jaGVja2VyLXdvcmtlcicpO1xufVxuXG4iXX0=