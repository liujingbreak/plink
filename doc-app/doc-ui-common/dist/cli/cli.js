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
const cliExt = (program) => {
    const mdCli = program.command('markdown <file>')
        .description('Show markdown topics', { file: 'source markdown file' })
        .option('-o,--out <output html>', 'Output to html file')
        .action((file) => __awaiter(void 0, void 0, void 0, function* () {
        const { markdownToHtml } = require('../markdown-util');
        const { toc, content } = yield markdownToHtml(fs_1.default.readFileSync(path_1.default.resolve(file), 'utf8')).toPromise();
        // eslint-disable-next-line no-console
        console.log('Table of content:', toc);
        if (mdCli.opts().out) {
            const target = path_1.default.resolve(mdCli.opts().out);
            fs_extra_1.mkdirpSync(path_1.default.dirname(target));
            fs_1.default.writeFileSync(target, content);
            // eslint-disable-next-line no-console
            console.log('Output HTML to file:', target);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY2xpLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUVBLDRDQUFvQjtBQUNwQix1Q0FBb0M7QUFDcEMsZ0RBQXdCO0FBRXhCLE1BQU0sTUFBTSxHQUFpQixDQUFDLE9BQU8sRUFBRSxFQUFFO0lBQ3ZDLE1BQU0sS0FBSyxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsaUJBQWlCLENBQUM7U0FDL0MsV0FBVyxDQUFDLHNCQUFzQixFQUFFLEVBQUMsSUFBSSxFQUFFLHNCQUFzQixFQUFDLENBQUM7U0FDbkUsTUFBTSxDQUFDLHdCQUF3QixFQUFFLHFCQUFxQixDQUFDO1NBQ3ZELE1BQU0sQ0FBQyxDQUFPLElBQUksRUFBRSxFQUFFO1FBQ3JCLE1BQU0sRUFBQyxjQUFjLEVBQUMsR0FBRyxPQUFPLENBQUMsa0JBQWtCLENBQXdCLENBQUM7UUFDNUUsTUFBTSxFQUFDLEdBQUcsRUFBRSxPQUFPLEVBQUMsR0FBRyxNQUFNLGNBQWMsQ0FBQyxZQUFFLENBQUMsWUFBWSxDQUFDLGNBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQyxTQUFTLEVBQUUsQ0FBQztRQUNyRyxzQ0FBc0M7UUFDdEMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxtQkFBbUIsRUFBRSxHQUFHLENBQUMsQ0FBQztRQUN0QyxJQUFJLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQyxHQUFHLEVBQUU7WUFDcEIsTUFBTSxNQUFNLEdBQUcsY0FBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDOUMscUJBQVUsQ0FBQyxjQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7WUFDakMsWUFBRSxDQUFDLGFBQWEsQ0FBQyxNQUFNLEVBQUUsT0FBTyxDQUFDLENBQUM7WUFDbEMsc0NBQXNDO1lBQ3RDLE9BQU8sQ0FBQyxHQUFHLENBQUMsc0JBQXNCLEVBQUUsTUFBTSxDQUFDLENBQUM7U0FDN0M7SUFDSCxDQUFDLENBQUEsQ0FBQyxDQUFDO0lBRUgsT0FBTyxDQUFDLE9BQU8sQ0FBQyw4QkFBOEIsQ0FBQztTQUM5QyxXQUFXLENBQUMsd0JBQXdCLEVBQUUsRUFBQyxjQUFjLEVBQUUsNkJBQTZCLEVBQUMsQ0FBQztTQUN0RixNQUFNLENBQUMsVUFBZSxNQUFnQjs7WUFDckMsS0FBSyxNQUFNLElBQUksSUFBSSxDQUFDLHdEQUFhLFVBQVUsR0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxFQUFFO2dCQUMvRCxzQ0FBc0M7Z0JBQ3RDLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7YUFDbkI7UUFDSCxDQUFDO0tBQUEsQ0FBQyxDQUFDO0lBRUgsT0FBTyxDQUFDLE9BQU8sQ0FBQyxnREFBZ0QsQ0FBQztTQUNoRSxXQUFXLENBQUMsaUNBQWlDLEVBQUUsRUFBQyxlQUFlLEVBQUUsNkJBQTZCLEVBQUMsQ0FBQztTQUNoRyxNQUFNLENBQUMsVUFBZSxHQUFHLE1BQWdCOztZQUN4QyxDQUFDLHdEQUFhLFVBQVUsR0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLEdBQUcsTUFBMEIsQ0FBQyxDQUFDO1FBQzFFLENBQUM7S0FBQSxDQUFDLENBQUM7SUFFSCxPQUFPLENBQUMsT0FBTyxDQUFDLCtDQUErQyxDQUFDO1NBQy9ELFdBQVcsQ0FBQyxrQkFBa0IsRUFBRTtRQUMvQixNQUFNLEVBQUUsNkJBQTZCO1FBQ3JDLE1BQU0sRUFBRSw2QkFBNkI7UUFDckMsaUJBQWlCLEVBQUUsNkRBQTZEO0tBQ2pGLENBQUM7U0FDRCxNQUFNLENBQUMsQ0FBTyxNQUFjLEVBQUUsTUFBYyxFQUFFLGNBQXVCLEVBQUUsRUFBRTtRQUN4RSxJQUFJLGNBQWMsSUFBSSxJQUFJLEVBQUU7WUFDMUIsY0FBYyxHQUFHLEtBQUssQ0FBQztTQUN4QjtRQUNELENBQUMsd0RBQWEsVUFBVSxHQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLE1BQU0sRUFBRSxNQUFNLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQztJQUM5RSxDQUFDLENBQUEsQ0FBQyxDQUFDO0lBRUgsa0NBQWtDO0FBQ3BDLENBQUMsQ0FBQztBQUVGLGtCQUFlLE1BQU0sQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7Q2xpRXh0ZW5zaW9ufSBmcm9tICdAd2ZoL3BsaW5rL3dmaC9kaXN0JztcbmltcG9ydCAqIGFzIG1hcmtkb3duVXRpbCBmcm9tICcuLi9tYXJrZG93bi11dGlsJztcbmltcG9ydCBmcyBmcm9tICdmcyc7XG5pbXBvcnQge21rZGlycFN5bmN9IGZyb20gJ2ZzLWV4dHJhJztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuXG5jb25zdCBjbGlFeHQ6IENsaUV4dGVuc2lvbiA9IChwcm9ncmFtKSA9PiB7XG4gIGNvbnN0IG1kQ2xpID0gcHJvZ3JhbS5jb21tYW5kKCdtYXJrZG93biA8ZmlsZT4nKVxuICAuZGVzY3JpcHRpb24oJ1Nob3cgbWFya2Rvd24gdG9waWNzJywge2ZpbGU6ICdzb3VyY2UgbWFya2Rvd24gZmlsZSd9KVxuICAub3B0aW9uKCctbywtLW91dCA8b3V0cHV0IGh0bWw+JywgJ091dHB1dCB0byBodG1sIGZpbGUnKVxuICAuYWN0aW9uKGFzeW5jIChmaWxlKSA9PiB7XG4gICAgY29uc3Qge21hcmtkb3duVG9IdG1sfSA9IHJlcXVpcmUoJy4uL21hcmtkb3duLXV0aWwnKSBhcyB0eXBlb2YgbWFya2Rvd25VdGlsO1xuICAgIGNvbnN0IHt0b2MsIGNvbnRlbnR9ID0gYXdhaXQgbWFya2Rvd25Ub0h0bWwoZnMucmVhZEZpbGVTeW5jKFBhdGgucmVzb2x2ZShmaWxlKSwgJ3V0ZjgnKSkudG9Qcm9taXNlKCk7XG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICBjb25zb2xlLmxvZygnVGFibGUgb2YgY29udGVudDonLCB0b2MpO1xuICAgIGlmIChtZENsaS5vcHRzKCkub3V0KSB7XG4gICAgICBjb25zdCB0YXJnZXQgPSBQYXRoLnJlc29sdmUobWRDbGkub3B0cygpLm91dCk7XG4gICAgICBta2RpcnBTeW5jKFBhdGguZGlybmFtZSh0YXJnZXQpKTtcbiAgICAgIGZzLndyaXRlRmlsZVN5bmModGFyZ2V0LCBjb250ZW50KTtcbiAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgICBjb25zb2xlLmxvZygnT3V0cHV0IEhUTUwgdG8gZmlsZTonLCB0YXJnZXQpO1xuICAgIH1cbiAgfSk7XG5cbiAgcHJvZ3JhbS5jb21tYW5kKCdjb2xvci1pbmZvIDxjb2xvci1zdHJpbmcuLi4+JylcbiAgLmRlc2NyaXB0aW9uKCdTaG93IGNvbG9yIGluZm9ybWF0aW9uJywgeydjb2xvci1zdHJpbmcnOiAnSW4gZm9ybSBvZiBDU1MgY29sb3Igc3RyaW5nJ30pXG4gIC5hY3Rpb24oYXN5bmMgZnVuY3Rpb24oY29sb3JzOiBzdHJpbmdbXSkge1xuICAgIGZvciAoY29uc3QgaW5mbyBvZiAoYXdhaXQgaW1wb3J0KCcuLi9jb2xvcicpKS5jb2xvckluZm8oY29sb3JzKSkge1xuICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICAgIGNvbnNvbGUubG9nKGluZm8pO1xuICAgIH1cbiAgfSk7XG5cbiAgcHJvZ3JhbS5jb21tYW5kKCdjb2xvci1jb250cmFzdCA8Y29sb3Itc3RyaW5nMT4gPGNvbG9yLXN0cmluZzI+JylcbiAgLmRlc2NyaXB0aW9uKCdTaG93IGNvbG9yIGNvbnRyYXN0IGluZm9ybWF0aW9uJywgeydjb2xvci1zdHJpbmcxJzogJ0luIGZvcm0gb2YgQ1NTIGNvbG9yIHN0cmluZyd9KVxuICAuYWN0aW9uKGFzeW5jIGZ1bmN0aW9uKC4uLmNvbG9yczogc3RyaW5nW10pIHtcbiAgICAoYXdhaXQgaW1wb3J0KCcuLi9jb2xvcicpKS5jb2xvckNvbnRyYXN0KC4uLmNvbG9ycyBhcyBbc3RyaW5nLCBzdHJpbmddKTtcbiAgfSk7XG5cbiAgcHJvZ3JhbS5jb21tYW5kKCdjb2xvci1taXggPGNvbG9yMT4gPGNvbG9yMj4gW3dlaWdodC1pbnRlcnZhbF0nKVxuICAuZGVzY3JpcHRpb24oJ2NvbXBhcmUgMiBjb2xvcnMnLCB7XG4gICAgY29sb3IxOiAnSW4gZm9ybSBvZiBDU1MgY29sb3Igc3RyaW5nJyxcbiAgICBjb2xvcjI6ICdJbiBmb3JtIG9mIENTUyBjb2xvciBzdHJpbmcnLFxuICAgICd3ZWlnaHQtaW50ZXJ2YWwnOiAnd2VpZ2h0IG9mIGNvbG9yIHRvIGJlIG1peGVkLCBzaG91bGQgYmUgbnVtYmVyIGJldHdlZW4gMCAtIDEnXG4gIH0pXG4gIC5hY3Rpb24oYXN5bmMgKGNvbG9yMTogc3RyaW5nLCBjb2xvcjI6IHN0cmluZywgd2VpZ2h0SW50ZXJ2YWw/OiBzdHJpbmcpID0+IHtcbiAgICBpZiAod2VpZ2h0SW50ZXJ2YWwgPT0gbnVsbCkge1xuICAgICAgd2VpZ2h0SW50ZXJ2YWwgPSAnMC4xJztcbiAgICB9XG4gICAgKGF3YWl0IGltcG9ydCgnLi4vY29sb3InKSkubWl4Q29sb3IoY29sb3IxLCBjb2xvcjIsIE51bWJlcih3ZWlnaHRJbnRlcnZhbCkpO1xuICB9KTtcblxuICAvLyBUT0RPOiBBZGQgbW9yZSBzdWIgY29tbWFuZCBoZXJlXG59O1xuXG5leHBvcnQgZGVmYXVsdCBjbGlFeHQ7XG4iXX0=