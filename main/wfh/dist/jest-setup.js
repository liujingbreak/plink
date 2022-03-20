"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
const path_1 = __importDefault(require("path"));
module.exports = function () {
    if ((process.env.NODE_PRESERVE_SYMLINKS !== '1' && process.execArgv.indexOf('--preserve-symlinks') < 0)) {
        console.error('Node.js process must be executed with environment varaible NODE_PRESERVE_SYMLINKS=1');
        process.exit(1);
    }
    process.env.PLINK_WORK_DIR = path_1.default.resolve('react-space');
    const { initProcess, initAsChildProcess, initConfig } = require('./utils/bootstrap-process');
    const { initInjectorForNodePackages } = require('./package-runner');
    if (process.send) {
        initAsChildProcess('none');
    }
    else {
        initProcess('none');
    }
    initConfig({ dev: true, verbose: true });
    initInjectorForNodePackages();
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiamVzdC1zZXR1cC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3RzL2plc3Qtc2V0dXAudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7OztBQUFBLGdEQUF3QjtBQUl4QixpQkFBUztJQUNQLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLHNCQUFzQixLQUFLLEdBQUcsSUFBSSxPQUFPLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxxQkFBcUIsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFO1FBQ3ZHLE9BQU8sQ0FBQyxLQUFLLENBQUMscUZBQXFGLENBQUMsQ0FBQztRQUNyRyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO0tBQ2pCO0lBQ0QsT0FBTyxDQUFDLEdBQUcsQ0FBQyxjQUFjLEdBQUcsY0FBSSxDQUFDLE9BQU8sQ0FBQyxhQUFhLENBQUMsQ0FBQztJQUV6RCxNQUFNLEVBQUMsV0FBVyxFQUFFLGtCQUFrQixFQUFFLFVBQVUsRUFBQyxHQUFHLE9BQU8sQ0FBQywyQkFBMkIsQ0FBZSxDQUFDO0lBQ3pHLE1BQU0sRUFBQywyQkFBMkIsRUFBQyxHQUFHLE9BQU8sQ0FBQyxrQkFBa0IsQ0FBZSxDQUFDO0lBRWhGLElBQUksT0FBTyxDQUFDLElBQUksRUFBRTtRQUNoQixrQkFBa0IsQ0FBQyxNQUFNLENBQUMsQ0FBQztLQUM1QjtTQUFNO1FBQ0wsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0tBQ3JCO0lBQ0QsVUFBVSxDQUFDLEVBQUMsR0FBRyxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFDLENBQUMsQ0FBQztJQUN2QywyQkFBMkIsRUFBRSxDQUFDO0FBQ2hDLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBwYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0ICogYXMgX2JwIGZyb20gJy4vdXRpbHMvYm9vdHN0cmFwLXByb2Nlc3MnO1xuaW1wb3J0ICogYXMgX3ByIGZyb20gJy4vcGFja2FnZS1ydW5uZXInO1xuXG5leHBvcnQgPSBmdW5jdGlvbigpIHtcbiAgaWYgKChwcm9jZXNzLmVudi5OT0RFX1BSRVNFUlZFX1NZTUxJTktTICE9PSAnMScgJiYgcHJvY2Vzcy5leGVjQXJndi5pbmRleE9mKCctLXByZXNlcnZlLXN5bWxpbmtzJykgPCAwKSkge1xuICAgIGNvbnNvbGUuZXJyb3IoJ05vZGUuanMgcHJvY2VzcyBtdXN0IGJlIGV4ZWN1dGVkIHdpdGggZW52aXJvbm1lbnQgdmFyYWlibGUgTk9ERV9QUkVTRVJWRV9TWU1MSU5LUz0xJyk7XG4gICAgcHJvY2Vzcy5leGl0KDEpO1xuICB9XG4gIHByb2Nlc3MuZW52LlBMSU5LX1dPUktfRElSID0gcGF0aC5yZXNvbHZlKCdyZWFjdC1zcGFjZScpO1xuXG4gIGNvbnN0IHtpbml0UHJvY2VzcywgaW5pdEFzQ2hpbGRQcm9jZXNzLCBpbml0Q29uZmlnfSA9IHJlcXVpcmUoJy4vdXRpbHMvYm9vdHN0cmFwLXByb2Nlc3MnKSBhcyB0eXBlb2YgX2JwO1xuICBjb25zdCB7aW5pdEluamVjdG9yRm9yTm9kZVBhY2thZ2VzfSA9IHJlcXVpcmUoJy4vcGFja2FnZS1ydW5uZXInKSBhcyB0eXBlb2YgX3ByO1xuXG4gIGlmIChwcm9jZXNzLnNlbmQpIHtcbiAgICBpbml0QXNDaGlsZFByb2Nlc3MoJ25vbmUnKTtcbiAgfSBlbHNlIHtcbiAgICBpbml0UHJvY2Vzcygnbm9uZScpO1xuICB9XG4gIGluaXRDb25maWcoe2RldjogdHJ1ZSwgdmVyYm9zZTogdHJ1ZX0pO1xuICBpbml0SW5qZWN0b3JGb3JOb2RlUGFja2FnZXMoKTtcbn07XG4iXX0=