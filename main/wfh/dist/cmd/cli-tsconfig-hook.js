"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.doTsconfig = void 0;
const editor_helper_1 = require("../editor-helper");
const op = __importStar(require("rxjs/operators"));
// import {getLogger} from 'log4js';
const path_1 = __importDefault(require("path"));
const misc_1 = require("../utils/misc");
function doTsconfig(opts) {
    if (opts.hook && opts.hook.length > 0) {
        editor_helper_1.dispatcher.hookTsconfig(opts.hook);
    }
    if (opts.unhook && opts.unhook.length > 0) {
        editor_helper_1.dispatcher.unHookTsconfig(opts.unhook);
    }
    if (opts.unhookAll) {
        editor_helper_1.dispatcher.unHookAll();
    }
    editor_helper_1.getStore().pipe(op.map(s => s.tsconfigByRelPath), op.distinctUntilChanged(), op.filter(datas => {
        if (datas.size > 0) {
            return true;
        }
        // tslint:disable-next-line: no-console
        console.log('No hooked files found, hook file by command options "--hook <file>"');
        return false;
    }), op.debounceTime(0), // There will be two change events happening, let's get the last change result only
    op.tap((datas) => {
        // tslint:disable-next-line: no-console
        console.log('Hooked tsconfig files:');
        for (const data of datas.values()) {
            // tslint:disable-next-line: no-console
            console.log('  ' + path_1.default.resolve(misc_1.getRootDir(), data.relPath));
        }
    })).subscribe();
}
exports.doTsconfig = doTsconfig;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLXRzY29uZmlnLWhvb2suanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy9jbWQvY2xpLXRzY29uZmlnLWhvb2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLG9EQUFzRDtBQUN0RCxtREFBcUM7QUFDckMsb0NBQW9DO0FBQ3BDLGdEQUF3QjtBQUN4Qix3Q0FBeUM7QUFRekMsU0FBZ0IsVUFBVSxDQUFDLElBQWdCO0lBQ3pDLElBQUksSUFBSSxDQUFDLElBQUksSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUU7UUFDckMsMEJBQVUsQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0tBQ3BDO0lBQ0QsSUFBSSxJQUFJLENBQUMsTUFBTSxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRTtRQUN6QywwQkFBVSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7S0FDeEM7SUFDRCxJQUFJLElBQUksQ0FBQyxTQUFTLEVBQUU7UUFDbEIsMEJBQVUsQ0FBQyxTQUFTLEVBQUUsQ0FBQztLQUN4QjtJQUNELHdCQUFRLEVBQUUsQ0FBQyxJQUFJLENBQ2IsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxpQkFBaUIsQ0FBQyxFQUNoQyxFQUFFLENBQUMsb0JBQW9CLEVBQUUsRUFDekIsRUFBRSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsRUFBRTtRQUNoQixJQUFJLEtBQUssQ0FBQyxJQUFJLEdBQUcsQ0FBQyxFQUFFO1lBQ2xCLE9BQU8sSUFBSSxDQUFDO1NBQ2I7UUFDRCx1Q0FBdUM7UUFDdkMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxxRUFBcUUsQ0FBQyxDQUFDO1FBQ25GLE9BQU8sS0FBSyxDQUFDO0lBQ2YsQ0FBQyxDQUFDLEVBQ0YsRUFBRSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsRUFBRSxtRkFBbUY7SUFDdkcsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEtBQUssRUFBRSxFQUFFO1FBQ2YsdUNBQXVDO1FBQ3ZDLE9BQU8sQ0FBQyxHQUFHLENBQUMsd0JBQXdCLENBQUMsQ0FBQztRQUN0QyxLQUFLLE1BQU0sSUFBSSxJQUFJLEtBQUssQ0FBQyxNQUFNLEVBQUUsRUFBRTtZQUNqQyx1Q0FBdUM7WUFDdkMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLEdBQUcsY0FBSSxDQUFDLE9BQU8sQ0FBQyxpQkFBVSxFQUFFLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7U0FDOUQ7SUFDSCxDQUFDLENBQUMsQ0FDSCxDQUFDLFNBQVMsRUFBRSxDQUFDO0FBQ2hCLENBQUM7QUEvQkQsZ0NBK0JDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtnZXRTdG9yZSwgZGlzcGF0Y2hlcn0gZnJvbSAnLi4vZWRpdG9yLWhlbHBlcic7XG5pbXBvcnQgKiBhcyBvcCBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG4vLyBpbXBvcnQge2dldExvZ2dlcn0gZnJvbSAnbG9nNGpzJztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHtnZXRSb290RGlyfSBmcm9tICcuLi91dGlscy9taXNjJztcblxuZXhwb3J0IGludGVyZmFjZSBDbGlPcHRpb25zIHtcbiAgaG9vazogc3RyaW5nW107XG4gIHVuaG9vazogc3RyaW5nW107XG4gIHVuaG9va0FsbDogYm9vbGVhbjtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGRvVHNjb25maWcob3B0czogQ2xpT3B0aW9ucykge1xuICBpZiAob3B0cy5ob29rICYmIG9wdHMuaG9vay5sZW5ndGggPiAwKSB7XG4gICAgZGlzcGF0Y2hlci5ob29rVHNjb25maWcob3B0cy5ob29rKTtcbiAgfVxuICBpZiAob3B0cy51bmhvb2sgJiYgb3B0cy51bmhvb2subGVuZ3RoID4gMCkge1xuICAgIGRpc3BhdGNoZXIudW5Ib29rVHNjb25maWcob3B0cy51bmhvb2spO1xuICB9XG4gIGlmIChvcHRzLnVuaG9va0FsbCkge1xuICAgIGRpc3BhdGNoZXIudW5Ib29rQWxsKCk7XG4gIH1cbiAgZ2V0U3RvcmUoKS5waXBlKFxuICAgIG9wLm1hcChzID0+IHMudHNjb25maWdCeVJlbFBhdGgpLFxuICAgIG9wLmRpc3RpbmN0VW50aWxDaGFuZ2VkKCksXG4gICAgb3AuZmlsdGVyKGRhdGFzID0+IHtcbiAgICAgIGlmIChkYXRhcy5zaXplID4gMCkge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cbiAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgICAgY29uc29sZS5sb2coJ05vIGhvb2tlZCBmaWxlcyBmb3VuZCwgaG9vayBmaWxlIGJ5IGNvbW1hbmQgb3B0aW9ucyBcIi0taG9vayA8ZmlsZT5cIicpO1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH0pLFxuICAgIG9wLmRlYm91bmNlVGltZSgwKSwgLy8gVGhlcmUgd2lsbCBiZSB0d28gY2hhbmdlIGV2ZW50cyBoYXBwZW5pbmcsIGxldCdzIGdldCB0aGUgbGFzdCBjaGFuZ2UgcmVzdWx0IG9ubHlcbiAgICBvcC50YXAoKGRhdGFzKSA9PiB7XG4gICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICAgIGNvbnNvbGUubG9nKCdIb29rZWQgdHNjb25maWcgZmlsZXM6Jyk7XG4gICAgICBmb3IgKGNvbnN0IGRhdGEgb2YgZGF0YXMudmFsdWVzKCkpIHtcbiAgICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgICAgIGNvbnNvbGUubG9nKCcgICcgKyBQYXRoLnJlc29sdmUoZ2V0Um9vdERpcigpLCBkYXRhLnJlbFBhdGgpKTtcbiAgICAgIH1cbiAgICB9KVxuICApLnN1YnNjcmliZSgpO1xufVxuIl19