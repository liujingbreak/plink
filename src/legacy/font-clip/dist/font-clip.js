"use strict";
/// <reference path="fonteditor-core.d.ts"/>
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const fonteditor_core_1 = require("fonteditor-core");
const iconv = tslib_1.__importStar(require("iconv-lite"));
const fs_extra_1 = tslib_1.__importDefault(require("fs-extra"));
const util_1 = require("util");
const Path = tslib_1.__importStar(require("path"));
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
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9mb250LWNsaXAvdHMvZm9udC1jbGlwLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSw0Q0FBNEM7OztBQUU1QyxxREFBdUQ7QUFDdkQsMERBQW9DO0FBQ3BDLGdFQUEwQjtBQUMxQiwrQkFBK0I7QUFDL0IsbURBQTZCO0FBRzdCLE1BQU0sY0FBYyxHQUFxRSxnQkFBUyxDQUFDLGtCQUFFLENBQUMsU0FBUyxDQUFDLENBQUM7QUFDakgsTUFBTSxhQUFhLEdBQUcsZ0JBQVMsQ0FBaUIsa0JBQUUsQ0FBQyxRQUFRLENBQUMsQ0FBQztBQUU3RCxNQUFNLEtBQUssR0FBRyxDQUFDLEtBQUssRUFBRSxNQUFNLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUM7QUFDNUQsU0FBZ0IsT0FBTyxDQUFDLEdBQVc7SUFDakMsTUFBTSxHQUFHLEdBQUcsS0FBSyxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUUsTUFBTSxDQUFDLENBQUM7SUFDdEMsT0FBTyxLQUFLLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBRSxRQUFRLENBQUMsQ0FBQztBQUNyQyxDQUFDO0FBSEQsMEJBR0M7QUFFRDs7OztHQUlHO0FBQ0gsU0FBc0IsV0FBVyxDQUFDLE1BQWMsRUFBRSxPQUFlLEVBQUUsWUFBaUMsQ0FBQyxPQUFPLENBQUMsRUFBRSxTQUF5Qjs7UUFDdEksSUFBSSxDQUFDLE1BQU0sRUFBRTtZQUNYLE1BQU0sR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSxzQ0FBc0MsQ0FBQyxDQUFDO1NBQzFFO1FBQ0QsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFzQixDQUFDO1FBRW5FLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxFQUFFO1lBQzVCLE1BQU0sSUFBSSxLQUFLLENBQUMscUNBQXFDLEtBQUss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Q0FBQyxHQUFHLENBQUMsRUFBRSxLQUFLLENBQUMsRUFBRSxDQUFDLE1BQU0sRUFBQyxPQUFPLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDcEcsQ0FBQztBQVRELDRCQVNDO0FBRUQ7OztHQUdHO0FBQ0gsNkNBQTZDO0FBQzdDLGlGQUFpRjtBQUNqRixJQUFJIiwiZmlsZSI6Im5vZGVfbW9kdWxlcy9mb250LWNsaXAvZGlzdC9mb250LWNsaXAuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiZm9udGVkaXRvci1jb3JlLmQudHNcIi8+XG5cbmltcG9ydCB7Rm9udCwgd29mZjIsIENyZWF0ZU9wdH0gZnJvbSAnZm9udGVkaXRvci1jb3JlJztcbmltcG9ydCAqIGFzIGljb252IGZyb20gJ2ljb252LWxpdGUnO1xuaW1wb3J0IGZzIGZyb20gJ2ZzLWV4dHJhJztcbmltcG9ydCB7cHJvbWlzaWZ5fSBmcm9tICd1dGlsJztcbmltcG9ydCAqIGFzIFBhdGggZnJvbSAncGF0aCc7XG5cbnR5cGUgV1JJVEVGSUxFX0FSRyA9IFBhcmFtZXRlcnM8KHR5cGVvZiBmcylbJ3dyaXRlRmlsZSddPjtcbmNvbnN0IHdyaXRlRmlsZUFzeW5jOiAoYXJnOiBXUklURUZJTEVfQVJHWzBdLCBhcmcyOiBXUklURUZJTEVfQVJHWzFdKSA9PiBQcm9taXNlPHZvaWQ+ID0gcHJvbWlzaWZ5KGZzLndyaXRlRmlsZSk7XG5jb25zdCByZWFkRmlsZUFzeW5jID0gcHJvbWlzaWZ5PHN0cmluZywgQnVmZmVyPihmcy5yZWFkRmlsZSk7XG5cbmNvbnN0IFRZUEVTID0gWyd0dGYnLCAnd29mZicsICd3b2ZmMicsICdlb2YnLCAnb3RmJywgJ3N2ZyddO1xuZXhwb3J0IGZ1bmN0aW9uIGNvbnZlcnQoc3RyOiBzdHJpbmcpIHtcbiAgY29uc3QgYnVmID0gaWNvbnYuZW5jb2RlKHN0ciwgJ3V0ZjgnKTtcbiAgcmV0dXJuIGljb252LmRlY29kZShidWYsICdHQjIzMTInKTtcbn1cblxuLyoqXG4gKiBjbGlwIGFuZCBtaW5pbWl6ZSBmb250IGZpbGUgdG8gb25seSBjb250YWluIHNwZWNpZmljIGNoYXJhY3RlciBzdWJzZXQgYW5kIGNudmVydG8gd29mZjJcbiAqIEBwYXJhbSBzb3VyY2Ugc291cmNlIGZpbGVcbiAqIEBwYXJhbSBjbGlwQ2hhcnMgc3Vic2V0XG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBjbGlwVG9Xb2ZmMihzb3VyY2U6IHN0cmluZywgZGVzdERpcjogc3RyaW5nLCB0b0Zvcm1hdHM6IENyZWF0ZU9wdFsndHlwZSddW10gPSBbJ3dvZmYyJ10sIGNsaXBDaGFycz86IHN0cmluZyB8IG51bGwpIHtcbiAgaWYgKCFzb3VyY2UpIHtcbiAgICBzb3VyY2UgPSBQYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi4vZXhhbXBsZS1mb250L1BpbmdGYW5nIFJlZ3VsYXIudHRmJyk7XG4gIH1cbiAgY29uc3Qgc3JjVHlwZSA9IFBhdGguZXh0bmFtZShzb3VyY2UpLnNsaWNlKDEpIGFzIENyZWF0ZU9wdFsndHlwZSddO1xuXG4gIGlmICghVFlQRVMuaW5jbHVkZXMoc3JjVHlwZSkpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYFNvdXJjZSBmaWxlIHN1ZmZpeCBtdXN0IGJlIG9uZSBvZiAke1RZUEVTLmpvaW4oJywgJyl9YCk7XG4gIH1cblxuICBjb25zdCBmb250ID0gRm9udC5jcmVhdGUoKGF3YWl0IHJlYWRGaWxlQXN5bmMoc291cmNlKSksIHtcbiAgICB0eXBlOiBzcmNUeXBlLFxuICAgIHN1YnNldDogY2xpcENoYXJzID8gY2xpcENoYXJzLnNwbGl0KCcnKS5tYXAoYyA9PiBjLmNoYXJDb2RlQXQoMCkpIDogdW5kZWZpbmVkLFxuICAgIGhpbnRpbmc6IHRydWUsXG4gICAgY29tcG91bmQyc2ltcGxlOiB0cnVlXG4gIH0pO1xuICAvLyBmb250Lm9wdGltaXplKCk7XG4gIC8vIGZvbnQuY29tcG91bmQyc2ltcGxlKCk7XG4gIGlmICh0b0Zvcm1hdHMuaW5jbHVkZXMoJ3dvZmYyJykpXG4gICAgYXdhaXQgd29mZjIuaW5pdCgpO1xuXG4gIGZzLm1rZGlycFN5bmMoZGVzdERpcik7XG4gIHJldHVybiBQcm9taXNlLmFsbCh0b0Zvcm1hdHMubWFwKGZvcm1hdCA9PiB7XG4gICAgY29uc3QgZmlsZSA9IFBhdGgucmVzb2x2ZShkZXN0RGlyLCBQYXRoLmJhc2VuYW1lKHNvdXJjZSwgUGF0aC5leHRuYW1lKHNvdXJjZSkpICsgJy4nICsgZm9ybWF0KTtcbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICBjb25zb2xlLmxvZygnW2ZvbnQtY2xpcF0gd3JpdGUnLCBmaWxlKTtcbiAgICByZXR1cm4gd3JpdGVGaWxlQXN5bmMoZmlsZSxcbiAgICAgIGZvbnQud3JpdGUoe1xuICAgICAgdHlwZTogZm9ybWF0LFxuICAgICAgaGludGluZzogdHJ1ZVxuICAgIH0pKTtcbiAgfSkpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZXhhbXBsZShzdWJzZXQ/OiBzdHJpbmcpIHtcbiAgcmV0dXJuIFByb21pc2UuYWxsKFtcbiAgICBQYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi4vZXhhbXBsZS1mb250L1BpbmdGYW5nIFJlZ3VsYXIudHRmJyksXG4gICAgUGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4uL2V4YW1wbGUtZm9udC9QaW5nRmFuZyBNZWRpdW0udHRmJyksXG4gICAgUGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4uL2V4YW1wbGUtZm9udC9QaW5nRmFuZyBCb2xkLnR0ZicpXG4gIF0ubWFwKHNyYyA9PiBjbGlwVG9Xb2ZmMihzcmMsIFBhdGgucmVzb2x2ZShQYXRoLmRpcm5hbWUoc3JjKSwgJ2dlbicpLCBbJ3dvZmYnLCd3b2ZmMiddLCBzdWJzZXQpKSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBub3RvU2FucyhzdWJzZXQ/OiBzdHJpbmcpIHtcbiAgcmV0dXJuIFByb21pc2UuYWxsKFtcbiAgICBQYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi4vZXhhbXBsZS1mb250L05vdG9TYW5zU0MtQmxhY2sub3RmJyksXG4gICAgUGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4uL2V4YW1wbGUtZm9udC9Ob3RvU2Fuc1NDLUJvbGQub3RmJyksXG4gICAgUGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4uL2V4YW1wbGUtZm9udC9Ob3RvU2Fuc1NDLUxpZ2h0Lm90ZicpLFxuICAgIFBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuLi9leGFtcGxlLWZvbnQvTm90b1NhbnNTQy1NZWRpdW0ub3RmJyksXG4gICAgUGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4uL2V4YW1wbGUtZm9udC9Ob3RvU2Fuc1NDLVJlZ3VsYXIub3RmJyksXG4gICAgUGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4uL2V4YW1wbGUtZm9udC9Ob3RvU2Fuc1NDLVRoaW4ub3RmJylcbiAgXS5tYXAoc3JjID0+IGNsaXBUb1dvZmYyKHNyYywgUGF0aC5yZXNvbHZlKFBhdGguZGlybmFtZShzcmMpLCAnZ2VuJyksIFsnd29mZicsJ3dvZmYyJ10sIHN1YnNldCkpKTtcbn1cblxuLyoqXG4gKiBodHRwczovL3d3dy5xcXhpdXppLmNuL3poL2hhbnppLXVuaWNvZGUtYmlhbm1hLnBocFxuICogQHBhcmFtIGNvZGUgXG4gKi9cbi8vIGZ1bmN0aW9uIGlzQ2hpbmVzZUNoYXJDb2RlKGNvZGU6IG51bWJlcikge1xuLy8gICByZXR1cm4gY29kZSA+PSAweDRFMDAgJiYgY29kZSA8PSAweDlGRUYgfHwgY29kZSA+PSAweDM0MDAgJiYgY29kZSA8PSAweDREQjU7XG4vLyB9XG4iXX0=
