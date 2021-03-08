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
                buf += `${env} - ${app}\n${githash.replace(/^/mg, '  ')}\n`;
                buf += '-----------------------------\n';
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXJ0aWZhY3RzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYXJ0aWZhY3RzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxzREFBNkI7QUFDN0IsdUNBQXlCO0FBQ3pCLDJDQUE2QjtBQUM3QiwwQ0FBNEI7QUFDNUIsNENBQTRDO0FBQzVDLCtCQUE2QjtBQUM3QixrREFBMEI7QUFDMUIsOENBQStDO0FBSS9DLFNBQXNCLFlBQVksQ0FBQyxHQUFXOztRQUM1QyxNQUFNLElBQUksR0FBb0IsRUFBRSxDQUFDO1FBQ2pDLE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsaUJBQVUsRUFBRSxFQUFFLFdBQVcsR0FBRyxFQUFFLENBQUMsQ0FBQztRQUN6RCxNQUFNLFFBQVEsR0FBRyxJQUFJLEdBQUcsRUFBa0IsQ0FBQztRQUUzQyxLQUFLLE1BQU0sT0FBTyxJQUFJLEVBQUUsQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLEVBQUU7WUFDekMsSUFBSSxPQUFPLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxFQUFFO2dCQUM1QixNQUFNLEdBQUcsR0FBRyxJQUFJLGlCQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQztnQkFDaEQsTUFBTSxHQUFHLEdBQUcsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsTUFBTSxDQUFDLENBQUM7Z0JBRXZDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxPQUFPLENBQUMsT0FBTyxDQUFDLEVBQUU7b0JBQzlCLEdBQUcsQ0FBQyxlQUFlLENBQUMsR0FBRyxHQUFHLG9CQUFvQixFQUFFLElBQUksQ0FBQyxFQUFFO3dCQUNyRCxRQUFRLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsQ0FBQzt3QkFDeEIsT0FBTyxFQUFFLENBQUM7b0JBQ1osQ0FBQyxDQUFDLENBQUM7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T0FBTyxDQUFDLENBQUM7SUFDeEIsQ0FBQyxDQUFDLENBQUM7SUFFSCxNQUFNLEtBQUssR0FBRyxlQUFLLEVBQUUsQ0FBQztJQUN0QixNQUFNLFFBQVEsR0FBRyxRQUFRLEtBQUssQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLElBQUksS0FBSyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDO0lBRWhGLE9BQU8sQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsRUFBRSxRQUFRLENBQUMsQ0FBQztJQUNsRCxPQUFPLENBQUMsR0FBRyxDQUFDLEVBQUMsZ0JBQWdCLEVBQUUsS0FBSyxFQUFDLENBQUMsQ0FBQztJQUN2QyxPQUFPLElBQUksQ0FBQztBQUNkLENBQUM7QUFiRCxvQ0FhQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBBZG1aaXAgZnJvbSAnYWRtLXppcCc7XG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XG5pbXBvcnQgKiBhcyBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0ICogYXMgXyBmcm9tICdsb2Rhc2gnO1xuLy8gaW1wb3J0IGJveGVuLCB7Qm9yZGVyU3R5bGV9IGZyb20gJ2JveGVuJztcbmltcG9ydCB7WmlwRmlsZX0gZnJvbSAneWF6bCc7XG5pbXBvcnQgZGF5anMgZnJvbSAnZGF5anMnO1xuaW1wb3J0IHtnZXRSb290RGlyfSBmcm9tICdAd2ZoL3BsaW5rL3dmaC9kaXN0JztcblxudHlwZSBVbnBhY2tQcm9taXNlPFA+ID0gUCBleHRlbmRzIFByb21pc2U8aW5mZXIgVD4gPyBUIDogdW5rbm93bjtcblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGxpc3RWZXJzaW9ucyhlbnY6IHN0cmluZykge1xuICBjb25zdCBkb25lOiBQcm9taXNlPHZvaWQ+W10gPSBbXTtcbiAgY29uc3QgZGlyID0gUGF0aC5yZXNvbHZlKGdldFJvb3REaXIoKSwgYGluc3RhbGwtJHtlbnZ9YCk7XG4gIGNvbnN0IHZlcnNpb25zID0gbmV3IE1hcDxzdHJpbmcsIHN0cmluZz4oKTtcblxuICBmb3IgKGNvbnN0IHppcE5hbWUgb2YgZnMucmVhZGRpclN5bmMoZGlyKSkge1xuICAgIGlmICh6aXBOYW1lLmVuZHNXaXRoKCcuemlwJykpIHtcbiAgICAgIGNvbnN0IHppcCA9IG5ldyBBZG1aaXAoUGF0aC5qb2luKGRpciwgemlwTmFtZSkpO1xuICAgICAgY29uc3QgYXBwID0gXy50cmltRW5kKHppcE5hbWUsICcuemlwJyk7XG5cbiAgICAgIGRvbmUucHVzaChuZXcgUHJvbWlzZShyZXNvbHZlID0+IHtcbiAgICAgICAgemlwLnJlYWRBc1RleHRBc3luYyhhcHAgKyAnLmdpdGhhc2gtd2VidWkudHh0JywgZGF0YSA9PiB7XG4gICAgICAgICAgdmVyc2lvbnMuc2V0KGFwcCwgZGF0YSk7XG4gICAgICAgICAgcmVzb2x2ZSgpO1xuICAgICAgICB9KTtcbiAgICAgIH0pKTtcbiAgICB9XG4gIH1cbiAgYXdhaXQgUHJvbWlzZS5hbGwoZG9uZSk7XG4gIHJldHVybiB2ZXJzaW9ucztcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGxpc3RBbGxWZXJzaW9ucygpIHtcbiAgY29uc3QgbWFwID0gbmV3IE1hcDxzdHJpbmcsIFVucGFja1Byb21pc2U8UmV0dXJuVHlwZTx0eXBlb2YgbGlzdFZlcnNpb25zPj4+KCk7XG4gIGNvbnN0IGRvbmUgPSBmcy5yZWFkZGlyU3luYyhnZXRSb290RGlyKCkpXG4gIC5maWx0ZXIoZGlyID0+IHtcbiAgICByZXR1cm4gZGlyLnN0YXJ0c1dpdGgoJ2luc3RhbGwtJykgJiYgZnMuc3RhdFN5bmMoUGF0aC5yZXNvbHZlKGdldFJvb3REaXIoKSwgZGlyKSkuaXNEaXJlY3RvcnkoKTtcbiAgfSlcbiAgLnJlZHVjZSgocHJvbWlzZXMsIGRpcikgPT4ge1xuICAgIGNvbnN0IGVudiA9IC9eaW5zdGFsbC0oW15dKikkLy5leGVjKGRpcikhWzFdO1xuICAgIHByb21pc2VzLnB1c2gobGlzdFZlcnNpb25zKGVudikudGhlbihyZXMgPT4ge1xuICAgICAgICBtYXAuc2V0KGVudiwgcmVzKTtcbiAgICAgIH0pXG4gICAgKTtcbiAgICByZXR1cm4gcHJvbWlzZXM7XG4gIH0sIFtdIGFzIFByb21pc2U8dm9pZD5bXSk7XG5cbiAgYXdhaXQgUHJvbWlzZS5hbGwoZG9uZSk7XG4gIHJldHVybiBtYXA7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBzdHJpbmdpZnlMaXN0VmVyc2lvbnMoZW52OiBzdHJpbmcpIHtcbiAgY29uc3QgcmVzID0gYXdhaXQgbGlzdFZlcnNpb25zKGVudik7XG4gIGxldCBidWYgPSAnJztcbiAgZm9yIChjb25zdCBbYXBwLCBnaXRoYXNoXSBvZiByZXMuZW50cmllcygpKSB7XG4gICAgYnVmICs9IGAgJHtlbnZ9IC0gJHthcHB9XFxuJHtnaXRoYXNofVxcbmA7XG4gICAgYnVmICs9ICdcXG4nO1xuICB9XG4gIHJldHVybiBidWY7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBzdHJpbmdpZnlMaXN0QWxsVmVyc2lvbnMoKSB7XG4gIGNvbnN0IGVudk1hcCA9IGF3YWl0IGxpc3RBbGxWZXJzaW9ucygpO1xuICBsZXQgYnVmID0gJyc7XG4gIGZvciAoY29uc3QgW2VudiwgYXBwSGFzaF0gb2YgZW52TWFwLmVudHJpZXMoKSkge1xuICAgIGZvciAoY29uc3QgW2FwcCwgZ2l0aGFzaF0gb2YgYXBwSGFzaC5lbnRyaWVzKCkpIHtcbiAgICAgIGJ1ZiArPSBgJHtlbnZ9IC0gJHthcHB9XFxuJHtnaXRoYXNoLnJlcGxhY2UoL14vbWcsICcgICcpfVxcbmA7XG4gICAgICBidWYgKz0gJy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXFxuJztcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGJ1Zjtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHdyaXRlTW9ja1ppcCh3cml0ZVRvOiBzdHJpbmcsIGNvbnRlbnQ6IHN0cmluZykge1xuICBjb25zdCB6aXBGaWxlID0gbmV3IFppcEZpbGUoKTtcbiAgY29uc3QgcHJvbSA9IG5ldyBQcm9taXNlKHJlc29sdmUgPT4ge1xuICAgIHppcEZpbGUub3V0cHV0U3RyZWFtLnBpcGUoZnMuY3JlYXRlV3JpdGVTdHJlYW0od3JpdGVUbykpXG4gICAgLm9uKCdjbG9zZScsIHJlc29sdmUpO1xuICB9KTtcblxuICBjb25zdCB0b2RheSA9IGRheWpzKCk7XG4gIGNvbnN0IGZpbGVOYW1lID0gYGZha2UtJHt0b2RheS5mb3JtYXQoJ1lZTU1ERCcpfS0ke3RvZGF5LmZvcm1hdCgnSEhtbXNzJyl9LnR4dGA7XG5cbiAgemlwRmlsZS5hZGRCdWZmZXIoQnVmZmVyLmZyb20oY29udGVudCksIGZpbGVOYW1lKTtcbiAgemlwRmlsZS5lbmQoe2ZvcmNlWmlwNjRGb3JtYXQ6IGZhbHNlfSk7XG4gIHJldHVybiBwcm9tO1xufVxuXG4iXX0=