"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const injector_factory_1 = require("./injector-factory");
exports.InjectorFactory = injector_factory_1.DrPackageInjector;
function doInjectorConfig(factory, isNode = false) {
    const config = require('../lib/config');
    return config.configHandlerMgr().runEach((file, lastResult, handler) => {
        if (isNode && handler.setupNodeInjector)
            handler.setupNodeInjector(factory);
        else if (!isNode && handler.setupWebInjector)
            handler.setupWebInjector(factory);
    });
}
exports.doInjectorConfig = doInjectorConfig;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVxdWlyZS1pbmplY3RvcnMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90cy9yZXF1aXJlLWluamVjdG9ycy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUdBLHlEQUFxRDtBQUN4QiwwQkFEckIsb0NBQWlCLENBQ21CO0FBYzVDLFNBQWdCLGdCQUFnQixDQUFDLE9BQTBCLEVBQUUsTUFBTSxHQUFHLEtBQUs7SUFDekUsTUFBTSxNQUFNLEdBQWUsT0FBTyxDQUFDLGVBQWUsQ0FBQyxDQUFDO0lBQ3BELE9BQU8sTUFBTSxDQUFDLGdCQUFnQixFQUFFLENBQUMsT0FBTyxDQUF3QixDQUFDLElBQVksRUFBRSxVQUFlLEVBQUUsT0FBTyxFQUFFLEVBQUU7UUFDekcsSUFBSSxNQUFNLElBQUksT0FBTyxDQUFDLGlCQUFpQjtZQUNyQyxPQUFPLENBQUMsaUJBQWlCLENBQUMsT0FBTyxDQUFDLENBQUM7YUFDaEMsSUFBSSxDQUFDLE1BQU0sSUFBSSxPQUFPLENBQUMsZ0JBQWdCO1lBQzFDLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUN0QyxDQUFDLENBQUMsQ0FBQztBQUNMLENBQUM7QUFSRCw0Q0FRQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7RHJjcENvbmZpZ30gZnJvbSAnLi9jb25maWctaGFuZGxlcic7XG5pbXBvcnQge0ZhY3RvcnlNYXBJbnRlcmZ9IGZyb20gJ3JlcXVpcmUtaW5qZWN0b3IvZGlzdC9mYWN0b3J5LW1hcCc7XG5pbXBvcnQge1JlcXVpcmVJbmplY3Rvcn0gZnJvbSAncmVxdWlyZS1pbmplY3Rvci9kaXN0L3JlcGxhY2UtcmVxdWlyZSc7XG5pbXBvcnQge0RyUGFja2FnZUluamVjdG9yfSBmcm9tICcuL2luamVjdG9yLWZhY3RvcnknO1xuZXhwb3J0IHtEclBhY2thZ2VJbmplY3RvciBhcyBJbmplY3RvckZhY3Rvcnl9O1xuZXhwb3J0IHtGYWN0b3J5TWFwSW50ZXJmLCBSZXF1aXJlSW5qZWN0b3J9O1xuXG4vLyBleHBvcnQgaW50ZXJmYWNlIEluamVjdG9yRmFjdG9yeSBleHRlbmRzIFJlcXVpcmVJbmplY3RvciB7XG4vLyBcdGFkZFBhY2thZ2UobmFtZTogc3RyaW5nLCBkaXI6IHN0cmluZyk6IHZvaWQ7XG4vLyBcdGZyb21BbGxDb21wb25lbnRzKCk6IEZhY3RvcnlNYXBJbnRlcmY7XG4vLyBcdG5vdEZyb21QYWNrYWdlcyhleGNsdWRlUGFja2FnZXM6IHN0cmluZyB8IHN0cmluZ1tdKTogRmFjdG9yeU1hcEludGVyZjtcbi8vIH1cblxuZXhwb3J0IGludGVyZmFjZSBJbmplY3RvckNvbmZpZ0hhbmRsZXIge1xuICBzZXR1cE5vZGVJbmplY3RvcihmYWN0b3J5OiBEclBhY2thZ2VJbmplY3Rvcik6IHZvaWQ7XG4gIHNldHVwV2ViSW5qZWN0b3IoZmFjdG9yeTogRHJQYWNrYWdlSW5qZWN0b3IpOiB2b2lkO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZG9JbmplY3RvckNvbmZpZyhmYWN0b3J5OiBEclBhY2thZ2VJbmplY3RvciwgaXNOb2RlID0gZmFsc2UpOiBQcm9taXNlPHZvaWQ+IHtcbiAgY29uc3QgY29uZmlnOiBEcmNwQ29uZmlnID0gcmVxdWlyZSgnLi4vbGliL2NvbmZpZycpO1xuICByZXR1cm4gY29uZmlnLmNvbmZpZ0hhbmRsZXJNZ3IoKS5ydW5FYWNoPEluamVjdG9yQ29uZmlnSGFuZGxlcj4oKGZpbGU6IHN0cmluZywgbGFzdFJlc3VsdDogYW55LCBoYW5kbGVyKSA9PiB7XG4gICAgaWYgKGlzTm9kZSAmJiBoYW5kbGVyLnNldHVwTm9kZUluamVjdG9yKVxuICAgICAgaGFuZGxlci5zZXR1cE5vZGVJbmplY3RvcihmYWN0b3J5KTtcbiAgICBlbHNlIGlmICghaXNOb2RlICYmIGhhbmRsZXIuc2V0dXBXZWJJbmplY3RvcilcbiAgICAgIGhhbmRsZXIuc2V0dXBXZWJJbmplY3RvcihmYWN0b3J5KTtcbiAgfSk7XG59XG5cblxudHlwZSBWYWx1ZUZhY3RvcnkgPSAoc291cmNlRmlsZVBhdGg6IHN0cmluZywgcmVnZXhwRXhlY1Jlcz86IFJlZ0V4cEV4ZWNBcnJheSkgPT4gYW55O1xuXG5leHBvcnQgaW50ZXJmYWNlIFJlcGxhY2VUeXBlVmFsdWUge1xuICByZXBsYWNlbWVudDogc3RyaW5nO1xuICB2YWx1ZTogYW55IHwgVmFsdWVGYWN0b3J5O1xufVxuIl19