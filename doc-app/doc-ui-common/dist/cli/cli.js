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
        .option('-o,--out <output html>', 'Output to html file')
        .action((file) => __awaiter(void 0, void 0, void 0, function* () {
        const { markdownToHtml, tocToString } = require('../markdown-util');
        const { toc, content } = yield markdownToHtml(fs_1.default.readFileSync(path_1.default.resolve(file), 'utf8')).toPromise();
        // eslint-disable-next-line no-console
        console.log('Table of content:\n' + tocToString(toc));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY2xpLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUVBLDRDQUFvQjtBQUNwQix1Q0FBb0M7QUFDcEMsZ0RBQXdCO0FBQ3hCLDJCQUEyQjtBQUUzQixNQUFNLE1BQU0sR0FBaUIsQ0FBQyxPQUFPLEVBQUUsRUFBRTtJQUN2QyxNQUFNLEtBQUssR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLGlCQUFpQixDQUFDO1NBQy9DLFdBQVcsQ0FBQyxzQkFBc0IsRUFBRSxFQUFDLElBQUksRUFBRSxzQkFBc0IsRUFBQyxDQUFDO1NBQ25FLE1BQU0sQ0FBQyx3QkFBd0IsRUFBRSxxQkFBcUIsQ0FBQztTQUN2RCxNQUFNLENBQUMsQ0FBTyxJQUFJLEVBQUUsRUFBRTtRQUNyQixNQUFNLEVBQUMsY0FBYyxFQUFFLFdBQVcsRUFBQyxHQUFHLE9BQU8sQ0FBQyxrQkFBa0IsQ0FBd0IsQ0FBQztRQUN6RixNQUFNLEVBQUMsR0FBRyxFQUFFLE9BQU8sRUFBQyxHQUFHLE1BQU0sY0FBYyxDQUFDLFlBQUUsQ0FBQyxZQUFZLENBQUMsY0FBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDLFNBQVMsRUFBRSxDQUFDO1FBQ3JHLHNDQUFzQztRQUN0QyxPQUFPLENBQUMsR0FBRyxDQUFDLHFCQUFxQixHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO1FBQ3RELElBQUksS0FBSyxDQUFDLElBQUksRUFBRSxDQUFDLEdBQUcsRUFBRTtZQUNwQixNQUFNLE1BQU0sR0FBRyxjQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUM5QyxxQkFBVSxDQUFDLGNBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztZQUNqQyxZQUFFLENBQUMsYUFBYSxDQUFDLE1BQU0sRUFBRSxPQUFPLENBQUMsQ0FBQztZQUNsQyxzQ0FBc0M7WUFDdEMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxzQkFBc0IsRUFBRSxNQUFNLENBQUMsQ0FBQztTQUM3QztJQUNILENBQUMsQ0FBQSxDQUFDLENBQUM7SUFFSCxPQUFPLENBQUMsT0FBTyxDQUFDLDhCQUE4QixDQUFDO1NBQzlDLFdBQVcsQ0FBQyx3QkFBd0IsRUFBRSxFQUFDLGNBQWMsRUFBRSw2QkFBNkIsRUFBQyxDQUFDO1NBQ3RGLE1BQU0sQ0FBQyxVQUFlLE1BQWdCOztZQUNyQyxLQUFLLE1BQU0sSUFBSSxJQUFJLENBQUMsd0RBQWEsVUFBVSxHQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLEVBQUU7Z0JBQy9ELHNDQUFzQztnQkFDdEMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQzthQUNuQjtRQUNILENBQUM7S0FBQSxDQUFDLENBQUM7SUFFSCxPQUFPLENBQUMsT0FBTyxDQUFDLGdEQUFnRCxDQUFDO1NBQ2hFLFdBQVcsQ0FBQyxpQ0FBaUMsRUFBRSxFQUFDLGVBQWUsRUFBRSw2QkFBNkIsRUFBQyxDQUFDO1NBQ2hHLE1BQU0sQ0FBQyxVQUFlLEdBQUcsTUFBZ0I7O1lBQ3hDLENBQUMsd0RBQWEsVUFBVSxHQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsR0FBRyxNQUEwQixDQUFDLENBQUM7UUFDMUUsQ0FBQztLQUFBLENBQUMsQ0FBQztJQUVILE9BQU8sQ0FBQyxPQUFPLENBQUMsK0NBQStDLENBQUM7U0FDL0QsV0FBVyxDQUFDLGtCQUFrQixFQUFFO1FBQy9CLE1BQU0sRUFBRSw2QkFBNkI7UUFDckMsTUFBTSxFQUFFLDZCQUE2QjtRQUNyQyxpQkFBaUIsRUFBRSw2REFBNkQ7S0FDakYsQ0FBQztTQUNELE1BQU0sQ0FBQyxDQUFPLE1BQWMsRUFBRSxNQUFjLEVBQUUsY0FBdUIsRUFBRSxFQUFFO1FBQ3hFLElBQUksY0FBYyxJQUFJLElBQUksRUFBRTtZQUMxQixjQUFjLEdBQUcsS0FBSyxDQUFDO1NBQ3hCO1FBQ0QsQ0FBQyx3REFBYSxVQUFVLEdBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsTUFBTSxFQUFFLE1BQU0sQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDO0lBQzlFLENBQUMsQ0FBQSxDQUFDLENBQUM7SUFFSCxrQ0FBa0M7QUFDcEMsQ0FBQyxDQUFDO0FBRUYsa0JBQWUsTUFBTSxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtDbGlFeHRlbnNpb259IGZyb20gJ0B3ZmgvcGxpbmsvd2ZoL2Rpc3QnO1xuaW1wb3J0ICogYXMgbWFya2Rvd25VdGlsIGZyb20gJy4uL21hcmtkb3duLXV0aWwnO1xuaW1wb3J0IGZzIGZyb20gJ2ZzJztcbmltcG9ydCB7bWtkaXJwU3luY30gZnJvbSAnZnMtZXh0cmEnO1xuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG4vLyBpbXBvcnQgdXRpbCBmcm9tICd1dGlsJztcblxuY29uc3QgY2xpRXh0OiBDbGlFeHRlbnNpb24gPSAocHJvZ3JhbSkgPT4ge1xuICBjb25zdCBtZENsaSA9IHByb2dyYW0uY29tbWFuZCgnbWFya2Rvd24gPGZpbGU+JylcbiAgLmRlc2NyaXB0aW9uKCdTaG93IG1hcmtkb3duIHRvcGljcycsIHtmaWxlOiAnc291cmNlIG1hcmtkb3duIGZpbGUnfSlcbiAgLm9wdGlvbignLW8sLS1vdXQgPG91dHB1dCBodG1sPicsICdPdXRwdXQgdG8gaHRtbCBmaWxlJylcbiAgLmFjdGlvbihhc3luYyAoZmlsZSkgPT4ge1xuICAgIGNvbnN0IHttYXJrZG93blRvSHRtbCwgdG9jVG9TdHJpbmd9ID0gcmVxdWlyZSgnLi4vbWFya2Rvd24tdXRpbCcpIGFzIHR5cGVvZiBtYXJrZG93blV0aWw7XG4gICAgY29uc3Qge3RvYywgY29udGVudH0gPSBhd2FpdCBtYXJrZG93blRvSHRtbChmcy5yZWFkRmlsZVN5bmMoUGF0aC5yZXNvbHZlKGZpbGUpLCAndXRmOCcpKS50b1Byb21pc2UoKTtcbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgIGNvbnNvbGUubG9nKCdUYWJsZSBvZiBjb250ZW50OlxcbicgKyB0b2NUb1N0cmluZyh0b2MpKTtcbiAgICBpZiAobWRDbGkub3B0cygpLm91dCkge1xuICAgICAgY29uc3QgdGFyZ2V0ID0gUGF0aC5yZXNvbHZlKG1kQ2xpLm9wdHMoKS5vdXQpO1xuICAgICAgbWtkaXJwU3luYyhQYXRoLmRpcm5hbWUodGFyZ2V0KSk7XG4gICAgICBmcy53cml0ZUZpbGVTeW5jKHRhcmdldCwgY29udGVudCk7XG4gICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgICAgY29uc29sZS5sb2coJ091dHB1dCBIVE1MIHRvIGZpbGU6JywgdGFyZ2V0KTtcbiAgICB9XG4gIH0pO1xuXG4gIHByb2dyYW0uY29tbWFuZCgnY29sb3ItaW5mbyA8Y29sb3Itc3RyaW5nLi4uPicpXG4gIC5kZXNjcmlwdGlvbignU2hvdyBjb2xvciBpbmZvcm1hdGlvbicsIHsnY29sb3Itc3RyaW5nJzogJ0luIGZvcm0gb2YgQ1NTIGNvbG9yIHN0cmluZyd9KVxuICAuYWN0aW9uKGFzeW5jIGZ1bmN0aW9uKGNvbG9yczogc3RyaW5nW10pIHtcbiAgICBmb3IgKGNvbnN0IGluZm8gb2YgKGF3YWl0IGltcG9ydCgnLi4vY29sb3InKSkuY29sb3JJbmZvKGNvbG9ycykpIHtcbiAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgICBjb25zb2xlLmxvZyhpbmZvKTtcbiAgICB9XG4gIH0pO1xuXG4gIHByb2dyYW0uY29tbWFuZCgnY29sb3ItY29udHJhc3QgPGNvbG9yLXN0cmluZzE+IDxjb2xvci1zdHJpbmcyPicpXG4gIC5kZXNjcmlwdGlvbignU2hvdyBjb2xvciBjb250cmFzdCBpbmZvcm1hdGlvbicsIHsnY29sb3Itc3RyaW5nMSc6ICdJbiBmb3JtIG9mIENTUyBjb2xvciBzdHJpbmcnfSlcbiAgLmFjdGlvbihhc3luYyBmdW5jdGlvbiguLi5jb2xvcnM6IHN0cmluZ1tdKSB7XG4gICAgKGF3YWl0IGltcG9ydCgnLi4vY29sb3InKSkuY29sb3JDb250cmFzdCguLi5jb2xvcnMgYXMgW3N0cmluZywgc3RyaW5nXSk7XG4gIH0pO1xuXG4gIHByb2dyYW0uY29tbWFuZCgnY29sb3ItbWl4IDxjb2xvcjE+IDxjb2xvcjI+IFt3ZWlnaHQtaW50ZXJ2YWxdJylcbiAgLmRlc2NyaXB0aW9uKCdjb21wYXJlIDIgY29sb3JzJywge1xuICAgIGNvbG9yMTogJ0luIGZvcm0gb2YgQ1NTIGNvbG9yIHN0cmluZycsXG4gICAgY29sb3IyOiAnSW4gZm9ybSBvZiBDU1MgY29sb3Igc3RyaW5nJyxcbiAgICAnd2VpZ2h0LWludGVydmFsJzogJ3dlaWdodCBvZiBjb2xvciB0byBiZSBtaXhlZCwgc2hvdWxkIGJlIG51bWJlciBiZXR3ZWVuIDAgLSAxJ1xuICB9KVxuICAuYWN0aW9uKGFzeW5jIChjb2xvcjE6IHN0cmluZywgY29sb3IyOiBzdHJpbmcsIHdlaWdodEludGVydmFsPzogc3RyaW5nKSA9PiB7XG4gICAgaWYgKHdlaWdodEludGVydmFsID09IG51bGwpIHtcbiAgICAgIHdlaWdodEludGVydmFsID0gJzAuMSc7XG4gICAgfVxuICAgIChhd2FpdCBpbXBvcnQoJy4uL2NvbG9yJykpLm1peENvbG9yKGNvbG9yMSwgY29sb3IyLCBOdW1iZXIod2VpZ2h0SW50ZXJ2YWwpKTtcbiAgfSk7XG5cbiAgLy8gVE9ETzogQWRkIG1vcmUgc3ViIGNvbW1hbmQgaGVyZVxufTtcblxuZXhwb3J0IGRlZmF1bHQgY2xpRXh0O1xuIl19