"use strict";
/// <reference path="fonteditor-core.d.ts"/>
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
exports.notoSans = exports.example = exports.clipToWoff2 = exports.convert = void 0;
const fonteditor_core_1 = require("fonteditor-core");
const iconv = __importStar(require("iconv-lite"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const util_1 = require("util");
const Path = __importStar(require("path"));
const writeFileAsync = util_1.promisify(fs_extra_1.default.writeFile);
const readFileAsync = util_1.promisify(fs_extra_1.default.readFile);
const TYPES = ['ttf', 'woff', 'woff2', 'eof', 'otf', 'svg'];
function convert(str) {
    const buf = iconv.encode(str, 'utf8');
    return iconv.decode(buf, 'GB2312');
}
exports.convert = convert;
/**
 * clip and minimize font file to only contain specific character subset and cnverto woff2
 * @param source source file
 * @param clipChars subset
 */
function clipToWoff2(source, destDir, toFormats = ['woff2'], clipChars) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!source) {
            source = Path.resolve(__dirname, '../example-font/PingFang Regular.ttf');
        }
        const srcType = Path.extname(source).slice(1);
        if (!TYPES.includes(srcType)) {
            throw new Error(`Source file suffix must be one of ${TYPES.join(', ')}`);
        }
        const font = fonteditor_core_1.Font.create((yield readFileAsync(source)), {
            type: srcType,
            subset: clipChars ? clipChars.split('').map(c => c.charCodeAt(0)) : undefined,
            hinting: true,
            compound2simple: true
        });
        // font.optimize();
        // font.compound2simple();
        if (toFormats.includes('woff2'))
            yield fonteditor_core_1.woff2.init();
        fs_extra_1.default.mkdirpSync(destDir);
        return Promise.all(toFormats.map(format => {
            const file = Path.resolve(destDir, Path.basename(source, Path.extname(source)) + '.' + format);
            // tslint:disable-next-line: no-console
            console.log('[font-clip] write', file);
            return writeFileAsync(file, font.write({
                type: format,
                hinting: true
            }));
        }));
    });
}
exports.clipToWoff2 = clipToWoff2;
function example(subset) {
    return Promise.all([
        Path.resolve(__dirname, '../example-font/PingFang Regular.ttf'),
        Path.resolve(__dirname, '../example-font/PingFang Medium.ttf'),
        Path.resolve(__dirname, '../example-font/PingFang Bold.ttf')
    ].map(src => clipToWoff2(src, Path.resolve(Path.dirname(src), 'gen'), ['woff', 'woff2'], subset)));
}
exports.example = example;
function notoSans(subset) {
    return Promise.all([
        Path.resolve(__dirname, '../example-font/NotoSansSC-Black.otf'),
        Path.resolve(__dirname, '../example-font/NotoSansSC-Bold.otf'),
        Path.resolve(__dirname, '../example-font/NotoSansSC-Light.otf'),
        Path.resolve(__dirname, '../example-font/NotoSansSC-Medium.otf'),
        Path.resolve(__dirname, '../example-font/NotoSansSC-Regular.otf'),
        Path.resolve(__dirname, '../example-font/NotoSansSC-Thin.otf')
    ].map(src => clipToWoff2(src, Path.resolve(Path.dirname(src), 'gen'), ['woff', 'woff2'], subset)));
}
exports.notoSans = notoSans;
/**
 * https://www.qqxiuzi.cn/zh/hanzi-unicode-bianma.php
 * @param code
 */
