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
    (0, editor_helper_1.getStore)().pipe(op.map(s => s.tsconfigByRelPath), op.distinctUntilChanged(), op.filter(datas => {
        if (datas.size > 0) {
            return true;
        }
        // eslint-disable-next-line no-console
        console.log('No hooked files found, hook file by command options "--hook <file>"');
        return false;
    }), op.debounceTime(0), // There will be two change events happening, let's get the last change result only
    op.tap((datas) => {
        // eslint-disable-next-line no-console
        console.log('Hooked tsconfig files:');
        for (const data of datas.values()) {
            // eslint-disable-next-line no-console
            console.log('  ' + path_1.default.resolve((0, misc_1.getRootDir)(), data.relPath));
        }
    })).subscribe();
}
exports.doTsconfig = doTsconfig;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLXRzY29uZmlnLWhvb2suanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy9jbWQvY2xpLXRzY29uZmlnLWhvb2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLG9EQUFzRDtBQUN0RCxtREFBcUM7QUFDckMsb0NBQW9DO0FBQ3BDLGdEQUF3QjtBQUN4Qix3Q0FBeUM7QUFRekMsU0FBZ0IsVUFBVSxDQUFDLElBQWdCO0lBQ3pDLElBQUksSUFBSSxDQUFDLElBQUksSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUU7UUFDckMsMEJBQVUsQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0tBQ3BDO0lBQ0QsSUFBSSxJQUFJLENBQUMsTUFBTSxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRTtRQUN6QywwQkFBVSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7S0FDeEM7SUFDRCxJQUFJLElBQUksQ0FBQyxTQUFTLEVBQUU7UUFDbEIsMEJBQVUsQ0FBQyxTQUFTLEVBQUUsQ0FBQztLQUN4QjtJQUNELElBQUEsd0JBQVEsR0FBRSxDQUFDLElBQUksQ0FDYixFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLGlCQUFpQixDQUFDLEVBQ2hDLEVBQUUsQ0FBQyxvQkFBb0IsRUFBRSxFQUN6QixFQUFFLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxFQUFFO1FBQ2hCLElBQUksS0FBSyxDQUFDLElBQUksR0FBRyxDQUFDLEVBQUU7WUFDbEIsT0FBTyxJQUFJLENBQUM7U0FDYjtRQUNELHNDQUFzQztRQUN0QyxPQUFPLENBQUMsR0FBRyxDQUFDLHFFQUFxRSxDQUFDLENBQUM7UUFDbkYsT0FBTyxLQUFLLENBQUM7SUFDZixDQUFDLENBQUMsRUFDRixFQUFFLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxFQUFFLG1GQUFtRjtJQUN2RyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxFQUFFLEVBQUU7UUFDZixzQ0FBc0M7UUFDdEMsT0FBTyxDQUFDLEdBQUcsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDO1FBQ3RDLEtBQUssTUFBTSxJQUFJLElBQUksS0FBSyxDQUFDLE1BQU0sRUFBRSxFQUFFO1lBQ2pDLHNDQUFzQztZQUN0QyxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksR0FBRyxjQUFJLENBQUMsT0FBTyxDQUFDLElBQUEsaUJBQVUsR0FBRSxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO1NBQzlEO0lBQ0gsQ0FBQyxDQUFDLENBQ0gsQ0FBQyxTQUFTLEVBQUUsQ0FBQztBQUNoQixDQUFDO0FBL0JELGdDQStCQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7Z2V0U3RvcmUsIGRpc3BhdGNoZXJ9IGZyb20gJy4uL2VkaXRvci1oZWxwZXInO1xuaW1wb3J0ICogYXMgb3AgZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuLy8gaW1wb3J0IHtnZXRMb2dnZXJ9IGZyb20gJ2xvZzRqcyc7XG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7Z2V0Um9vdERpcn0gZnJvbSAnLi4vdXRpbHMvbWlzYyc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgQ2xpT3B0aW9ucyB7XG4gIGhvb2s6IHN0cmluZ1tdO1xuICB1bmhvb2s6IHN0cmluZ1tdO1xuICB1bmhvb2tBbGw6IGJvb2xlYW47XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBkb1RzY29uZmlnKG9wdHM6IENsaU9wdGlvbnMpIHtcbiAgaWYgKG9wdHMuaG9vayAmJiBvcHRzLmhvb2subGVuZ3RoID4gMCkge1xuICAgIGRpc3BhdGNoZXIuaG9va1RzY29uZmlnKG9wdHMuaG9vayk7XG4gIH1cbiAgaWYgKG9wdHMudW5ob29rICYmIG9wdHMudW5ob29rLmxlbmd0aCA+IDApIHtcbiAgICBkaXNwYXRjaGVyLnVuSG9va1RzY29uZmlnKG9wdHMudW5ob29rKTtcbiAgfVxuICBpZiAob3B0cy51bmhvb2tBbGwpIHtcbiAgICBkaXNwYXRjaGVyLnVuSG9va0FsbCgpO1xuICB9XG4gIGdldFN0b3JlKCkucGlwZShcbiAgICBvcC5tYXAocyA9PiBzLnRzY29uZmlnQnlSZWxQYXRoKSxcbiAgICBvcC5kaXN0aW5jdFVudGlsQ2hhbmdlZCgpLFxuICAgIG9wLmZpbHRlcihkYXRhcyA9PiB7XG4gICAgICBpZiAoZGF0YXMuc2l6ZSA+IDApIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG4gICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgICAgY29uc29sZS5sb2coJ05vIGhvb2tlZCBmaWxlcyBmb3VuZCwgaG9vayBmaWxlIGJ5IGNvbW1hbmQgb3B0aW9ucyBcIi0taG9vayA8ZmlsZT5cIicpO1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH0pLFxuICAgIG9wLmRlYm91bmNlVGltZSgwKSwgLy8gVGhlcmUgd2lsbCBiZSB0d28gY2hhbmdlIGV2ZW50cyBoYXBwZW5pbmcsIGxldCdzIGdldCB0aGUgbGFzdCBjaGFuZ2UgcmVzdWx0IG9ubHlcbiAgICBvcC50YXAoKGRhdGFzKSA9PiB7XG4gICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgICAgY29uc29sZS5sb2coJ0hvb2tlZCB0c2NvbmZpZyBmaWxlczonKTtcbiAgICAgIGZvciAoY29uc3QgZGF0YSBvZiBkYXRhcy52YWx1ZXMoKSkge1xuICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgICAgICBjb25zb2xlLmxvZygnICAnICsgUGF0aC5yZXNvbHZlKGdldFJvb3REaXIoKSwgZGF0YS5yZWxQYXRoKSk7XG4gICAgICB9XG4gICAgfSlcbiAgKS5zdWJzY3JpYmUoKTtcbn1cbiJdfQ==