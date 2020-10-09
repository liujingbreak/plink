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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL2xpdWppbmcvYmsvZHItY29tcC1wYWNrYWdlL3NyYy9pbnRlcm5hbC9uZy1hcHAtYnVpbGRlci90cy91dGlscy9yZWFkLWhvb2stdmZzaG9zdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBLCtCQUErQjtBQUMvQjs7O0dBR0c7QUFDSCwrQ0FBb0U7QUFFcEUsOENBQXlDO0FBQ3pDLGdGQUF5RTtBQWN6RSxNQUFxQixZQUFhLFNBQVEscUNBQWdCO0lBSXhELFlBQVksZUFBZ0MsRUFBRSxJQUFrQjtRQUM5RCxLQUFLLENBQUMsZUFBZSxDQUFDLENBQUM7UUFDdkIsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUM7SUFDeEIsQ0FBQztJQUVELElBQUksQ0FBQyxJQUFVO1FBQ2IsT0FBTyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FDMUIscUJBQVMsQ0FBQyxDQUFDLE1BQWUsRUFBRSxFQUFFO1lBQzVCLE1BQU0sS0FBSyxHQUFXLG9CQUFhLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDMUMsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssRUFBRSxNQUFNLENBQUMsQ0FBQztRQUN2QyxDQUFDLENBQUMsQ0FDSCxDQUFDO0lBQ0osQ0FBQztJQUVTLFNBQVMsQ0FBQyxJQUFZLEVBQUUsTUFBZTtRQUMvQyxPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxDQUFDO0lBQ3RDLENBQUM7Q0FDRjtBQXJCRCwrQkFxQkMiLCJmaWxlIjoiZGlzdC91dGlscy9yZWFkLWhvb2stdmZzaG9zdC5qcyIsInNvdXJjZXNDb250ZW50IjpbbnVsbF19