// function isChineseCharCode(code: number) {
//   return code >= 0x4E00 && code <= 0x9FEF || code >= 0x3400 && code <= 0x4DB5;
// }
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZm9udC1jbGlwLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZm9udC1jbGlwLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSw0Q0FBNEM7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFFNUMscURBQXVEO0FBQ3ZELGtEQUFvQztBQUNwQyx3REFBMEI7QUFDMUIsK0JBQStCO0FBQy9CLDJDQUE2QjtBQUc3QixNQUFNLGNBQWMsR0FBcUUsZ0JBQVMsQ0FBQyxrQkFBRSxDQUFDLFNBQVMsQ0FBQyxDQUFDO0FBQ2pILE1BQU0sYUFBYSxHQUFHLGdCQUFTLENBQWlCLGtCQUFFLENBQUMsUUFBUSxDQUFDLENBQUM7QUFFN0QsTUFBTSxLQUFLLEdBQUcsQ0FBQyxLQUFLLEVBQUUsTUFBTSxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFDO0FBQzVELFNBQWdCLE9BQU8sQ0FBQyxHQUFXO0lBQ2pDLE1BQU0sR0FBRyxHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUFFLE1BQU0sQ0FBQyxDQUFDO0lBQ3RDLE9BQU8sS0FBSyxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUUsUUFBUSxDQUFDLENBQUM7QUFDckMsQ0FBQztBQUhELDBCQUdDO0FBRUQ7Ozs7R0FJRztBQUNILFNBQXNCLFdBQVcsQ0FBQyxNQUFjLEVBQUUsT0FBZSxFQUFFLFlBQWlDLENBQUMsT0FBTyxDQUFDLEVBQUUsU0FBeUI7O1FBQ3RJLElBQUksQ0FBQyxNQUFNLEVBQUU7WUFDWCxNQUFNLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUsc0NBQXNDLENBQUMsQ0FBQztTQUMxRTtRQUNELE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBc0IsQ0FBQztRQUVuRSxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMs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QUcsRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLEVBQUUsS0FBSyxDQUFDLEVBQUUsQ0FBQyxNQUFNLEVBQUMsT0FBTyxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3BHLENBQUM7QUFURCw0QkFTQztBQUVEOzs7R0FHRztBQUNILDZDQUE2QztBQUM3QyxpRkFBaUY7QUFDakYsSUFBSSIsInNvdXJjZXNDb250ZW50IjpbIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJmb250ZWRpdG9yLWNvcmUuZC50c1wiLz5cblxuaW1wb3J0IHtGb250LCB3b2ZmMiwgQ3JlYXRlT3B0fSBmcm9tICdmb250ZWRpdG9yLWNvcmUnO1xuaW1wb3J0ICogYXMgaWNvbnYgZnJvbSAnaWNvbnYtbGl0ZSc7XG5pbXBvcnQgZnMgZnJvbSAnZnMtZXh0cmEnO1xuaW1wb3J0IHtwcm9taXNpZnl9IGZyb20gJ3V0aWwnO1xuaW1wb3J0ICogYXMgUGF0aCBmcm9tICdwYXRoJztcblxudHlwZSBXUklURUZJTEVfQVJHID0gUGFyYW1ldGVyczwodHlwZW9mIGZzKVsnd3JpdGVGaWxlJ10+O1xuY29uc3Qgd3JpdGVGaWxlQXN5bmM6IChhcmc6IFdSSVRFRklMRV9BUkdbMF0sIGFyZzI6IFdSSVRFRklMRV9BUkdbMV0pID0+IFByb21pc2U8dm9pZD4gPSBwcm9taXNpZnkoZnMud3JpdGVGaWxlKTtcbmNvbnN0IHJlYWRGaWxlQXN5bmMgPSBwcm9taXNpZnk8c3RyaW5nLCBCdWZmZXI+KGZzLnJlYWRGaWxlKTtcblxuY29uc3QgVFlQRVMgPSBbJ3R0ZicsICd3b2ZmJywgJ3dvZmYyJywgJ2VvZicsICdvdGYnLCAnc3ZnJ107XG5leHBvcnQgZnVuY3Rpb24gY29udmVydChzdHI6IHN0cmluZykge1xuICBjb25zdCBidWYgPSBpY29udi5lbmNvZGUoc3RyLCAndXRmOCcpO1xuICByZXR1cm4gaWNvbnYuZGVjb2RlKGJ1ZiwgJ0dCMjMxMicpO1xufVxuXG4vKipcbiAqIGNsaXAgYW5kIG1pbmltaXplIGZvbnQgZmlsZSB0byBvbmx5IGNvbnRhaW4gc3BlY2lmaWMgY2hhcmFjdGVyIHN1YnNldCBhbmQgY252ZXJ0byB3b2ZmMlxuICogQHBhcmFtIHNvdXJjZSBzb3VyY2UgZmlsZVxuICogQHBhcmFtIGNsaXBDaGFycyBzdWJzZXRcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGNsaXBUb1dvZmYyKHNvdXJjZTogc3RyaW5nLCBkZXN0RGlyOiBzdHJpbmcsIHRvRm9ybWF0czogQ3JlYXRlT3B0Wyd0eXBlJ11bXSA9IFsnd29mZjInXSwgY2xpcENoYXJzPzogc3RyaW5nIHwgbnVsbCkge1xuICBpZiAoIXNvdXJjZSkge1xuICAgIHNvdXJjZSA9IFBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuLi9leGFtcGxlLWZvbnQvUGluZ0ZhbmcgUmVndWxhci50dGYnKTtcbiAgfVxuICBjb25zdCBzcmNUeXBlID0gUGF0aC5leHRuYW1lKHNvdXJjZSkuc2xpY2UoMSkgYXMgQ3JlYXRlT3B0Wyd0eXBlJ107XG5cbiAgaWYgKCFUWVBFUy5pbmNsdWRlcyhzcmNUeXBlKSkge1xuICAgIHRocm93IG5ldyBFcnJvcihgU291cmNlIGZpbGUgc3VmZml4IG11c3QgYmUgb25lIG9mICR7VFlQRVMuam9pbignLCAnKX1gKTtcbiAgfVxuXG4gIGNvbnN0IGZvbnQgPSBGb250LmNyZWF0ZSgoYXdhaXQgcmVhZEZpbGVBc3luYyhzb3VyY2UpKSwge1xuICAgIHR5cGU6IHNyY1R5cGUsXG4gICAgc3Vic2V0OiBjbGlwQ2hhcnMgPyBjbGlwQ2hhcnMuc3BsaXQoJycpLm1hcChjID0+IGMuY2hhckNvZGVBdCgwKSkgOiB1bmRlZmluZWQsXG4gICAgaGludGluZzogdHJ1ZSxcbiAgICBjb21wb3VuZDJzaW1wbGU6IHRydWVcbiAgfSk7XG4gIC8vIGZvbnQub3B0aW1pemUoKTtcbiAgLy8gZm9udC5jb21wb3VuZDJzaW1wbGUoKTtcbiAgaWYgKHRvRm9ybWF0cy5pbmNsdWRlcygnd29mZjInKSlcbiAgICBhd2FpdCB3b2ZmMi5pbml0KCk7XG5cbiAgZnMubWtkaXJwU3luYyhkZXN0RGlyKTtcbiAgcmV0dXJuIFByb21pc2UuYWxsKHRvRm9ybWF0cy5tYXAoZm9ybWF0ID0+IHtcbiAgICBjb25zdCBmaWxlID0gUGF0aC5yZXNvbHZlKGRlc3REaXIsIFBhdGguYmFzZW5hbWUoc291cmNlLCBQYXRoLmV4dG5hbWUoc291cmNlKSkgKyAnLicgKyBmb3JtYXQpO1xuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgIGNvbnNvbGUubG9nKCdbZm9udC1jbGlwXSB3cml0ZScsIGZpbGUpO1xuICAgIHJldHVybiB3cml0ZUZpbGVBc3luYyhmaWxlLFxuICAgICAgZm9udC53cml0ZSh7XG4gICAgICB0eXBlOiBmb3JtYXQsXG4gICAgICBoaW50aW5nOiB0cnVlXG4gICAgfSkpO1xuICB9KSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBleGFtcGxlKHN1YnNldD86IHN0cmluZykge1xuICByZXR1cm4gUHJvbWlzZS5hbGwoW1xuICAgIFBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuLi9leGFtcGxlLWZvbnQvUGluZ0ZhbmcgUmVndWxhci50dGYnKSxcbiAgICBQYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi4vZXhhbXBsZS1mb250L1BpbmdGYW5nIE1lZGl1bS50dGYnKSxcbiAgICBQYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi4vZXhhbXBsZS1mb250L1BpbmdGYW5nIEJvbGQudHRmJylcbiAgXS5tYXAoc3JjID0+IGNsaXBUb1dvZmYyKHNyYywgUGF0aC5yZXNvbHZlKFBhdGguZGlybmFtZShzcmMpLCAnZ2VuJyksIFsnd29mZicsJ3dvZmYyJ10sIHN1YnNldCkpKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIG5vdG9TYW5zKHN1YnNldD86IHN0cmluZykge1xuICByZXR1cm4gUHJvbWlzZS5hbGwoW1xuICAgIFBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuLi9leGFtcGxlLWZvbnQvTm90b1NhbnNTQy1CbGFjay5vdGYnKSxcbiAgICBQYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi4vZXhhbXBsZS1mb250L05vdG9TYW5zU0MtQm9sZC5vdGYnKSxcbiAgICBQYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi4vZXhhbXBsZS1mb250L05vdG9TYW5zU0MtTGlnaHQub3RmJyksXG4gICAgUGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4uL2V4YW1wbGUtZm9udC9Ob3RvU2Fuc1NDLU1lZGl1bS5vdGYnKSxcbiAgICBQYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi4vZXhhbXBsZS1mb250L05vdG9TYW5zU0MtUmVndWxhci5vdGYnKSxcbiAgICBQYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi4vZXhhbXBsZS1mb250L05vdG9TYW5zU0MtVGhpbi5vdGYnKVxuICBdLm1hcChzcmMgPT4gY2xpcFRvV29mZjIoc3JjLCBQYXRoLnJlc29sdmUoUGF0aC5kaXJuYW1lKHNyYyksICdnZW4nKSwgWyd3b2ZmJywnd29mZjInXSwgc3Vic2V0KSkpO1xufVxuXG4vKipcbiAqIGh0dHBzOi8vd3d3LnFxeGl1emkuY24vemgvaGFuemktdW5pY29kZS1iaWFubWEucGhwXG4gKiBAcGFyYW0gY29kZSBcbiAqL1xuLy8gZnVuY3Rpb24gaXNDaGluZXNlQ2hhckNvZGUoY29kZTogbnVtYmVyKSB7XG4vLyAgIHJldHVybiBjb2RlID49IDB4NEUwMCAmJiBjb2RlIDw9IDB4OUZFRiB8fCBjb2RlID49IDB4MzQwMCAmJiBjb2RlIDw9IDB4NERCNTtcbi8vIH1cbiJdfQ==