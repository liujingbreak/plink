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
const fs_1 = __importDefault(require("fs"));
const fs_extra_1 = require("fs-extra");
const path_1 = __importDefault(require("path"));
// import util from 'util';
const cliExt = (program) => {
    const mdCli = program.command('markdown <file>')
        .description('Show markdown topics', { file: 'source markdown file' })
        .option('-i, --insert', 'Insert or update table of content in markdown file')
        .option('-o,--out <output html>', 'Output to html file')
        .action((file) => __awaiter(void 0, void 0, void 0, function* () {
        const { markdownToHtml, tocToString, insertOrUpdateMarkdownToc } = require('../markdown-util');
        const input = fs_1.default.readFileSync(path_1.default.resolve(file), 'utf8');
        if (mdCli.opts().insert) {
            const { changedMd, toc, html } = yield insertOrUpdateMarkdownToc(input);
            // eslint-disable-next-line no-console
            console.log('Table of content:\n' + toc);
            fs_1.default.writeFileSync(file, changedMd);
            if (mdCli.opts().out) {
                const target = path_1.default.resolve(mdCli.opts().out);
                fs_extra_1.mkdirpSync(path_1.default.dirname(target));
                fs_1.default.writeFileSync(target, html);
                // eslint-disable-next-line no-console
                console.log('Output HTML to file:', target);
            }
        }
        else {
            const { toc, content } = yield markdownToHtml(input).toPromise();
            // eslint-disable-next-line no-console
            console.log('Table of content:\n' + tocToString(toc));
            if (mdCli.opts().out) {
                const target = path_1.default.resolve(mdCli.opts().out);
                fs_extra_1.mkdirpSync(path_1.default.dirname(target));
                fs_1.default.writeFileSync(target, content);
                // eslint-disable-next-line no-console
                console.log('Output HTML to file:', target);
            }
        }
    }));
    program.command('color-info <color-string...>')
        .description('Show color information', { 'color-string': 'In form of CSS color string' })
        .action(function (colors) {
        return __awaiter(this, void 0, void 0, function* () {
            for (const info of (yield Promise.resolve().then(() => __importStar(require('../color')))).colorInfo(colors)) {
                // eslint-disable-next-line no-console
                console.log(info);
            }
        });
    });
    program.command('color-contrast <color-string1> <color-string2>')
        .description('Show color contrast information', { 'color-string1': 'In form of CSS color string' })
        .action(function (...colors) {
        return __awaiter(this, void 0, void 0, function* () {
            (yield Promise.resolve().then(() => __importStar(require('../color')))).colorContrast(...colors);
        });
    });
    program.command('color-mix <color1> <color2> [weight-interval]')
        .description('compare 2 colors', {
        color1: 'In form of CSS color string',
        color2: 'In form of CSS color string',
        'weight-interval': 'weight of color to be mixed, should be number between 0 - 1'
    })
        .action((color1, color2, weightInterval) => __awaiter(void 0, void 0, void 0, function* () {
        if (weightInterval == null) {
            weightInterval = '0.1';
        }
        (yield Promise.resolve().then(() => __importStar(require('../color')))).mixColor(color1, color2, Number(weightInterval));
    }));
    // TODO: Add more sub command here
};
exports.default = cliExt;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY2xpLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUVBLDRDQUFvQjtBQUNwQix1Q0FBb0M7QUFDcEMsZ0RBQXdCO0FBQ3hCLDJCQUEyQjtBQUUzQixNQUFNLE1BQU0sR0FBaUIsQ0FBQyxPQUFPLEVBQUUsRUFBRTtJQUN2QyxNQUFNLEtBQUssR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLGlCQUFpQixDQUFDO1NBQy9DLFdBQVcsQ0FBQyxzQkFBc0IsRUFBRSxFQUFDLElBQUksRUFBRSxzQkFBc0IsRUFBQyxDQUFDO1NBQ25FLE1BQU0sQ0FBQyxjQUFjLEVBQUUsb0RBQW9ELENBQUM7U0FDNUUsTUFBTSxDQUFDLHdCQUF3QixFQUFFLHFCQUFxQixDQUFDO1NBQ3ZELE1BQU0sQ0FBQyxDQUFPLElBQUksRUFBRSxFQUFFO1FBQ3JCLE1BQU0sRUFBQyxjQUFjLEVBQUUsV0FBVyxFQUFFLHlCQUF5QixFQUFDLEdBQUcsT0FBTyxDQUFDLGtCQUFrQixDQUF3QixDQUFDO1FBQ3BILE1BQU0sS0FBSyxHQUFHLFlBQUUsQ0FBQyxZQUFZLENBQUMsY0FBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQztRQUMxRCxJQUFJLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQyxNQUFNLEVBQUU7WUFDdkIsTUFBTSxFQUFDLFNBQVMsRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFDLEdBQUcsTUFBTSx5QkFBeUIsQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUN0RSxzQ0FBc0M7WUFDdEMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsR0FBRyxHQUFHLENBQUMsQ0FBQztZQUN6QyxZQUFFLENBQUMsYUFBYSxDQUFDLElBQUksRUFBRSxTQUFTLENBQUMsQ0FBQztZQUNsQyxJQUFJLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQyxHQUFH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aW5rL3dmaC9kaXN0JztcbmltcG9ydCAqIGFzIG1hcmtkb3duVXRpbCBmcm9tICcuLi9tYXJrZG93bi11dGlsJztcbmltcG9ydCBmcyBmcm9tICdmcyc7XG5pbXBvcnQge21rZGlycFN5bmN9IGZyb20gJ2ZzLWV4dHJhJztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuLy8gaW1wb3J0IHV0aWwgZnJvbSAndXRpbCc7XG5cbmNvbnN0IGNsaUV4dDogQ2xpRXh0ZW5zaW9uID0gKHByb2dyYW0pID0+IHtcbiAgY29uc3QgbWRDbGkgPSBwcm9ncmFtLmNvbW1hbmQoJ21hcmtkb3duIDxmaWxlPicpXG4gIC5kZXNjcmlwdGlvbignU2hvdyBtYXJrZG93biB0b3BpY3MnLCB7ZmlsZTogJ3NvdXJjZSBtYXJrZG93biBmaWxlJ30pXG4gIC5vcHRpb24oJy1pLCAtLWluc2VydCcsICdJbnNlcnQgb3IgdXBkYXRlIHRhYmxlIG9mIGNvbnRlbnQgaW4gbWFya2Rvd24gZmlsZScpXG4gIC5vcHRpb24oJy1vLC0tb3V0IDxvdXRwdXQgaHRtbD4nLCAnT3V0cHV0IHRvIGh0bWwgZmlsZScpXG4gIC5hY3Rpb24oYXN5bmMgKGZpbGUpID0+IHtcbiAgICBjb25zdCB7bWFya2Rvd25Ub0h0bWwsIHRvY1RvU3RyaW5nLCBpbnNlcnRPclVwZGF0ZU1hcmtkb3duVG9jfSA9IHJlcXVpcmUoJy4uL21hcmtkb3duLXV0aWwnKSBhcyB0eXBlb2YgbWFya2Rvd25VdGlsO1xuICAgIGNvbnN0IGlucHV0ID0gZnMucmVhZEZpbGVTeW5jKFBhdGgucmVzb2x2ZShmaWxlKSwgJ3V0ZjgnKTtcbiAgICBpZiAobWRDbGkub3B0cygpLmluc2VydCkge1xuICAgICAgY29uc3Qge2NoYW5nZWRNZCwgdG9jLCBodG1sfSA9IGF3YWl0IGluc2VydE9yVXBkYXRlTWFya2Rvd25Ub2MoaW5wdXQpO1xuICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICAgIGNvbnNvbGUubG9nKCdUYWJsZSBvZiBjb250ZW50OlxcbicgKyB0b2MpO1xuICAgICAgZnMud3JpdGVGaWxlU3luYyhmaWxlLCBjaGFuZ2VkTWQpO1xuICAgICAgaWYgKG1kQ2xpLm9wdHMoKS5vdXQpIHtcbiAgICAgICAgY29uc3QgdGFyZ2V0ID0gUGF0aC5yZXNvbHZlKG1kQ2xpLm9wdHMoKS5vdXQpO1xuICAgICAgICBta2RpcnBTeW5jKFBhdGguZGlybmFtZSh0YXJnZXQpKTtcbiAgICAgICAgZnMud3JpdGVGaWxlU3luYyh0YXJnZXQsIGh0bWwpO1xuICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgICAgICBjb25zb2xlLmxvZygnT3V0cHV0IEhUTUwgdG8gZmlsZTonLCB0YXJnZXQpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCB7dG9jLCBjb250ZW50fSA9IGF3YWl0IG1hcmtkb3duVG9IdG1sKGlucHV0KS50b1Byb21pc2UoKTtcbiAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgICBjb25zb2xlLmxvZygnVGFibGUgb2YgY29udGVudDpcXG4nICsgdG9jVG9TdHJpbmcodG9jKSk7XG4gICAgICBpZiAobWRDbGkub3B0cygpLm91dCkge1xuICAgICAgICBjb25zdCB0YXJnZXQgPSBQYXRoLnJlc29sdmUobWRDbGkub3B0cygpLm91dCk7XG4gICAgICAgIG1rZGlycFN5bmMoUGF0aC5kaXJuYW1lKHRhcmdldCkpO1xuICAgICAgICBmcy53cml0ZUZpbGVTeW5jKHRhcmdldCwgY29udGVudCk7XG4gICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgICAgIGNvbnNvbGUubG9nKCdPdXRwdXQgSFRNTCB0byBmaWxlOicsIHRhcmdldCk7XG4gICAgICB9XG4gICAgfVxuICB9KTtcblxuICBwcm9ncmFtLmNvbW1hbmQoJ2NvbG9yLWluZm8gPGNvbG9yLXN0cmluZy4uLj4nKVxuICAuZGVzY3JpcHRpb24oJ1Nob3cgY29sb3IgaW5mb3JtYXRpb24nLCB7J2NvbG9yLXN0cmluZyc6ICdJbiBmb3JtIG9mIENTUyBjb2xvciBzdHJpbmcnfSlcbiAgLmFjdGlvbihhc3luYyBmdW5jdGlvbihjb2xvcnM6IHN0cmluZ1tdKSB7XG4gICAgZm9yIChjb25zdCBpbmZvIG9mIChhd2FpdCBpbXBvcnQoJy4uL2NvbG9yJykpLmNvbG9ySW5mbyhjb2xvcnMpKSB7XG4gICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgICAgY29uc29sZS5sb2coaW5mbyk7XG4gICAgfVxuICB9KTtcblxuICBwcm9ncmFtLmNvbW1hbmQoJ2NvbG9yLWNvbnRyYXN0IDxjb2xvci1zdHJpbmcxPiA8Y29sb3Itc3RyaW5nMj4nKVxuICAuZGVzY3JpcHRpb24oJ1Nob3cgY29sb3IgY29udHJhc3QgaW5mb3JtYXRpb24nLCB7J2NvbG9yLXN0cmluZzEnOiAnSW4gZm9ybSBvZiBDU1MgY29sb3Igc3RyaW5nJ30pXG4gIC5hY3Rpb24oYXN5bmMgZnVuY3Rpb24oLi4uY29sb3JzOiBzdHJpbmdbXSkge1xuICAgIChhd2FpdCBpbXBvcnQoJy4uL2NvbG9yJykpLmNvbG9yQ29udHJhc3QoLi4uY29sb3JzIGFzIFtzdHJpbmcsIHN0cmluZ10pO1xuICB9KTtcblxuICBwcm9ncmFtLmNvbW1hbmQoJ2NvbG9yLW1peCA8Y29sb3IxPiA8Y29sb3IyPiBbd2VpZ2h0LWludGVydmFsXScpXG4gIC5kZXNjcmlwdGlvbignY29tcGFyZSAyIGNvbG9ycycsIHtcbiAgICBjb2xvcjE6ICdJbiBmb3JtIG9mIENTUyBjb2xvciBzdHJpbmcnLFxuICAgIGNvbG9yMjogJ0luIGZvcm0gb2YgQ1NTIGNvbG9yIHN0cmluZycsXG4gICAgJ3dlaWdodC1pbnRlcnZhbCc6ICd3ZWlnaHQgb2YgY29sb3IgdG8gYmUgbWl4ZWQsIHNob3VsZCBiZSBudW1iZXIgYmV0d2VlbiAwIC0gMSdcbiAgfSlcbiAgLmFjdGlvbihhc3luYyAoY29sb3IxOiBzdHJpbmcsIGNvbG9yMjogc3RyaW5nLCB3ZWlnaHRJbnRlcnZhbD86IHN0cmluZykgPT4ge1xuICAgIGlmICh3ZWlnaHRJbnRlcnZhbCA9PSBudWxsKSB7XG4gICAgICB3ZWlnaHRJbnRlcnZhbCA9ICcwLjEnO1xuICAgIH1cbiAgICAoYXdhaXQgaW1wb3J0KCcuLi9jb2xvcicpKS5taXhDb2xvcihjb2xvcjEsIGNvbG9yMiwgTnVtYmVyKHdlaWdodEludGVydmFsKSk7XG4gIH0pO1xuXG4gIC8vIFRPRE86IEFkZCBtb3JlIHN1YiBjb21tYW5kIGhlcmVcbn07XG5cbmV4cG9ydCBkZWZhdWx0IGNsaUV4dDtcbiJdfQ==