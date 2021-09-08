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
                (0, fs_extra_1.mkdirpSync)(path_1.default.dirname(target));
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
                (0, fs_extra_1.mkdirpSync)(path_1.default.dirname(target));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY2xpLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUVBLDRDQUFvQjtBQUNwQix1Q0FBb0M7QUFDcEMsZ0RBQXdCO0FBQ3hCLDJCQUEyQjtBQUUzQixNQUFNLE1BQU0sR0FBaUIsQ0FBQyxPQUFPLEVBQUUsRUFBRTtJQUN2QyxNQUFNLEtBQUssR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLGlCQUFpQixDQUFDO1NBQy9DLFdBQVcsQ0FBQyxzQkFBc0IsRUFBRSxFQUFDLElBQUksRUFBRSxzQkFBc0IsRUFBQyxDQUFDO1NBQ25FLE1BQU0sQ0FBQyxjQUFjLEVBQUUsb0RBQW9ELENBQUM7U0FDNUUsTUFBTSxDQUFDLHdCQUF3QixFQUFFLHFCQUFxQixDQUFDO1NBQ3ZELE1BQU0sQ0FBQyxDQUFPLElBQUksRUFBRSxFQUFFO1FBQ3JCLE1BQU0sRUFBQyxjQUFjLEVBQUUsV0FBVyxFQUFFLHlCQUF5QixFQUFDLEdBQUcsT0FBTyxDQUFDLGtCQUFrQixDQUF3QixDQUFDO1FBQ3BILE1BQU0sS0FBSyxHQUFHLFlBQUUsQ0FBQyxZQUFZLENBQUMsY0FBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQztRQUMxRCxJQUFJLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQyxNQUFNLEVBQUU7WUFDdkIsTUFBTSxFQUFDLFNBQVMsRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFDLEdBQUcsTUFBTSx5QkFBeUIsQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUN0RSxzQ0FBc0M7WUFDdEMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsR0FBRyxHQUFHLENBQUMsQ0FBQztZQUN6QyxZQUFFLENBQUMsYUFBYSxDQUFDLElBQUksRUFBRSxTQUFTLENBQUMsQ0FBQztZQUNsQyxJQUFJLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQyxHQUFH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bSAnQHdmaC9wbGluay93ZmgvZGlzdCc7XG5pbXBvcnQgKiBhcyBtYXJrZG93blV0aWwgZnJvbSAnLi4vbWFya2Rvd24tdXRpbCc7XG5pbXBvcnQgZnMgZnJvbSAnZnMnO1xuaW1wb3J0IHtta2RpcnBTeW5jfSBmcm9tICdmcy1leHRyYSc7XG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbi8vIGltcG9ydCB1dGlsIGZyb20gJ3V0aWwnO1xuXG5jb25zdCBjbGlFeHQ6IENsaUV4dGVuc2lvbiA9IChwcm9ncmFtKSA9PiB7XG4gIGNvbnN0IG1kQ2xpID0gcHJvZ3JhbS5jb21tYW5kKCdtYXJrZG93biA8ZmlsZT4nKVxuICAuZGVzY3JpcHRpb24oJ1Nob3cgbWFya2Rvd24gdG9waWNzJywge2ZpbGU6ICdzb3VyY2UgbWFya2Rvd24gZmlsZSd9KVxuICAub3B0aW9uKCctaSwgLS1pbnNlcnQnLCAnSW5zZXJ0IG9yIHVwZGF0ZSB0YWJsZSBvZiBjb250ZW50IGluIG1hcmtkb3duIGZpbGUnKVxuICAub3B0aW9uKCctbywtLW91dCA8b3V0cHV0IGh0bWw+JywgJ091dHB1dCB0byBodG1sIGZpbGUnKVxuICAuYWN0aW9uKGFzeW5jIChmaWxlKSA9PiB7XG4gICAgY29uc3Qge21hcmtkb3duVG9IdG1sLCB0b2NUb1N0cmluZywgaW5zZXJ0T3JVcGRhdGVNYXJrZG93blRvY30gPSByZXF1aXJlKCcuLi9tYXJrZG93bi11dGlsJykgYXMgdHlwZW9mIG1hcmtkb3duVXRpbDtcbiAgICBjb25zdCBpbnB1dCA9IGZzLnJlYWRGaWxlU3luYyhQYXRoLnJlc29sdmUoZmlsZSksICd1dGY4Jyk7XG4gICAgaWYgKG1kQ2xpLm9wdHMoKS5pbnNlcnQpIHtcbiAgICAgIGNvbnN0IHtjaGFuZ2VkTWQsIHRvYywgaHRtbH0gPSBhd2FpdCBpbnNlcnRPclVwZGF0ZU1hcmtkb3duVG9jKGlucHV0KTtcbiAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgICBjb25zb2xlLmxvZygnVGFibGUgb2YgY29udGVudDpcXG4nICsgdG9jKTtcbiAgICAgIGZzLndyaXRlRmlsZVN5bmMoZmlsZSwgY2hhbmdlZE1kKTtcbiAgICAgIGlmIChtZENsaS5vcHRzKCkub3V0KSB7XG4gICAgICAgIGNvbnN0IHRhcmdldCA9IFBhdGgucmVzb2x2ZShtZENsaS5vcHRzKCkub3V0KTtcbiAgICAgICAgbWtkaXJwU3luYyhQYXRoLmRpcm5hbWUodGFyZ2V0KSk7XG4gICAgICAgIGZzLndyaXRlRmlsZVN5bmModGFyZ2V0LCBodG1sKTtcbiAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICAgICAgY29uc29sZS5sb2coJ091dHB1dCBIVE1MIHRvIGZpbGU6JywgdGFyZ2V0KTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3Qge3RvYywgY29udGVudH0gPSBhd2FpdCBtYXJrZG93blRvSHRtbChpbnB1dCkudG9Qcm9taXNlKCk7XG4gICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgICAgY29uc29sZS5sb2coJ1RhYmxlIG9mIGNvbnRlbnQ6XFxuJyArIHRvY1RvU3RyaW5nKHRvYykpO1xuICAgICAgaWYgKG1kQ2xpLm9wdHMoKS5vdXQpIHtcbiAgICAgICAgY29uc3QgdGFyZ2V0ID0gUGF0aC5yZXNvbHZlKG1kQ2xpLm9wdHMoKS5vdXQpO1xuICAgICAgICBta2RpcnBTeW5jKFBhdGguZGlybmFtZSh0YXJnZXQpKTtcbiAgICAgICAgZnMud3JpdGVGaWxlU3luYyh0YXJnZXQsIGNvbnRlbnQpO1xuICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgICAgICBjb25zb2xlLmxvZygnT3V0cHV0IEhUTUwgdG8gZmlsZTonLCB0YXJnZXQpO1xuICAgICAgfVxuICAgIH1cbiAgfSk7XG5cbiAgcHJvZ3JhbS5jb21tYW5kKCdjb2xvci1pbmZvIDxjb2xvci1zdHJpbmcuLi4+JylcbiAgLmRlc2NyaXB0aW9uKCdTaG93IGNvbG9yIGluZm9ybWF0aW9uJywgeydjb2xvci1zdHJpbmcnOiAnSW4gZm9ybSBvZiBDU1MgY29sb3Igc3RyaW5nJ30pXG4gIC5hY3Rpb24oYXN5bmMgZnVuY3Rpb24oY29sb3JzOiBzdHJpbmdbXSkge1xuICAgIGZvciAoY29uc3QgaW5mbyBvZiAoYXdhaXQgaW1wb3J0KCcuLi9jb2xvcicpKS5jb2xvckluZm8oY29sb3JzKSkge1xuICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICAgIGNvbnNvbGUubG9nKGluZm8pO1xuICAgIH1cbiAgfSk7XG5cbiAgcHJvZ3JhbS5jb21tYW5kKCdjb2xvci1jb250cmFzdCA8Y29sb3Itc3RyaW5nMT4gPGNvbG9yLXN0cmluZzI+JylcbiAgLmRlc2NyaXB0aW9uKCdTaG93IGNvbG9yIGNvbnRyYXN0IGluZm9ybWF0aW9uJywgeydjb2xvci1zdHJpbmcxJzogJ0luIGZvcm0gb2YgQ1NTIGNvbG9yIHN0cmluZyd9KVxuICAuYWN0aW9uKGFzeW5jIGZ1bmN0aW9uKC4uLmNvbG9yczogc3RyaW5nW10pIHtcbiAgICAoYXdhaXQgaW1wb3J0KCcuLi9jb2xvcicpKS5jb2xvckNvbnRyYXN0KC4uLmNvbG9ycyBhcyBbc3RyaW5nLCBzdHJpbmddKTtcbiAgfSk7XG5cbiAgcHJvZ3JhbS5jb21tYW5kKCdjb2xvci1taXggPGNvbG9yMT4gPGNvbG9yMj4gW3dlaWdodC1pbnRlcnZhbF0nKVxuICAuZGVzY3JpcHRpb24oJ2NvbXBhcmUgMiBjb2xvcnMnLCB7XG4gICAgY29sb3IxOiAnSW4gZm9ybSBvZiBDU1MgY29sb3Igc3RyaW5nJyxcbiAgICBjb2xvcjI6ICdJbiBmb3JtIG9mIENTUyBjb2xvciBzdHJpbmcnLFxuICAgICd3ZWlnaHQtaW50ZXJ2YWwnOiAnd2VpZ2h0IG9mIGNvbG9yIHRvIGJlIG1peGVkLCBzaG91bGQgYmUgbnVtYmVyIGJldHdlZW4gMCAtIDEnXG4gIH0pXG4gIC5hY3Rpb24oYXN5bmMgKGNvbG9yMTogc3RyaW5nLCBjb2xvcjI6IHN0cmluZywgd2VpZ2h0SW50ZXJ2YWw/OiBzdHJpbmcpID0+IHtcbiAgICBpZiAod2VpZ2h0SW50ZXJ2YWwgPT0gbnVsbCkge1xuICAgICAgd2VpZ2h0SW50ZXJ2YWwgPSAnMC4xJztcbiAgICB9XG4gICAgKGF3YWl0IGltcG9ydCgnLi4vY29sb3InKSkubWl4Q29sb3IoY29sb3IxLCBjb2xvcjIsIE51bWJlcih3ZWlnaHRJbnRlcnZhbCkpO1xuICB9KTtcblxuICAvLyBUT0RPOiBBZGQgbW9yZSBzdWIgY29tbWFuZCBoZXJlXG59O1xuXG5leHBvcnQgZGVmYXVsdCBjbGlFeHQ7XG4iXX0=