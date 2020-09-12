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
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
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

//# sourceMappingURL=font-clip.js.map
