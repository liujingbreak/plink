"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const promise_queue_1 = __importDefault(require("promise-queue"));
const _ = __importStar(require("lodash"));
const fs = __importStar(require("fs-extra"));
const Path = __importStar(require("path"));
const process_utils_1 = require("./process-utils");
const utils_1 = require("./utils");
const recipeManager = __importStar(require("./recipe-manager"));
const config = require('../lib/config');
require('../lib/logConfig')(config());
const packageUtils = require('../lib/packageMgr/packageUtils');
// const recipeManager = require('../lib/gulp/recipeManager');
const log = require('log4js').getLogger('drcp-cmd');
function pack(argv) {
    return __awaiter(this, void 0, void 0, function* () {
        fs.mkdirpSync('tarballs');
        const promises = [];
        // var count = 0;
        const q = new promise_queue_1.default(5, Infinity);
        const recipe2packages = {};
        const package2tarball = {};
        recipeManager.eachRecipeSrc(argv.projectDir, function (src, recipeDir) {
            if (!recipeDir)
                return;
            const data = JSON.parse(fs.readFileSync(Path.join(recipeDir, 'package.json'), 'utf8'));
            recipe2packages[data.name + '@' + data.version] = data.dependencies;
        });
        const namePat = /name:\s+([^ \n\r]+)/mi;
        const fileNamePat = /filename:\s+([^ \n\r]+)/mi;
        // tslint:disable-next-line: max-line-length
        packageUtils.findAllPackages((name, entryPath, parsedName, json, packagePath) => {
            promises.push(q.add(() => __awaiter(this, void 0, void 0, function* () {
                try {
                    const output = yield process_utils_1.promisifyExe('npm', 'pack', packagePath, { silent: true, cwd: Path.resolve('tarballs') });
                    const offset = output.indexOf('Tarball Details');
                    namePat.lastIndex = offset;
                    let execRes = namePat.exec(output);
                    const name = execRes ? execRes[1] : '<unknown>';
                    fileNamePat.lastIndex = namePat.lastIndex;
                    execRes = fileNamePat.exec(output);
                    const tarball = execRes ? execRes[1] : '<unknown file>';
                    package2tarball[name] = './tarballs/' + tarball;
                    log.info(output);
                    return output;
                }
                catch (e) {
                    handleExption(json.name + '@' + json.version, e);
                    return '';
                }
            })));
        }, 'src', argv.projectDir);
        function handleExption(packageName, e) {
            if (e && e.message && e.message.indexOf('EPUBLISHCONFLICT') > 0)
                log.info(packageName + ' exists.');
            else
                log.error(packageName, e);
        }
        yield Promise.all(promises);
        _.each(recipe2packages, (packages, recipe) => {
            _.each(packages, (ver, name) => {
                packages[name] = package2tarball[name];
            });
            // tslint:disable-next-line:no-console
            console.log(utils_1.boxString('recipe:' + recipe + ', you need to copy following dependencies to your package.json\n'));
            // tslint:disable-next-line:no-console
            console.log(JSON.stringify(packages, null, '  '));
        });
        // tslint:disable-next-line:no-console
        console.log(utils_1.boxString(`Tarball files have been written to ${Path.resolve('tarballs')}`));
    });
}
exports.pack = pack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZHJjcC1jbWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90cy9kcmNwLWNtZC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUNBLGtFQUE4QjtBQUM5QiwwQ0FBNEI7QUFDNUIsNkNBQStCO0FBQy9CLDJDQUE2QjtBQUM3QixtREFBNkM7QUFDN0MsbUNBQWtDO0FBQ2xDLGdFQUFrRDtBQUNsRCxNQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsZUFBZSxDQUFDLENBQUM7QUFDeEMsT0FBTyxDQUFDLGtCQUFrQixDQUFDLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQztBQUV0QyxNQUFNLFlBQVksR0FBRyxPQUFPLENBQUMsZ0NBQWdDLENBQUMsQ0FBQztBQUMvRCw4REFBOEQ7QUFDOUQsTUFBTSxHQUFHLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQUMsQ0FBQztBQUVwRCxTQUFzQixJQUFJLENBQUMsSUFBUzs7UUFDbEMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUMxQixNQUFNLFFBQVEsR0FBc0IsRUFBRSxDQUFDO1FBQ3ZDLGlCQUFpQjtRQUNqQixNQUFNLENBQUMsR0FBRyxJQUFJLHVCQUFDLENBQUMsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxDQUFDO1FBQzdCLE1BQU0sZUFBZSxHQUFpRCxFQUFFLENBQUM7UUFDekUsTUFBTSxlQUFlLEdBQTZCLEVBQUUsQ0FBQztRQUVyRCxhQUFhLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsVUFBUyxHQUFXLEVBQUUsU0FBaUI7WUFDbEYsSUFBSSxDQUFDLFNBQVM7Z0JBQ1osT0FBTztZQUNULE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxjQUFjLENBQUMsRUFBRSxNQUFNLENBQUMs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QUMsaUJBQVMsQ0FBQyxTQUFTLEdBQUcsTUFBTSxHQUFHLGtFQUFrRSxDQUFDLENBQUMsQ0FBQztZQUNoSCxzQ0FBc0M7WUFDdEMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLFFBQVEsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUNwRCxDQUFDLENBQUMsQ0FBQztRQUNILHNDQUFzQztRQUN0QyxPQUFPLENBQUMsR0FBRyxDQUFDLGlCQUFTLENBQUMsc0NBQXNDLElBQUksQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDM0YsQ0FBQztDQUFBO0FBMURELG9CQTBEQyIsInNvdXJjZXNDb250ZW50IjpbIlxuaW1wb3J0IFEgZnJvbSAncHJvbWlzZS1xdWV1ZSc7XG5pbXBvcnQgKiBhcyBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcy1leHRyYSc7XG5pbXBvcnQgKiBhcyBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHtwcm9taXNpZnlFeGV9IGZyb20gJy4vcHJvY2Vzcy11dGlscyc7XG5pbXBvcnQge2JveFN0cmluZ30gZnJvbSAnLi91dGlscyc7XG5pbXBvcnQgKiBhcyByZWNpcGVNYW5hZ2VyIGZyb20gJy4vcmVjaXBlLW1hbmFnZXInO1xuY29uc3QgY29uZmlnID0gcmVxdWlyZSgnLi4vbGliL2NvbmZpZycpO1xucmVxdWlyZSgnLi4vbGliL2xvZ0NvbmZpZycpKGNvbmZpZygpKTtcblxuY29uc3QgcGFja2FnZVV0aWxzID0gcmVxdWlyZSgnLi4vbGliL3BhY2thZ2VNZ3IvcGFja2FnZVV0aWxzJyk7XG4vLyBjb25zdCByZWNpcGVNYW5hZ2VyID0gcmVxdWlyZSgnLi4vbGliL2d1bHAvcmVjaXBlTWFuYWdlcicpO1xuY29uc3QgbG9nID0gcmVxdWlyZSgnbG9nNGpzJykuZ2V0TG9nZ2VyKCdkcmNwLWNtZCcpO1xuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcGFjayhhcmd2OiBhbnkpIHtcbiAgZnMubWtkaXJwU3luYygndGFyYmFsbHMnKTtcbiAgY29uc3QgcHJvbWlzZXM6IFByb21pc2U8c3RyaW5nPltdID0gW107XG4gIC8vIHZhciBjb3VudCA9IDA7XG4gIGNvbnN0IHEgPSBuZXcgUSg1LCBJbmZpbml0eSk7XG4gIGNvbnN0IHJlY2lwZTJwYWNrYWdlczoge1tyZWNpcGU6IHN0cmluZ106IHtbbmFtZTogc3RyaW5nXTogc3RyaW5nfX0gPSB7fTtcbiAgY29uc3QgcGFja2FnZTJ0YXJiYWxsOiB7W25hbWU6IHN0cmluZ106IHN0cmluZ30gPSB7fTtcblxuICByZWNpcGVNYW5hZ2VyLmVhY2hSZWNpcGVTcmMoYXJndi5wcm9qZWN0RGlyLCBmdW5jdGlvbihzcmM6IHN0cmluZywgcmVjaXBlRGlyOiBzdHJpbmcpIHtcbiAgICBpZiAoIXJlY2lwZURpcilcbiAgICAgIHJldHVybjtcbiAgICBjb25zdCBkYXRhID0gSlNPTi5wYXJzZShmcy5yZWFkRmlsZVN5bmMoUGF0aC5qb2luKHJlY2lwZURpciwgJ3BhY2thZ2UuanNvbicpLCAndXRmOCcpKTtcbiAgICByZWNpcGUycGFja2FnZXNbZGF0YS5uYW1lICsgJ0AnICsgZGF0YS52ZXJzaW9uXSA9IGRhdGEuZGVwZW5kZW5jaWVzO1xuICB9KTtcbiAgY29uc3QgbmFtZVBhdCA9IC9uYW1lOlxccysoW14gXFxuXFxyXSspL21pO1xuICBjb25zdCBmaWxlTmFtZVBhdCA9IC9maWxlbmFtZTpcXHMrKFteIFxcblxccl0rKS9taTtcbiAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBtYXgtbGluZS1sZW5ndGhcbiAgcGFja2FnZVV0aWxzLmZpbmRBbGxQYWNrYWdlcygobmFtZTogc3RyaW5nLCBlbnRyeVBhdGg6IHN0cmluZywgcGFyc2VkTmFtZTogc3RyaW5nLCBqc29uOiBhbnksIHBhY2thZ2VQYXRoOiBzdHJpbmcpID0+IHtcbiAgICBwcm9taXNlcy5wdXNoKFxuICAgICAgcS5hZGQ8c3RyaW5nPihhc3luYyAoKSA9PiB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgY29uc3Qgb3V0cHV0ID0gYXdhaXQgcHJvbWlzaWZ5RXhlKCducG0nLCAncGFjaycsIHBhY2thZ2VQYXRoLCB7c2lsZW50OiB0cnVlLCBjd2Q6IFBhdGgucmVzb2x2ZSgndGFyYmFsbHMnKX0pO1xuICAgICAgICAgIGNvbnN0IG9mZnNldCA9IG91dHB1dC5pbmRleE9mKCdUYXJiYWxsIERldGFpbHMnKTtcbiAgICAgICAgICBuYW1lUGF0Lmxhc3RJbmRleCA9IG9mZnNldDtcbiAgICAgICAgICBsZXQgZXhlY1JlcyA9IG5hbWVQYXQuZXhlYyhvdXRwdXQpO1xuICAgICAgICAgIGNvbnN0IG5hbWUgPSBleGVjUmVzID8gZXhlY1Jlc1sxXSA6ICc8dW5rbm93bj4nO1xuICAgICAgICAgIGZpbGVOYW1lUGF0Lmxhc3RJbmRleCA9IG5hbWVQYXQubGFzdEluZGV4O1xuXG4gICAgICAgICAgZXhlY1JlcyA9IGZpbGVOYW1lUGF0LmV4ZWMob3V0cHV0KTtcbiAgICAgICAgICBjb25zdCB0YXJiYWxsID0gZXhlY1JlcyA/IGV4ZWNSZXNbMV0gOiAnPHVua25vd24gZmlsZT4nO1xuICAgICAgICAgIHBhY2thZ2UydGFyYmFsbFtuYW1lXSA9ICcuL3RhcmJhbGxzLycgKyB0YXJiYWxsO1xuICAgICAgICAgIGxvZy5pbmZvKG91dHB1dCk7XG4gICAgICAgICAgcmV0dXJuIG91dHB1dDtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgIGhhbmRsZUV4cHRpb24oanNvbi5uYW1lICsgJ0AnICsganNvbi52ZXJzaW9uLCBlKTtcbiAgICAgICAgICByZXR1cm4gJyc7XG4gICAgICAgIH1cbiAgICAgIH0pKTtcbiAgfSwgJ3NyYycsIGFyZ3YucHJvamVjdERpcik7XG5cbiAgZnVuY3Rpb24gaGFuZGxlRXhwdGlvbihwYWNrYWdlTmFtZTogc3RyaW5nLCBlOiBFcnJvcikge1xuICAgIGlmIChlICYmIGUubWVzc2FnZSAmJiBlLm1lc3NhZ2UuaW5kZXhPZignRVBVQkxJU0hDT05GTElDVCcpID4gMClcbiAgICAgIGxvZy5pbmZvKHBhY2thZ2VOYW1lICsgJyBleGlzdHMuJyk7XG4gICAgZWxzZVxuICAgICAgbG9nLmVycm9yKHBhY2thZ2VOYW1lLCBlKTtcbiAgfVxuICBhd2FpdCBQcm9taXNlLmFsbChwcm9taXNlcyk7XG4gIF8uZWFjaChyZWNpcGUycGFja2FnZXMsIChwYWNrYWdlcywgcmVjaXBlKSA9PiB7XG4gICAgXy5lYWNoKHBhY2thZ2VzLCAodmVyLCBuYW1lKSA9PiB7XG4gICAgICBwYWNrYWdlc1tuYW1lXSA9IHBhY2thZ2UydGFyYmFsbFtuYW1lXTtcbiAgICB9KTtcbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6bm8tY29uc29sZVxuICAgIGNvbnNvbGUubG9nKGJveFN0cmluZygncmVjaXBlOicgKyByZWNpcGUgKyAnLCB5b3UgbmVlZCB0byBjb3B5IGZvbGxvd2luZyBkZXBlbmRlbmNpZXMgdG8geW91ciBwYWNrYWdlLmpzb25cXG4nKSk7XG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm5vLWNvbnNvbGVcbiAgICBjb25zb2xlLmxvZyhKU09OLnN0cmluZ2lmeShwYWNrYWdlcywgbnVsbCwgJyAgJykpO1xuICB9KTtcbiAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm5vLWNvbnNvbGVcbiAgY29uc29sZS5sb2coYm94U3RyaW5nKGBUYXJiYWxsIGZpbGVzIGhhdmUgYmVlbiB3cml0dGVuIHRvICR7UGF0aC5yZXNvbHZlKCd0YXJiYWxscycpfWApKTtcbn1cbiJdfQ==