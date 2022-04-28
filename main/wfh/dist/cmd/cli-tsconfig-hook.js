"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
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
const path_1 = __importDefault(require("path"));
const op = __importStar(require("rxjs/operators"));
const editor_helper_1 = require("../editor-helper");
// import {getLogger} from 'log4js';
const misc_1 = require("../utils/misc");
const store_1 = require("../store");
function doTsconfig(opts) {
    if (opts.hook && opts.hook.length > 0) {
        store_1.dispatcher.changeActionOnExit('save');
        editor_helper_1.dispatcher.hookTsconfig(opts.hook);
    }
    if (opts.unhook && opts.unhook.length > 0) {
        store_1.dispatcher.changeActionOnExit('save');
        editor_helper_1.dispatcher.unHookTsconfig(opts.unhook);
    }
    if (opts.unhookAll) {
        store_1.dispatcher.changeActionOnExit('save');
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLXRzY29uZmlnLWhvb2suanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy9jbWQvY2xpLXRzY29uZmlnLWhvb2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxnREFBd0I7QUFDeEIsbURBQXFDO0FBQ3JDLG9EQUFzRDtBQUN0RCxvQ0FBb0M7QUFDcEMsd0NBQXlDO0FBQ3pDLG9DQUE4RDtBQVE5RCxTQUFnQixVQUFVLENBQUMsSUFBZ0I7SUFDekMsSUFBSSxJQUFJLENBQUMsSUFBSSxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRTtRQUNyQyxrQkFBc0IsQ0FBQyxrQkFBa0IsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUNsRCwwQkFBVSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7S0FDcEM7SUFDRCxJQUFJLElBQUksQ0FBQyxNQUFNLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO1FBQ3pDLGtCQUFzQixDQUFDLGtCQUFrQixDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ2xELDBCQUFVLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztLQUN4QztJQUNELElBQUksSUFBSSxDQUFDLFNBQVMsRUFBRTtRQUNsQixrQkFBc0IsQ0FBQyxrQkFBa0IsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUNsRCwwQkFBVSxDQUFDLFNBQVMsRUFBRSxDQUFDO0tBQ3hCO0lBQ0QsSUFBQSx3QkFBUSxHQUFFLENBQUMsSUFBSSxDQUNiLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsaUJBQWlCLENBQUMsRUFDaEMsRUFBRSxDQUFDLG9CQUFvQixFQUFFLEVBQ3pCLEVBQUUsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLEVBQUU7UUFDaEIsSUFBSSxLQUFLLENBQUMsSUFBSSxHQUFHLENBQUMsRUFBRTtZQUNsQixPQUFPLElBQUksQ0FBQztTQUNiO1FBQ0Qsc0NBQXNDO1FBQ3RDLE9BQU8sQ0FBQyxHQUFHLENBQUMscUVBQXFFLENBQUMsQ0FBQztRQUNuRixPQUFPLEtBQUssQ0FBQztJQUNmLENBQUMsQ0FBQyxFQUNGLEVBQUUsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLEVBQUUsbUZBQW1GO0lBQ3ZHLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRTtRQUNmLHNDQUFzQztRQUN0QyxPQUFPLENBQUMsR0FBRyxDQUFDLHdCQUF3QixDQUFDLENBQUM7UUFDdEMsS0FBSyxNQUFNLElBQUksSUFBSSxLQUFLLENBQUMsTUFBTSxFQUFFLEVBQUU7WUFDakMsc0NBQXNDO1lBQ3RDLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxHQUFHLGNBQUksQ0FBQyxPQUFPLENBQUMsSUFBQSxpQkFBVSxHQUFFLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7U0FDOUQ7SUFDSCxDQUFDLENBQUMsQ0FDSCxDQUFDLFNBQVMsRUFBRSxDQUFDO0FBQ2hCLENBQUM7QUFsQ0QsZ0NBa0NDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgKiBhcyBvcCBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5pbXBvcnQge2dldFN0b3JlLCBkaXNwYXRjaGVyfSBmcm9tICcuLi9lZGl0b3ItaGVscGVyJztcbi8vIGltcG9ydCB7Z2V0TG9nZ2VyfSBmcm9tICdsb2c0anMnO1xuaW1wb3J0IHtnZXRSb290RGlyfSBmcm9tICcuLi91dGlscy9taXNjJztcbmltcG9ydCB7ZGlzcGF0Y2hlciBhcyBzdG9yZVNldHRpbmdEaXNwYXRjaGVyfSBmcm9tICcuLi9zdG9yZSc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgQ2xpT3B0aW9ucyB7XG4gIGhvb2s6IHN0cmluZ1tdO1xuICB1bmhvb2s6IHN0cmluZ1tdO1xuICB1bmhvb2tBbGw6IGJvb2xlYW47XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBkb1RzY29uZmlnKG9wdHM6IENsaU9wdGlvbnMpIHtcbiAgaWYgKG9wdHMuaG9vayAmJiBvcHRzLmhvb2subGVuZ3RoID4gMCkge1xuICAgIHN0b3JlU2V0dGluZ0Rpc3BhdGNoZXIuY2hhbmdlQWN0aW9uT25FeGl0KCdzYXZlJyk7XG4gICAgZGlzcGF0Y2hlci5ob29rVHNjb25maWcob3B0cy5ob29rKTtcbiAgfVxuICBpZiAob3B0cy51bmhvb2sgJiYgb3B0cy51bmhvb2subGVuZ3RoID4gMCkge1xuICAgIHN0b3JlU2V0dGluZ0Rpc3BhdGNoZXIuY2hhbmdlQWN0aW9uT25FeGl0KCdzYXZlJyk7XG4gICAgZGlzcGF0Y2hlci51bkhvb2tUc2NvbmZpZyhvcHRzLnVuaG9vayk7XG4gIH1cbiAgaWYgKG9wdHMudW5ob29rQWxsKSB7XG4gICAgc3RvcmVTZXR0aW5nRGlzcGF0Y2hlci5jaGFuZ2VBY3Rpb25PbkV4aXQoJ3NhdmUnKTtcbiAgICBkaXNwYXRjaGVyLnVuSG9va0FsbCgpO1xuICB9XG4gIGdldFN0b3JlKCkucGlwZShcbiAgICBvcC5tYXAocyA9PiBzLnRzY29uZmlnQnlSZWxQYXRoKSxcbiAgICBvcC5kaXN0aW5jdFVudGlsQ2hhbmdlZCgpLFxuICAgIG9wLmZpbHRlcihkYXRhcyA9PiB7XG4gICAgICBpZiAoZGF0YXMuc2l6ZSA+IDApIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG4gICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgICAgY29uc29sZS5sb2coJ05vIGhvb2tlZCBmaWxlcyBmb3VuZCwgaG9vayBmaWxlIGJ5IGNvbW1hbmQgb3B0aW9ucyBcIi0taG9vayA8ZmlsZT5cIicpO1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH0pLFxuICAgIG9wLmRlYm91bmNlVGltZSgwKSwgLy8gVGhlcmUgd2lsbCBiZSB0d28gY2hhbmdlIGV2ZW50cyBoYXBwZW5pbmcsIGxldCdzIGdldCB0aGUgbGFzdCBjaGFuZ2UgcmVzdWx0IG9ubHlcbiAgICBvcC50YXAoKGRhdGFzKSA9PiB7XG4gICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgICAgY29uc29sZS5sb2coJ0hvb2tlZCB0c2NvbmZpZyBmaWxlczonKTtcbiAgICAgIGZvciAoY29uc3QgZGF0YSBvZiBkYXRhcy52YWx1ZXMoKSkge1xuICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgICAgICBjb25zb2xlLmxvZygnICAnICsgUGF0aC5yZXNvbHZlKGdldFJvb3REaXIoKSwgZGF0YS5yZWxQYXRoKSk7XG4gICAgICB9XG4gICAgfSlcbiAgKS5zdWJzY3JpYmUoKTtcbn1cbiJdfQ==