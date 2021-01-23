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
exports.writeMockZip = exports.stringifyListAllVersions = exports.stringifyListVersions = exports.listAllVersions = exports.listVersions = void 0;
const adm_zip_1 = __importDefault(require("adm-zip"));
const fs = __importStar(require("fs"));
const Path = __importStar(require("path"));
const _ = __importStar(require("lodash"));
// import boxen, {BorderStyle} from 'boxen';
const yazl_1 = require("yazl");
const dayjs_1 = __importDefault(require("dayjs"));
const dist_1 = require("@wfh/plink/wfh/dist");
function listVersions(env) {
    return __awaiter(this, void 0, void 0, function* () {
        const done = [];
        const dir = Path.resolve(dist_1.getRootDir(), `install-${env}`);
        const versions = new Map();
        for (const zipName of fs.readdirSync(dir)) {
            if (zipName.endsWith('.zip')) {
                const zip = new adm_zip_1.default(Path.join(dir, zipName));
                const app = _.trimEnd(zipName, '.zip');
                done.push(new Promise(resolve => {
                    zip.readAsTextAsync(app + '.githash-webui.txt', data => {
                        versions.set(app, data);
                        resolve();
                    });
                }));
            }
        }
        yield Promise.all(done);
        return versions;
    });
}
exports.listVersions = listVersions;
function listAllVersions() {
    return __awaiter(this, void 0, void 0, function* () {
        const map = new Map();
        const done = fs.readdirSync(dist_1.getRootDir())
            .filter(dir => {
            return dir.startsWith('install-') && fs.statSync(Path.resolve(dist_1.getRootDir(), dir)).isDirectory();
        })
            .reduce((promises, dir) => {
            const env = /^install-([^]*)$/.exec(dir)[1];
            promises.push(listVersions(env).then(res => {
                map.set(env, res);
            }));
            return promises;
        }, []);
        yield Promise.all(done);
        return map;
    });
}
exports.listAllVersions = listAllVersions;
function stringifyListVersions(env) {
    return __awaiter(this, void 0, void 0, function* () {
        const res = yield listVersions(env);
        let buf = '';
        for (const [app, githash] of res.entries()) {
            buf += ` ${env} - ${app}\n${githash}\n`;
            buf += '\n';
        }
        return buf;
    });
}
exports.stringifyListVersions = stringifyListVersions;
function stringifyListAllVersions() {
    return __awaiter(this, void 0, void 0, function* () {
        const envMap = yield listAllVersions();
        let buf = '';
        for (const [env, appHash] of envMap.entries()) {
            for (const [app, githash] of appHash.entries()) {
                buf += `  ${env} - ${app}\n${githash}\n`;
                buf += '\n';
            }
        }
        return buf;
    });
}
exports.stringifyListAllVersions = stringifyListAllVersions;
function writeMockZip(writeTo, content) {
    const zipFile = new yazl_1.ZipFile();
    const prom = new Promise(resolve => {
        zipFile.outputStream.pipe(fs.createWriteStream(writeTo))
            .on('close', resolve);
    });
    const today = dayjs_1.default();
    const fileName = `fake-${today.format('YYMMDD')}-${today.format('HHmmss')}.txt`;
    zipFile.addBuffer(Buffer.from(content), fileName);
    zipFile.end({ forceZip64Format: false });
    return prom;
}
exports.writeMockZip = writeMockZip;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXJ0aWZhY3RzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYXJ0aWZhY3RzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxzREFBNkI7QUFDN0IsdUNBQXlCO0FBQ3pCLDJDQUE2QjtBQUM3QiwwQ0FBNEI7QUFDNUIsNENBQTRDO0FBQzVDLCtCQUE2QjtBQUM3QixrREFBMEI7QUFDMUIsOENBQStDO0FBSS9DLFNBQXNCLFlBQVksQ0FBQyxHQUFXOztRQUM1QyxNQUFNLElBQUksR0FBb0IsRUFBRSxDQUFDO1FBQ2pDLE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsaUJBQVUsRUFBRSxFQUFFLFdBQVcsR0FBRyxFQUFFLENBQUMsQ0FBQztRQUN6RCxNQUFNLFFBQVEsR0FBRyxJQUFJLEdBQUcsRUFBa0IsQ0FBQztRQUUzQyxLQUFLLE1BQU0sT0FBTyxJQUFJLEVBQUUsQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLEVBQUU7WUFDekMsSUFBSSxPQUFPLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxFQUFFO2dCQUM1QixNQUFNLEdBQUcsR0FBRyxJQUFJLGlCQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQztnQkFDaEQsTUFBTSxHQUFHLEdBQUcsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsTUFBTSxDQUFDLENBQUM7Z0JBRXZDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxPQUFPLENBQUMsT0FBTyxDQUFDLEVBQUU7b0JBQzlCLEdBQUcsQ0FBQyxlQUFlLENBQUMsR0FBRyxHQUFHLG9CQUFvQixFQUFFLElBQUksQ0FBQyxFQUFFO3dCQUNyRCxRQUFRLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsQ0FBQzt3QkFDeEIsT0FBTyxFQUFFLENBQUM7b0JBQ1osQ0FBQyxDQUFDLENBQUM7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RUgsTUFBTSxLQUFLLEdBQUcsZUFBSyxFQUFFLENBQUM7SUFDdEIsTUFBTSxRQUFRLEdBQUcsUUFBUSxLQUFLLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEtBQUssQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQztJQUVoRixPQUFPLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLEVBQUUsUUFBUSxDQUFDLENBQUM7SUFDbEQsT0FBTyxDQUFDLEdBQUcsQ0FBQyxFQUFDLGdCQUFnQixFQUFFLEtBQUssRUFBQyxDQUFDLENBQUM7SUFDdkMsT0FBTyxJQUFJLENBQUM7QUFDZCxDQUFDO0FBYkQsb0NBYUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgQWRtWmlwIGZyb20gJ2FkbS16aXAnO1xuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xuaW1wb3J0ICogYXMgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCAqIGFzIF8gZnJvbSAnbG9kYXNoJztcbi8vIGltcG9ydCBib3hlbiwge0JvcmRlclN0eWxlfSBmcm9tICdib3hlbic7XG5pbXBvcnQge1ppcEZpbGV9IGZyb20gJ3lhemwnO1xuaW1wb3J0IGRheWpzIGZyb20gJ2RheWpzJztcbmltcG9ydCB7Z2V0Um9vdERpcn0gZnJvbSAnQHdmaC9wbGluay93ZmgvZGlzdCc7XG5cbnR5cGUgVW5wYWNrUHJvbWlzZTxQPiA9IFAgZXh0ZW5kcyBQcm9taXNlPGluZmVyIFQ+ID8gVCA6IHVua25vd247XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBsaXN0VmVyc2lvbnMoZW52OiBzdHJpbmcpIHtcbiAgY29uc3QgZG9uZTogUHJvbWlzZTx2b2lkPltdID0gW107XG4gIGNvbnN0IGRpciA9IFBhdGgucmVzb2x2ZShnZXRSb290RGlyKCksIGBpbnN0YWxsLSR7ZW52fWApO1xuICBjb25zdCB2ZXJzaW9ucyA9IG5ldyBNYXA8c3RyaW5nLCBzdHJpbmc+KCk7XG5cbiAgZm9yIChjb25zdCB6aXBOYW1lIG9mIGZzLnJlYWRkaXJTeW5jKGRpcikpIHtcbiAgICBpZiAoemlwTmFtZS5lbmRzV2l0aCgnLnppcCcpKSB7XG4gICAgICBjb25zdCB6aXAgPSBuZXcgQWRtWmlwKFBhdGguam9pbihkaXIsIHppcE5hbWUpKTtcbiAgICAgIGNvbnN0IGFwcCA9IF8udHJpbUVuZCh6aXBOYW1lLCAnLnppcCcpO1xuXG4gICAgICBkb25lLnB1c2gobmV3IFByb21pc2UocmVzb2x2ZSA9PiB7XG4gICAgICAgIHppcC5yZWFkQXNUZXh0QXN5bmMoYXBwICsgJy5naXRoYXNoLXdlYnVpLnR4dCcsIGRhdGEgPT4ge1xuICAgICAgICAgIHZlcnNpb25zLnNldChhcHAsIGRhdGEpO1xuICAgICAgICAgIHJlc29sdmUoKTtcbiAgICAgICAgfSk7XG4gICAgICB9KSk7XG4gICAgfVxuICB9XG4gIGF3YWl0IFByb21pc2UuYWxsKGRvbmUpO1xuICByZXR1cm4gdmVyc2lvbnM7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBsaXN0QWxsVmVyc2lvbnMoKSB7XG4gIGNvbnN0IG1hcCA9IG5ldyBNYXA8c3RyaW5nLCBVbnBhY2tQcm9taXNlPFJldHVyblR5cGU8dHlwZW9mIGxpc3RWZXJzaW9ucz4+PigpO1xuICBjb25zdCBkb25lID0gZnMucmVhZGRpclN5bmMoZ2V0Um9vdERpcigpKVxuICAuZmlsdGVyKGRpciA9PiB7XG4gICAgcmV0dXJuIGRpci5zdGFydHNXaXRoKCdpbnN0YWxsLScpICYmIGZzLnN0YXRTeW5jKFBhdGgucmVzb2x2ZShnZXRSb290RGlyKCksIGRpcikpLmlzRGlyZWN0b3J5KCk7XG4gIH0pXG4gIC5yZWR1Y2UoKHByb21pc2VzLCBkaXIpID0+IHtcbiAgICBjb25zdCBlbnYgPSAvXmluc3RhbGwtKFteXSopJC8uZXhlYyhkaXIpIVsxXTtcbiAgICBwcm9taXNlcy5wdXNoKGxpc3RWZXJzaW9ucyhlbnYpLnRoZW4ocmVzID0+IHtcbiAgICAgICAgbWFwLnNldChlbnYsIHJlcyk7XG4gICAgICB9KVxuICAgICk7XG4gICAgcmV0dXJuIHByb21pc2VzO1xuICB9LCBbXSBhcyBQcm9taXNlPHZvaWQ+W10pO1xuXG4gIGF3YWl0IFByb21pc2UuYWxsKGRvbmUpO1xuICByZXR1cm4gbWFwO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gc3RyaW5naWZ5TGlzdFZlcnNpb25zKGVudjogc3RyaW5nKSB7XG4gIGNvbnN0IHJlcyA9IGF3YWl0IGxpc3RWZXJzaW9ucyhlbnYpO1xuICBsZXQgYnVmID0gJyc7XG4gIGZvciAoY29uc3QgW2FwcCwgZ2l0aGFzaF0gb2YgcmVzLmVudHJpZXMoKSkge1xuICAgIGJ1ZiArPSBgICR7ZW52fSAtICR7YXBwfVxcbiR7Z2l0aGFzaH1cXG5gO1xuICAgIGJ1ZiArPSAnXFxuJztcbiAgfVxuICByZXR1cm4gYnVmO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gc3RyaW5naWZ5TGlzdEFsbFZlcnNpb25zKCkge1xuICBjb25zdCBlbnZNYXAgPSBhd2FpdCBsaXN0QWxsVmVyc2lvbnMoKTtcbiAgbGV0IGJ1ZiA9ICcnO1xuICBmb3IgKGNvbnN0IFtlbnYsIGFwcEhhc2hdIG9mIGVudk1hcC5lbnRyaWVzKCkpIHtcbiAgICBmb3IgKGNvbnN0IFthcHAsIGdpdGhhc2hdIG9mIGFwcEhhc2guZW50cmllcygpKSB7XG4gICAgICBidWYgKz0gYCAgJHtlbnZ9IC0gJHthcHB9XFxuJHtnaXRoYXNofVxcbmA7XG4gICAgICBidWYgKz0gJ1xcbic7XG4gICAgfVxuICB9XG4gIHJldHVybiBidWY7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB3cml0ZU1vY2taaXAod3JpdGVUbzogc3RyaW5nLCBjb250ZW50OiBzdHJpbmcpIHtcbiAgY29uc3QgemlwRmlsZSA9IG5ldyBaaXBGaWxlKCk7XG4gIGNvbnN0IHByb20gPSBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHtcbiAgICB6aXBGaWxlLm91dHB1dFN0cmVhbS5waXBlKGZzLmNyZWF0ZVdyaXRlU3RyZWFtKHdyaXRlVG8pKVxuICAgIC5vbignY2xvc2UnLCByZXNvbHZlKTtcbiAgfSk7XG5cbiAgY29uc3QgdG9kYXkgPSBkYXlqcygpO1xuICBjb25zdCBmaWxlTmFtZSA9IGBmYWtlLSR7dG9kYXkuZm9ybWF0KCdZWU1NREQnKX0tJHt0b2RheS5mb3JtYXQoJ0hIbW1zcycpfS50eHRgO1xuXG4gIHppcEZpbGUuYWRkQnVmZmVyKEJ1ZmZlci5mcm9tKGNvbnRlbnQpLCBmaWxlTmFtZSk7XG4gIHppcEZpbGUuZW5kKHtmb3JjZVppcDY0Rm9ybWF0OiBmYWxzZX0pO1xuICByZXR1cm4gcHJvbTtcbn1cblxuIl19