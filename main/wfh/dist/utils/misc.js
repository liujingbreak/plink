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
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.closestCommonParentDir = exports.getRootDir = exports.getTsDirsOfPackage = exports.boxString = exports.WordLexer = exports.WordTokenType = exports.isDrcpSymlink = void 0;
const base_LLn_parser_1 = require("../base-LLn-parser");
const trim_1 = __importDefault(require("lodash/trim"));
const get_1 = __importDefault(require("lodash/get"));
const Path = __importStar(require("path"));
const { isDrcpSymlink, rootDir } = JSON.parse(process.env.__plink);
exports.isDrcpSymlink = isDrcpSymlink;
var WordTokenType;
(function (WordTokenType) {
    WordTokenType[WordTokenType["eol"] = 0] = "eol";
    WordTokenType[WordTokenType["word"] = 1] = "word";
    WordTokenType[WordTokenType["tab"] = 2] = "tab";
    WordTokenType[WordTokenType["eos"] = 3] = "eos";
    WordTokenType[WordTokenType["other"] = 4] = "other";
})(WordTokenType = exports.WordTokenType || (exports.WordTokenType = {}));
class WordLexer extends base_LLn_parser_1.BaseLexer {
    *[Symbol.iterator]() {
        while (this.la() != null) {
            const start = this.position;
            switch (this.la()) {
                case '\n':
                    this.advance();
                    if (this.la() === '\r')
                        this.advance();
                    yield new base_LLn_parser_1.Token(WordTokenType.eol, this, start);
                    break;
                case '\t':
                    this.advance();
                    yield new base_LLn_parser_1.Token(WordTokenType.tab, this, start);
                    break;
                default:
                    const first = this.la();
                    if (/[a-zA-Z$_]/.test(first)) {
                        this.advance();
                        while (this.la() != null && /[a-zA-Z$_0-9]/.test(this.la())) {
                            this.advance();
                        }
                        if (/-/.test(this.la()))
                            this.advance();
                        yield new base_LLn_parser_1.Token(WordTokenType.word, this, start);
                        break;
                    }
                    if (/[0-9]/.test(this.la())) {
                        this.consumeNumbers();
                        yield new base_LLn_parser_1.Token(WordTokenType.word, this, start);
                        break;
                    }
                    if (first === '-' && this.la(2) && /[0-9]/.test(this.la(2))) {
                        this.advance();
                        this.consumeNumbers();
                        yield new base_LLn_parser_1.Token(WordTokenType.word, this, start);
                        break;
                    }
                    if (/[,.]/.test(first)) {
                        this.advance();
                        yield new base_LLn_parser_1.Token(WordTokenType.eos, this, start);
                        break;
                    }
                    this.advance();
                    yield new base_LLn_parser_1.Token(WordTokenType.other, this, start);
            }
        }
    }
    consumeNumbers() {
        // if (/[0-9]/.test(this.la())) {
        this.advance();
        while (this.la() != null && /[0-9.]/.test(this.la())) {
            this.advance();
        }
        // }
    }
}
exports.WordLexer = WordLexer;
function boxString(text, lineWidth = 60, whitespaceWrap = true) {
    const lexer = new WordLexer(text);
    lineWidth = lineWidth - 4;
    let updated = `+${'-'.repeat(lineWidth + 2)}+\n`;
    let column = 0;
    for (const word of lexer) {
        if (word.type === WordTokenType.word || word.type === WordTokenType.eos || word.type === WordTokenType.other ||
            word.type === WordTokenType.tab) {
            if (column === 0) {
                updated += '| ';
            }
            if (column + word.text.length > lineWidth) {
                updated += ' '.repeat(lineWidth - column);
                updated += ' |\n| ';
                // pad
                column = 0;
            }
            updated += word.type === WordTokenType.tab ? '  ' : word.text;
            column += word.type === WordTokenType.tab ? 2 : word.text.length;
        }
        else if (word.type === WordTokenType.eol) {
            if (column === 0) {
                updated += '| ';
            }
            updated += ' '.repeat(lineWidth - column);
            updated += ' |\n';
            column = 0;
        }
    }
    if (column !== 0) {
        updated += ' '.repeat(lineWidth - column);
        updated += ' |\n';
    }
    updated += `+${'-'.repeat(lineWidth + 2)}+`;
    return updated.replace(/^(?=.)/mg, '  ');
}
exports.boxString = boxString;
function getTsDirsOfPackage(json) {
    let srcDir = get_1.default(json, 'dr.ts.src', 'ts');
    let destDir = get_1.default(json, 'dr.ts.dest', 'dist');
    let isomDir = get_1.default(json, 'dr.ts.isom', 'isom');
    destDir = trim_1.default(trim_1.default(destDir, '\\'), '/');
    srcDir = trim_1.default(trim_1.default(srcDir, '/'), '\\');
    isomDir = trim_1.default(trim_1.default(isomDir, '/'), '\\');
    return {
        srcDir, destDir, isomDir
    };
}
exports.getTsDirsOfPackage = getTsDirsOfPackage;
exports.getRootDir = () => rootDir;
function closestCommonParentDir(paths) {
    let commonDir;
    for (const realPath of paths) {
        if (commonDir == null) {
            commonDir = realPath.split(Path.sep);
            continue;
        }
        const dir = realPath.split(Path.sep);
        // Find the closest common parent directory, use it as rootDir
        for (let i = 0, l = commonDir.length; i < l; i++) {
            if (i >= dir.length || commonDir[i] !== dir[i]) {
                commonDir = commonDir.slice(0, i);
                break;
            }
        }
    }
    return commonDir ? commonDir.join(Path.sep) : process.cwd();
}
exports.closestCommonParentDir = closestCommonParentDir;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWlzYy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3RzL3V0aWxzL21pc2MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLHdEQUFzRDtBQUN0RCx1REFBK0I7QUFDL0IscURBQTZCO0FBRTdCLDJDQUE2QjtBQUk3QixNQUFNLEVBQUMsYUFBYSxFQUFFLE9BQU8sRUFBQyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxPQUFRLENBQWEsQ0FBQztBQUV0RSxzQ0FBYTtBQUVyQixJQUFZLGFBTVg7QUFORCxXQUFZLGFBQWE7SUFDdkIsK0NBQU8sQ0FBQTtJQUNQLGlEQUFJLENBQUE7SUFDSiwrQ0FBRyxDQUFBO0lBQ0gsK0NBQUcsQ0FBQTtJQUNILG1EQUFLLENBQUE7QUFDUCxDQUFDLEVBTlcsYUFBYSxHQUFiLHFCQUFhLEtBQWIscUJBQWEsUUFNeEI7QUFFRCxNQUFhLFNBQVUsU0FBUSwyQkFBd0I7SUFDckQsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUM7UUFDaEIsT0FBTyxJQUFJLENBQUMsRUFBRSxFQUFFLElBQUksSUFBSSxFQUFFO1lBQ3hCLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUM7WUFDNUIsUUFBUSxJQUFJLENBQUMsRUFBRSxFQUFFLEVBQUU7Z0JBQ2pCLEtBQUssSUFBSTtvQkFDUCxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7b0JBQ2YsSUFBSSxJQUFJLENBQUMsRUFBRSxFQUFFLEtBQUssSUFBSTt3QkFDcEIsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO29CQUNqQixNQUFNLElBQUksdUJBQUssQ0FBQyxhQUFhLENBQUMsR0FBRyxFQUFFLElBQUksRUFBRSxLQUFLLENBQUMsQ0FBQztvQkFDaEQsTUFBTTtnQkFDUixLQUFLLElBQUk7b0JBQ1AsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO29CQUNmLE1BQU0s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LElBQUksS0FBSyxFQUFFO1FBQzVCLElBQUksU0FBUyxJQUFJLElBQUksRUFBRTtZQUNyQixTQUFTLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDckMsU0FBUztTQUNWO1FBQ0QsTUFBTSxHQUFHLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDckMsOERBQThEO1FBQzlELEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxTQUFTLENBQUMsTUFBTSxFQUFFLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUU7WUFDaEQsSUFBSSxDQUFDLElBQUksR0FBRyxDQUFDLE1BQU0sSUFBSSxTQUFTLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFO2dCQUM5QyxTQUFTLEdBQUcsU0FBUyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7Z0JBQ2xDLE1BQU07YUFDUDtTQUNGO0tBQ0Y7SUFDRCxPQUFPLFNBQVMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsQ0FBQztBQUM5RCxDQUFDO0FBbEJELHdEQWtCQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IEJhc2VMZXhlciwgVG9rZW4gfSBmcm9tICcuLi9iYXNlLUxMbi1wYXJzZXInO1xuaW1wb3J0IHRyaW0gZnJvbSAnbG9kYXNoL3RyaW0nO1xuaW1wb3J0IGdldCBmcm9tICdsb2Rhc2gvZ2V0JztcbmltcG9ydCBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQgKiBhcyBQYXRoIGZyb20gJ3BhdGgnO1xuLy8gaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xuaW1wb3J0IHR5cGUge1BsaW5rRW52fSBmcm9tICcuLi9ub2RlLXBhdGgnO1xuXG5jb25zdCB7aXNEcmNwU3ltbGluaywgcm9vdERpcn0gPSBKU09OLnBhcnNlKHByb2Nlc3MuZW52Ll9fcGxpbmshKSBhcyBQbGlua0VudjtcblxuZXhwb3J0IHtpc0RyY3BTeW1saW5rfTtcblxuZXhwb3J0IGVudW0gV29yZFRva2VuVHlwZSB7XG4gIGVvbCA9IDAsXG4gIHdvcmQsXG4gIHRhYixcbiAgZW9zLCAvLyBlbmQgb2Ygc2VudGVuY2VcbiAgb3RoZXJcbn1cblxuZXhwb3J0IGNsYXNzIFdvcmRMZXhlciBleHRlbmRzIEJhc2VMZXhlcjxXb3JkVG9rZW5UeXBlPiB7XG4gICpbU3ltYm9sLml0ZXJhdG9yXSgpOiBJdGVyYXRvcjxUb2tlbjxXb3JkVG9rZW5UeXBlPj4ge1xuICAgIHdoaWxlICh0aGlzLmxhKCkgIT0gbnVsbCkge1xuICAgICAgY29uc3Qgc3RhcnQgPSB0aGlzLnBvc2l0aW9uO1xuICAgICAgc3dpdGNoICh0aGlzLmxhKCkpIHtcbiAgICAgICAgY2FzZSAnXFxuJzpcbiAgICAgICAgICB0aGlzLmFkdmFuY2UoKTtcbiAgICAgICAgICBpZiAodGhpcy5sYSgpID09PSAnXFxyJylcbiAgICAgICAgICAgIHRoaXMuYWR2YW5jZSgpO1xuICAgICAgICAgIHlpZWxkIG5ldyBUb2tlbihXb3JkVG9rZW5UeXBlLmVvbCwgdGhpcywgc3RhcnQpO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlICdcXHQnOlxuICAgICAgICAgIHRoaXMuYWR2YW5jZSgpO1xuICAgICAgICAgIHlpZWxkIG5ldyBUb2tlbihXb3JkVG9rZW5UeXBlLnRhYiwgdGhpcywgc3RhcnQpO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgIGNvbnN0IGZpcnN0ID0gdGhpcy5sYSgpITtcbiAgICAgICAgICBpZiAoL1thLXpBLVokX10vLnRlc3QoZmlyc3QpKSB7XG4gICAgICAgICAgICB0aGlzLmFkdmFuY2UoKTtcbiAgICAgICAgICAgIHdoaWxlKHRoaXMubGEoKSAhPSBudWxsICYmIC9bYS16QS1aJF8wLTldLy50ZXN0KHRoaXMubGEoKSEpKSB7XG4gICAgICAgICAgICAgIHRoaXMuYWR2YW5jZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKC8tLy50ZXN0KHRoaXMubGEoKSEpKVxuICAgICAgICAgICAgICB0aGlzLmFkdmFuY2UoKTtcbiAgICAgICAgICAgIHlpZWxkIG5ldyBUb2tlbihXb3JkVG9rZW5UeXBlLndvcmQsIHRoaXMsIHN0YXJ0KTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoL1swLTldLy50ZXN0KHRoaXMubGEoKSEpKSB7XG4gICAgICAgICAgICB0aGlzLmNvbnN1bWVOdW1iZXJzKCk7XG4gICAgICAgICAgICB5aWVsZCBuZXcgVG9rZW4oV29yZFRva2VuVHlwZS53b3JkLCB0aGlzLCBzdGFydCk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKGZpcnN0ID09PSAnLScgJiYgdGhpcy5sYSgyKSAmJiAvWzAtOV0vLnRlc3QodGhpcy5sYSgyKSEpKSB7XG4gICAgICAgICAgICB0aGlzLmFkdmFuY2UoKTtcbiAgICAgICAgICAgIHRoaXMuY29uc3VtZU51bWJlcnMoKTtcbiAgICAgICAgICAgIHlpZWxkIG5ldyBUb2tlbihXb3JkVG9rZW5UeXBlLndvcmQsIHRoaXMsIHN0YXJ0KTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoL1ssLl0vLnRlc3QoZmlyc3QpKSB7XG4gICAgICAgICAgICB0aGlzLmFkdmFuY2UoKTtcbiAgICAgICAgICAgIHlpZWxkIG5ldyBUb2tlbihXb3JkVG9rZW5UeXBlLmVvcywgdGhpcywgc3RhcnQpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgfVxuICAgICAgICAgIHRoaXMuYWR2YW5jZSgpO1xuICAgICAgICAgIHlpZWxkIG5ldyBUb2tlbihXb3JkVG9rZW5UeXBlLm90aGVyLCB0aGlzLCBzdGFydCk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgY29uc3VtZU51bWJlcnMoKSB7XG4gICAgLy8gaWYgKC9bMC05XS8udGVzdCh0aGlzLmxhKCkpKSB7XG4gICAgdGhpcy5hZHZhbmNlKCk7XG4gICAgd2hpbGUodGhpcy5sYSgpICE9IG51bGwgJiYgL1swLTkuXS8udGVzdCh0aGlzLmxhKCkhKSkge1xuICAgICAgdGhpcy5hZHZhbmNlKCk7XG4gICAgfVxuICAgIC8vIH1cbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gYm94U3RyaW5nKHRleHQ6IHN0cmluZywgbGluZVdpZHRoID0gNjAsIHdoaXRlc3BhY2VXcmFwID0gdHJ1ZSk6IHN0cmluZyB7XG4gIGNvbnN0IGxleGVyID0gbmV3IFdvcmRMZXhlcih0ZXh0KTtcblxuICBsaW5lV2lkdGggPSBsaW5lV2lkdGggLSA0O1xuICBsZXQgdXBkYXRlZCA9IGArJHsnLScucmVwZWF0KGxpbmVXaWR0aCArIDIpfStcXG5gO1xuICBsZXQgY29sdW1uID0gMDtcbiAgZm9yIChjb25zdCB3b3JkIG9mIGxleGVyKSB7XG4gICAgaWYgKHdvcmQudHlwZSA9PT0gV29yZFRva2VuVHlwZS53b3JkIHx8IHdvcmQudHlwZSA9PT0gV29yZFRva2VuVHlwZS5lb3MgfHwgd29yZC50eXBlID09PSBXb3JkVG9rZW5UeXBlLm90aGVyIHx8XG4gICAgICB3b3JkLnR5cGUgPT09IFdvcmRUb2tlblR5cGUudGFiKSB7XG4gICAgICBpZiAoY29sdW1uID09PSAwKSB7XG4gICAgICAgIHVwZGF0ZWQgKz0gJ3wgJztcbiAgICAgIH1cbiAgICAgIGlmIChjb2x1bW4gKyB3b3JkLnRleHQubGVuZ3RoID4gbGluZVdpZHRoKSB7XG4gICAgICAgIHVwZGF0ZWQgKz0gJyAnLnJlcGVhdChsaW5lV2lkdGggLSBjb2x1bW4pO1xuICAgICAgICB1cGRhdGVkICs9ICcgfFxcbnwgJztcbiAgICAgICAgLy8gcGFkXG4gICAgICAgIGNvbHVtbiA9IDA7XG4gICAgICB9XG4gICAgICB1cGRhdGVkICs9IHdvcmQudHlwZSA9PT0gV29yZFRva2VuVHlwZS50YWIgPyAnICAnIDogd29yZC50ZXh0O1xuICAgICAgY29sdW1uICs9IHdvcmQudHlwZSA9PT0gV29yZFRva2VuVHlwZS50YWIgPyAyIDogd29yZC50ZXh0Lmxlbmd0aDtcbiAgICB9IGVsc2UgaWYgKHdvcmQudHlwZSA9PT0gV29yZFRva2VuVHlwZS5lb2wpIHtcbiAgICAgIGlmIChjb2x1bW4gPT09IDApIHtcbiAgICAgICAgdXBkYXRlZCArPSAnfCAnO1xuICAgICAgfVxuICAgICAgdXBkYXRlZCArPSAnICcucmVwZWF0KGxpbmVXaWR0aCAtIGNvbHVtbik7XG4gICAgICB1cGRhdGVkICs9ICcgfFxcbic7XG4gICAgICBjb2x1bW4gPSAwO1xuICAgIH1cbiAgfVxuICBpZiAoY29sdW1uICE9PSAwKSB7XG4gICAgdXBkYXRlZCArPSAnICcucmVwZWF0KGxpbmVXaWR0aCAtIGNvbHVtbik7XG4gICAgdXBkYXRlZCArPSAnIHxcXG4nO1xuICB9XG4gIHVwZGF0ZWQgKz0gYCskeyctJy5yZXBlYXQobGluZVdpZHRoICsgMil9K2A7XG4gIHJldHVybiB1cGRhdGVkLnJlcGxhY2UoL14oPz0uKS9tZywgJyAgJyk7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgUGFja2FnZVRzRGlycyB7XG4gIHNyY0Rpcjogc3RyaW5nO1xuICBkZXN0RGlyOiBzdHJpbmc7XG4gIGlzb21EaXI6IHN0cmluZztcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldFRzRGlyc09mUGFja2FnZShqc29uOiBhbnkpOiBQYWNrYWdlVHNEaXJzIHtcbiAgbGV0IHNyY0RpciA9IGdldChqc29uLCAnZHIudHMuc3JjJywgJ3RzJyk7XG4gIGxldCBkZXN0RGlyID0gZ2V0KGpzb24sICdkci50cy5kZXN0JywgJ2Rpc3QnKTtcbiAgbGV0IGlzb21EaXIgPSBnZXQoanNvbiwgJ2RyLnRzLmlzb20nLCAnaXNvbScpO1xuXG4gIGRlc3REaXIgPSB0cmltKHRyaW0oZGVzdERpciwgJ1xcXFwnKSwgJy8nKTtcbiAgc3JjRGlyID0gdHJpbSh0cmltKHNyY0RpciwgJy8nKSwgJ1xcXFwnKTtcbiAgaXNvbURpciA9IHRyaW0odHJpbShpc29tRGlyLCAnLycpLCAnXFxcXCcpO1xuICByZXR1cm4ge1xuICAgIHNyY0RpciwgZGVzdERpciwgaXNvbURpclxuICB9O1xufVxuXG5leHBvcnQgY29uc3QgZ2V0Um9vdERpciA9ICgpID0+IHJvb3REaXI7XG5cbmV4cG9ydCBmdW5jdGlvbiBjbG9zZXN0Q29tbW9uUGFyZW50RGlyKHBhdGhzOiBJdGVyYWJsZTxzdHJpbmc+KSB7XG4gIGxldCBjb21tb25EaXI6IHN0cmluZ1tdIHwgdW5kZWZpbmVkO1xuXG4gIGZvciAoY29uc3QgcmVhbFBhdGggb2YgcGF0aHMpIHtcbiAgICBpZiAoY29tbW9uRGlyID09IG51bGwpIHtcbiAgICAgIGNvbW1vbkRpciA9IHJlYWxQYXRoLnNwbGl0KFBhdGguc2VwKTtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cbiAgICBjb25zdCBkaXIgPSByZWFsUGF0aC5zcGxpdChQYXRoLnNlcCk7XG4gICAgLy8gRmluZCB0aGUgY2xvc2VzdCBjb21tb24gcGFyZW50IGRpcmVjdG9yeSwgdXNlIGl0IGFzIHJvb3REaXJcbiAgICBmb3IgKGxldCBpID0gMCwgbCA9IGNvbW1vbkRpci5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgIGlmIChpID49IGRpci5sZW5ndGggfHwgY29tbW9uRGlyW2ldICE9PSBkaXJbaV0pIHtcbiAgICAgICAgY29tbW9uRGlyID0gY29tbW9uRGlyLnNsaWNlKDAsIGkpO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgcmV0dXJuIGNvbW1vbkRpciA/IGNvbW1vbkRpci5qb2luKFBhdGguc2VwKSA6IHByb2Nlc3MuY3dkKCk7XG59XG4iXX0=