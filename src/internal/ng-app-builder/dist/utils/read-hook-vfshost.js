"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/* tslint:disable no-console */
/**
 * TODO: So far Angular TS compiler reads file not in async mode, even return type is an Observable,
 * we probably can pre-read files and cache them to make hooks work in async-like mode.
 */
const core_1 = require("@angular-devkit/core");
const operators_1 = require("rxjs/operators");
const webpack_input_host_1 = require("@ngtools/webpack/src/webpack-input-host");
class ReadHookHost extends webpack_input_host_1.WebpackInputHost {
    constructor(inputFileSystem, func) {
        super(inputFileSystem);
        this._readFunc = func;
    }
    read(path) {
        return super.read(path).pipe(operators_1.concatMap((buffer) => {
            const sPath = core_1.getSystemPath(path);
            return this._hookRead(sPath, buffer);
        }));
    }
    _hookRead(path, buffer) {
        return this._readFunc(path, buffer);
    }
}
exports.default = ReadHookHost;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVhZC1ob29rLXZmc2hvc3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJyZWFkLWhvb2stdmZzaG9zdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBLCtCQUErQjtBQUMvQjs7O0dBR0c7QUFDSCwrQ0FBb0U7QUFFcEUsOENBQXlDO0FBQ3pDLGdGQUF5RTtBQWN6RSxNQUFxQixZQUFhLFNBQVEscUNBQWdCO0lBSXhELFlBQVksZUFBZ0MsRUFBRSxJQUFrQjtRQUM5RCxLQUFLLENBQUMsZUFBZSxDQUFDLENBQUM7UUFDdkIsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUM7SUFDeEIsQ0FBQztJQUVELElBQUksQ0FBQyxJQUFVO1FBQ2IsT0FBTyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FDMUIscUJBQVMsQ0FBQyxDQUFDLE1BQWUsRUFBRSxFQUFFO1lBQzVCLE1BQU0sS0FBSyxHQUFXLG9CQUFhLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDMUMsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssRUFBRSxNQUFNLENBQUMsQ0FBQztRQUN2QyxDQUFDLENBQUMsQ0FDSCxDQUFDO0lBQ0osQ0FBQztJQUVTLFNBQVMsQ0FBQyxJQUFZLEVBQUUsTUFBZTtRQUMvQyxPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxDQUFDO0lBQ3RDLENBQUM7Q0FDRjtBQXJCRCwrQkFxQkMiLCJzb3VyY2VzQ29udGVudCI6WyIvKiB0c2xpbnQ6ZGlzYWJsZSBuby1jb25zb2xlICovXG4vKipcbiAqIFRPRE86IFNvIGZhciBBbmd1bGFyIFRTIGNvbXBpbGVyIHJlYWRzIGZpbGUgbm90IGluIGFzeW5jIG1vZGUsIGV2ZW4gcmV0dXJuIHR5cGUgaXMgYW4gT2JzZXJ2YWJsZSxcbiAqIHdlIHByb2JhYmx5IGNhbiBwcmUtcmVhZCBmaWxlcyBhbmQgY2FjaGUgdGhlbSB0byBtYWtlIGhvb2tzIHdvcmsgaW4gYXN5bmMtbGlrZSBtb2RlLlxuICovXG5pbXBvcnQge3ZpcnR1YWxGcywgUGF0aCAsZ2V0U3lzdGVtUGF0aH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2NvcmUnO1xuaW1wb3J0IHtPYnNlcnZhYmxlfSBmcm9tICdyeGpzJztcbmltcG9ydCB7Y29uY2F0TWFwfSBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5pbXBvcnQge1dlYnBhY2tJbnB1dEhvc3R9IGZyb20gJ0BuZ3Rvb2xzL3dlYnBhY2svc3JjL3dlYnBhY2staW5wdXQtaG9zdCc7XG5pbXBvcnQgeyBJbnB1dEZpbGVTeXN0ZW0gfSBmcm9tICd3ZWJwYWNrJztcbi8vIGltcG9ydCB7c2VwfSBmcm9tICdwYXRoJztcblxuLy8gY29uc3QgaXNXaW5kb3dzID0gc2VwID09PSAnXFxcXCc7XG5leHBvcnQgdHlwZSBGQnVmZmVyID0gdmlydHVhbEZzLkZpbGVCdWZmZXI7XG5cbmV4cG9ydCBpbnRlcmZhY2UgVHNGaWxlIHtcbiAgcGF0aDogUGF0aDtcbiAgYnVmZmVyOiBGQnVmZmVyO1xufVxuXG5leHBvcnQgdHlwZSBIb29rUmVhZEZ1bmMgPShwYXRoOiBzdHJpbmcsIGJ1ZmZlcjogRkJ1ZmZlcikgPT4gT2JzZXJ2YWJsZTxGQnVmZmVyPjtcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgUmVhZEhvb2tIb3N0IGV4dGVuZHMgV2VicGFja0lucHV0SG9zdCB7XG4gIC8qKiBzZXQgdGhpcyBwcm9wZXJ0eSB0byBhZGQgYSBmaWxlIHJlYWQgaG9vayAqL1xuICBfcmVhZEZ1bmM6IEhvb2tSZWFkRnVuYztcblxuICBjb25zdHJ1Y3RvcihpbnB1dEZpbGVTeXN0ZW06IElucHV0RmlsZVN5c3RlbSwgZnVuYzogSG9va1JlYWRGdW5jKSB7XG4gICAgc3VwZXIoaW5wdXRGaWxlU3lzdGVtKTtcbiAgICB0aGlzLl9yZWFkRnVuYyA9IGZ1bmM7XG4gIH1cblxuICByZWFkKHBhdGg6IFBhdGgpOiBPYnNlcnZhYmxlPEZCdWZmZXI+IHtcbiAgICByZXR1cm4gc3VwZXIucmVhZChwYXRoKS5waXBlKFxuICAgICAgY29uY2F0TWFwKChidWZmZXI6IEZCdWZmZXIpID0+IHtcbiAgICAgICAgY29uc3Qgc1BhdGg6IHN0cmluZyA9IGdldFN5c3RlbVBhdGgocGF0aCk7XG4gICAgICAgIHJldHVybiB0aGlzLl9ob29rUmVhZChzUGF0aCwgYnVmZmVyKTtcbiAgICAgIH0pXG4gICAgKTtcbiAgfVxuXG4gIHByb3RlY3RlZCBfaG9va1JlYWQocGF0aDogc3RyaW5nLCBidWZmZXI6IEZCdWZmZXIpOiBPYnNlcnZhYmxlPEZCdWZmZXI+IHtcbiAgICByZXR1cm4gdGhpcy5fcmVhZEZ1bmMocGF0aCwgYnVmZmVyKTtcbiAgfVxufVxuIl19