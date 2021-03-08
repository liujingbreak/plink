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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const __plink_1 = __importDefault(require("__plink"));
const cliExt = (program) => {
    const scanCmd = program.command('scan-tran <locale> [pkg-name]')
        .description('Can string literals, template expressions, JSX text from specific TS[X], JS[X] files, generate a temporary i18n metadata files', {
        locale: 'e.g. "zh", "zh_CN", "zh-CN"...',
        'pkg-name': 'linked (source) package name, will scann package directory for js files,' +
            ' metadata output directory is <pkg dir>/ts/i18n'
    })
        .option('-d,--dir <JS directory>', 'JS file directory to be scanned, you may specify either [pkg-name] or "-d <JS directory>" as input file directory')
        .option('-r,--root-dir <dir>', 'the root dir of input file directory, to calculate relative path of output metadata file, default is same as "-d"')
        .option('-m,--metadata-dir <metadata-dir>', 'output directory of metadata JSON files, default is <pkg dir>/ts/i18n')
        .option('--exclude-js', 'exclude JS, JSX files', true)
        .action((locale, pkgName) => __awaiter(void 0, void 0, void 0, function* () {
        if (pkgName == null && scanCmd.opts().dir == null) {
            __plink_1.default.logger.error('[pkg-name] and "-d" can not be both empty');
        }
        yield (yield Promise.resolve().then(() => __importStar(require('./cli-scan-tran')))).scanTran(locale, pkgName, scanCmd.opts().rootDir, scanCmd.opts().dir, scanCmd.opts().metadataDir, scanCmd.opts().excludeJs);
    }));
};
exports.default = cliExt;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY2xpLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUNBLHNEQUE0QjtBQUU1QixNQUFNLE1BQU0sR0FBaUIsQ0FBQyxPQUFPLEVBQUUsRUFBRTtJQUN2QyxNQUFNLE9BQU8sR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLCtCQUErQixDQUFDO1NBQy9ELFdBQVcsQ0FBQyxnSUFBZ0ksRUFDM0k7UUFDRSxNQUFNLEVBQUUsZ0NBQWdDO1FBQ3hDLFVBQVUsRUFBRSwwRUFBMEU7WUFDdEYsaURBQWlEO0tBQ2xELENBQUM7U0FDSCxNQUFNLENBQUMseUJBQXlCLEVBQy9CLG1IQUFtSCxDQUFDO1NBQ3JILE1BQU0sQ0FBQyxxQkFBcUIsRUFBRSxtSEFBbUgsQ0FBQztTQUNsSixNQUFNLENBQUMsa0NBQWtDLEVBQUcsdUVBQXVFLENBQUM7U0FDcEgsTUFBTSxDQUFDLGNBQWMsRUFBRSx1QkFBdUIsRUFBRSxJQUFJLENBQUM7U0FDckQsTUFBTSxDQUFDLENBQU8sTUFBYyxFQUFFLE9BQWdCLEVBQUUsRUFBRTtRQUNqRCxJQUFJLE9BQU8sSUFBSSxJQUFJLElBQUksT0FBTyxDQUFDLElBQUksRUFBRSxDQUFDLEdBQUcsSUFBSSxJQUFJLEVBQUU7WUFDakQsaUJBQUssQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLDJDQUEyQyxDQUFDLENBQUM7U0FDakU7UUFFRCxNQUFNLENBQUMsd0RBQWEsaUJBQWlCLEdBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQ3JELE9BQU8sRUFBRSxPQUFPLENBQUMsSUFBSSxFQUFFLENBQUMsT0FBTyxFQUFFLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQyxHQUFHLEVBQUUsT0FBTyxDQUFDLElBQUksRUFBRSxDQUFDLFdBQVcsRUFBRSxPQUFPLENBQUMsSUFBSSxFQUFFLENBQUMsU0FBUyxDQUFDLENBQUM7SUFDL0csQ0FBQyxDQUFBLENBQUMsQ0FBQztBQUVMLENBQUMsQ0FBQztBQUVGLGtCQUFlLE1BQU0sQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7Q2xpRXh0ZW5zaW9ufSBmcm9tICdAd2ZoL3BsaW5rL3dmaC9kaXN0JztcbmltcG9ydCBwbGluayBmcm9tICdfX3BsaW5rJztcblxuY29uc3QgY2xpRXh0OiBDbGlFeHRlbnNpb24gPSAocHJvZ3JhbSkgPT4ge1xuICBjb25zdCBzY2FuQ21kID0gcHJvZ3JhbS5jb21tYW5kKCdzY2FuLXRyYW4gPGxvY2FsZT4gW3BrZy1uYW1lXScpXG4gIC5kZXNjcmlwdGlvbignQ2FuIHN0cmluZyBsaXRlcmFscywgdGVtcGxhdGUgZXhwcmVzc2lvbnMsIEpTWCB0ZXh0IGZyb20gc3BlY2lmaWMgVFNbWF0sIEpTW1hdIGZpbGVzLCBnZW5lcmF0ZSBhIHRlbXBvcmFyeSBpMThuIG1ldGFkYXRhIGZpbGVzJyxcbiAgICB7XG4gICAgICBsb2NhbGU6ICdlLmcuIFwiemhcIiwgXCJ6aF9DTlwiLCBcInpoLUNOXCIuLi4nLFxuICAgICAgJ3BrZy1uYW1lJzogJ2xpbmtlZCAoc291cmNlKSBwYWNrYWdlIG5hbWUsIHdpbGwgc2Nhbm4gcGFja2FnZSBkaXJlY3RvcnkgZm9yIGpzIGZpbGVzLCcgK1xuICAgICAgJyBtZXRhZGF0YSBvdXRwdXQgZGlyZWN0b3J5IGlzIDxwa2cgZGlyPi90cy9pMThuJ1xuICAgIH0pXG4gIC5vcHRpb24oJy1kLC0tZGlyIDxKUyBkaXJlY3Rvcnk+JyxcbiAgICAnSlMgZmlsZSBkaXJlY3RvcnkgdG8gYmUgc2Nhbm5lZCwgeW91IG1heSBzcGVjaWZ5IGVpdGhlciBbcGtnLW5hbWVdIG9yIFwiLWQgPEpTIGRpcmVjdG9yeT5cIiBhcyBpbnB1dCBmaWxlIGRpcmVjdG9yeScpXG4gIC5vcHRpb24oJy1yLC0tcm9vdC1kaXIgPGRpcj4nLCAndGhlIHJvb3QgZGlyIG9mIGlucHV0IGZpbGUgZGlyZWN0b3J5LCB0byBjYWxjdWxhdGUgcmVsYXRpdmUgcGF0aCBvZiBvdXRwdXQgbWV0YWRhdGEgZmlsZSwgZGVmYXVsdCBpcyBzYW1lIGFzIFwiLWRcIicpXG4gIC5vcHRpb24oJy1tLC0tbWV0YWRhdGEtZGlyIDxtZXRhZGF0YS1kaXI+JywgICdvdXRwdXQgZGlyZWN0b3J5IG9mIG1ldGFkYXRhIEpTT04gZmlsZXMsIGRlZmF1bHQgaXMgPHBrZyBkaXI+L3RzL2kxOG4nKVxuICAub3B0aW9uKCctLWV4Y2x1ZGUtanMnLCAnZXhjbHVkZSBKUywgSlNYIGZpbGVzJywgdHJ1ZSlcbiAgLmFjdGlvbihhc3luYyAobG9jYWxlOiBzdHJpbmcsIHBrZ05hbWU/OiBzdHJpbmcpID0+IHtcbiAgICBpZiAocGtnTmFtZSA9PSBudWxsICYmIHNjYW5DbWQub3B0cygpLmRpciA9PSBudWxsKSB7XG4gICAgICBwbGluay5sb2dnZXIuZXJyb3IoJ1twa2ctbmFtZV0gYW5kIFwiLWRcIiBjYW4gbm90IGJlIGJvdGggZW1wdHknKTtcbiAgICB9XG5cbiAgICBhd2FpdCAoYXdhaXQgaW1wb3J0KCcuL2NsaS1zY2FuLXRyYW4nKSkuc2NhblRyYW4obG9jYWxlLFxuICAgICAgcGtnTmFtZSwgc2NhbkNtZC5vcHRzKCkucm9vdERpciwgc2NhbkNtZC5vcHRzKCkuZGlyLCBzY2FuQ21kLm9wdHMoKS5tZXRhZGF0YURpciwgc2NhbkNtZC5vcHRzKCkuZXhjbHVkZUpzKTtcbiAgfSk7XG5cbn07XG5cbmV4cG9ydCBkZWZhdWx0IGNsaUV4dDtcbiJdfQ==