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
    if (opts.hook) {
        editor_helper_1.dispatcher.hookTsconfig(opts.hook);
    }
    if (opts.unhook) {
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
    }), op.tap((datas) => {
        // tslint:disable-next-line: no-console
        console.log('Hooked tsconfig files:');
        for (const data of datas.values()) {
            // tslint:disable-next-line: no-console
            console.log('  ' + path_1.default.resolve(misc_1.getRootDir(), data.relPath));
        }
    })).subscribe();
}
exports.doTsconfig = doTsconfig;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLXRzY29uZmlnLWhvb2suanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy9jbWQvY2xpLXRzY29uZmlnLWhvb2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLG9EQUFzRDtBQUN0RCxtREFBcUM7QUFDckMsb0NBQW9DO0FBQ3BDLGdEQUF3QjtBQUN4Qix3Q0FBeUM7QUFRekMsU0FBZ0IsVUFBVSxDQUFDLElBQWdCO0lBQ3pDLElBQUksSUFBSSxDQUFDLElBQUksRUFBRTtRQUNiLDBCQUFVLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztLQUNwQztJQUNELElBQUksSUFBSSxDQUFDLE1BQU0sRUFBRTtRQUNmLDBCQUFVLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztLQUN4QztJQUNELElBQUksSUFBSSxDQUFDLFNBQVMsRUFBRTtRQUNsQiwwQkFBVSxDQUFDLFNBQVMsRUFBRSxDQUFDO0tBQ3hCO0lBQ0Qsd0JBQVEsRUFBRSxDQUFDLElBQUksQ0FDYixFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLGlCQUFpQixDQUFDLEVBQ2hDLEVBQUUsQ0FBQyxvQkFBb0IsRUFBRSxFQUN6QixFQUFFLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxFQUFFO1FBQ2hCLElBQUksS0FBSyxDQUFDLElBQUksR0FBRyxDQUFDLEVBQUU7WUFDbEIsT0FBTyxJQUFJLENBQUM7U0FDYjtRQUNELHVDQUF1QztRQUN2QyxPQUFPLENBQUMsR0FBRyxDQUFDLHFFQUFxRSxDQUFDLENBQUM7UUFDbkYsT0FBTyxLQUFLLENBQUM7SUFDZixDQUFDLENBQUMsRUFDRixFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxFQUFFLEVBQUU7UUFDZix1Q0FBdUM7UUFDdkMsT0FBTyxDQUFDLEdBQUcsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDO1FBQ3RDLEtBQUssTUFBTSxJQUFJLElBQUksS0FBSyxDQUFDLE1BQU0sRUFBRSxFQUFFO1lBQ2pDLHVDQUF1QztZQUN2QyxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksR0FBRyxjQUFJLENBQUMsT0FBTyxDQUFDLGlCQUFVLEVBQUUsRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztTQUM5RDtJQUNILENBQUMsQ0FBQyxDQUNILENBQUMsU0FBUyxFQUFFLENBQUM7QUFDaEIsQ0FBQztBQTlCRCxnQ0E4QkMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge2dldFN0b3JlLCBkaXNwYXRjaGVyfSBmcm9tICcuLi9lZGl0b3ItaGVscGVyJztcbmltcG9ydCAqIGFzIG9wIGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbi8vIGltcG9ydCB7Z2V0TG9nZ2VyfSBmcm9tICdsb2c0anMnO1xuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQge2dldFJvb3REaXJ9IGZyb20gJy4uL3V0aWxzL21pc2MnO1xuXG5leHBvcnQgaW50ZXJmYWNlIENsaU9wdGlvbnMge1xuICBob29rOiBzdHJpbmdbXTtcbiAgdW5ob29rOiBzdHJpbmdbXTtcbiAgdW5ob29rQWxsOiBib29sZWFuO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZG9Uc2NvbmZpZyhvcHRzOiBDbGlPcHRpb25zKSB7XG4gIGlmIChvcHRzLmhvb2spIHtcbiAgICBkaXNwYXRjaGVyLmhvb2tUc2NvbmZpZyhvcHRzLmhvb2spO1xuICB9XG4gIGlmIChvcHRzLnVuaG9vaykge1xuICAgIGRpc3BhdGNoZXIudW5Ib29rVHNjb25maWcob3B0cy51bmhvb2spO1xuICB9XG4gIGlmIChvcHRzLnVuaG9va0FsbCkge1xuICAgIGRpc3BhdGNoZXIudW5Ib29rQWxsKCk7XG4gIH1cbiAgZ2V0U3RvcmUoKS5waXBlKFxuICAgIG9wLm1hcChzID0+IHMudHNjb25maWdCeVJlbFBhdGgpLFxuICAgIG9wLmRpc3RpbmN0VW50aWxDaGFuZ2VkKCksXG4gICAgb3AuZmlsdGVyKGRhdGFzID0+IHtcbiAgICAgIGlmIChkYXRhcy5zaXplID4gMCkge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cbiAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgICAgY29uc29sZS5sb2coJ05vIGhvb2tlZCBmaWxlcyBmb3VuZCwgaG9vayBmaWxlIGJ5IGNvbW1hbmQgb3B0aW9ucyBcIi0taG9vayA8ZmlsZT5cIicpO1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH0pLFxuICAgIG9wLnRhcCgoZGF0YXMpID0+IHtcbiAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgICAgY29uc29sZS5sb2coJ0hvb2tlZCB0c2NvbmZpZyBmaWxlczonKTtcbiAgICAgIGZvciAoY29uc3QgZGF0YSBvZiBkYXRhcy52YWx1ZXMoKSkge1xuICAgICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICAgICAgY29uc29sZS5sb2coJyAgJyArIFBhdGgucmVzb2x2ZShnZXRSb290RGlyKCksIGRhdGEucmVsUGF0aCkpO1xuICAgICAgfVxuICAgIH0pXG4gICkuc3Vic2NyaWJlKCk7XG59XG4iXX0=