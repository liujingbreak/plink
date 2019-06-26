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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZHJjcC1jbWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90cy9kcmNwLWNtZC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUNBLGtFQUE4QjtBQUM5QiwwQ0FBNEI7QUFDNUIsNkNBQStCO0FBQy9CLDJDQUE2QjtBQUM3QixtREFBNkM7QUFDN0MsbUNBQWtDO0FBQ2xDLGdFQUFrRDtBQUNsRCxNQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsZUFBZSxDQUFDLENBQUM7QUFDeEMsT0FBTyxDQUFDLGtCQUFrQixDQUFDLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQztBQUV0QyxNQUFNLFlBQVksR0FBRyxPQUFPLENBQUMsZ0NBQWdDLENBQUMsQ0FBQztBQUMvRCw4REFBOEQ7QUFDOUQsTUFBTSxHQUFHLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQUMsQ0FBQztBQUVwRCxTQUFzQixJQUFJLENBQUMsSUFBUzs7UUFDbkMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUMxQixNQUFNLFFBQVEsR0FBc0IsRUFBRSxDQUFDO1FBQ3ZDLGlCQUFpQjtRQUNqQixNQUFNLENBQUMsR0FBRyxJQUFJLHVCQUFDLENBQUMsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxDQUFDO1FBQzdCLE1BQU0sZUFBZSxHQUFpRCxFQUFFLENBQUM7UUFDekUsTUFBTSxlQUFlLEdBQTZCLEVBQUUsQ0FBQztRQUVyRCxhQUFhLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsVUFBUyxHQUFXLEVBQUUsU0FBaUI7WUFDbkYsSUFBSSxDQUFDLFNBQVM7Z0JBQ2IsT0FBTztZQUNSLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxjQUFjLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDO1lBQ3ZGLGVBQWUsQ0FBQyxJQUFJLENBQUMsSUFBSSxHQUFHLEdBQUcsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQztRQUNyRSxDQUFDLENBQUMsQ0FBQztRQUNILE1BQU0sT0FBTyxHQUFHLHVCQUF1QixDQUFDO1FBQ3hDLE1BQU0sV0FBVyxHQUFHLDJCQUEyQixDQUFDO1FBQ2hELFlBQVksQ0FBQyxlQUFlLENBQUMsQ0FBQyxJQUFZLEVBQUUsU0FBaUIsRUFBRSxVQUFrQixFQUFFLElBQVMsRUFBRSxXQUFtQixFQUFFLEVBQUU7WUFDcEgsUUFBUSxDQUFDLElBQUksQ0FDWixDQUFDLENBQUMsR0FBRyxDQUFTLEdBQVMsRUFBRTtnQkFDeEIsSUFBSTtvQkFDSCxNQUFNLE1BQU0sR0FBRyxNQUFNLDRCQUFZLENBQUMsS0FBSyxFQUFFLE1BQU0sRUFBRSxXQUFXLEVBQUUsRUFBQyxNQUFNLEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxFQUFDLENBQUMsQ0FBQztvQkFDN0csTUFBTSxNQUFNLEdBQUcsTUFBTSxDQUFDLE9BQU8sQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO29CQUNqRCxPQUFPLENBQUMsU0FBUyxHQUFHLE1BQU0sQ0FBQztvQkFDM0IsSUFBSSxPQUFPLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztvQkFDbkMsTUFBTSxJQUFJLEdBQUcsT0FBTyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQztvQkFDaEQsV0FBVyxDQUFDLFNBQVMsR0FBRyxPQUFPLENBQUMsU0FBUyxDQUFDO29CQUUxQyxPQUFPLEdBQUcsV0FBVyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztvQkFDbkMsTUFBTSxPQUFPLEdBQUcsT0FBTyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLGdCQUFnQixDQUFDO29CQUN4RCxlQUFlLENBQUMsSUFBSSxDQUFDLEdBQUcsYUFBYSxHQUFHLE9BQU8sQ0FBQztvQkFDaEQsR0FBRyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztvQkFDakIsT0FBTyxNQUFNLENBQUM7aUJBQ2Q7Z0JBQUMsT0FBTyxDQUFDLEVBQUU7b0JBQ1gsYUFBYSxDQUFDLElBQUksQ0FBQyxJQUFJLEdBQUcsR0FBRyxHQUFHLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLENBQUM7b0JBQ2pELE9BQU8sRUFBRSxDQUFDO2lCQUNWO1lBQ0YsQ0FBQyxDQUFBLENBQUMsQ0FBQyxDQUFDO1FBQ04sQ0FBQyxFQUFFLEtBQUssRUFBRSxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUM7UUFFM0IsU0FBUyxhQUFhLENBQUMsV0FBbUIsRUFBRSxDQUFRO1lBQ25ELElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxPQUFPLElBQUksQ0FBQyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsa0JBQWtCLENBQUMsR0FBRyxDQUFDO2dCQUM5RCxHQUFHLENBQUMsSUFBSSxDQUFDLFdBQVcsR0FBRyxVQUFVLENBQUMsQ0FBQzs7Z0JBRW5DLEdBQUcsQ0FBQyxLQUFLLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQzVCLENBQUM7UUFDRCxNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDNUIsQ0FBQyxDQUFDLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQyxRQUFRLEVBQUUsTUFBTSxFQUFFLEVBQUU7WUFDNUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQyxHQUFHLEVBQUUsSUFBSSxFQUFFLEVBQUU7Z0JBQzlCLFFBQVEsQ0FBQyxJQUFJLENBQUMsR0FBRyxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDeEMsQ0FBQyxDQUFDLENBQUM7WUFDSCxzQ0FBc0M7WUFDdEMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxpQkFBUyxDQUFDLFNBQVMsR0FBRyxNQUFNLEdBQUcsa0VBQWtFLENBQUMsQ0FBQyxDQUFDO1lBQ2hILHNDQUFzQztZQUN0QyxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsUUFBUSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBQ25ELENBQUMsQ0FBQyxDQUFDO1FBQ0gsc0NBQXNDO1FBQ3RDLE9BQU8sQ0FBQyxHQUFHLENBQUMsaUJBQVMsQ0FBQyxzQ0FBc0MsSUFBSSxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUMxRixDQUFDO0NBQUE7QUF6REQsb0JBeURDIiwic291cmNlc0NvbnRlbnQiOlsiXG5pbXBvcnQgUSBmcm9tICdwcm9taXNlLXF1ZXVlJztcbmltcG9ydCAqIGFzIF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzLWV4dHJhJztcbmltcG9ydCAqIGFzIFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQge3Byb21pc2lmeUV4ZX0gZnJvbSAnLi9wcm9jZXNzLXV0aWxzJztcbmltcG9ydCB7Ym94U3RyaW5nfSBmcm9tICcuL3V0aWxzJztcbmltcG9ydCAqIGFzIHJlY2lwZU1hbmFnZXIgZnJvbSAnLi9yZWNpcGUtbWFuYWdlcic7XG5jb25zdCBjb25maWcgPSByZXF1aXJlKCcuLi9saWIvY29uZmlnJyk7XG5yZXF1aXJlKCcuLi9saWIvbG9nQ29uZmlnJykoY29uZmlnKCkpO1xuXG5jb25zdCBwYWNrYWdlVXRpbHMgPSByZXF1aXJlKCcuLi9saWIvcGFja2FnZU1nci9wYWNrYWdlVXRpbHMnKTtcbi8vIGNvbnN0IHJlY2lwZU1hbmFnZXIgPSByZXF1aXJlKCcuLi9saWIvZ3VscC9yZWNpcGVNYW5hZ2VyJyk7XG5jb25zdCBsb2cgPSByZXF1aXJlKCdsb2c0anMnKS5nZXRMb2dnZXIoJ2RyY3AtY21kJyk7XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBwYWNrKGFyZ3Y6IGFueSkge1xuXHRmcy5ta2RpcnBTeW5jKCd0YXJiYWxscycpO1xuXHRjb25zdCBwcm9taXNlczogUHJvbWlzZTxzdHJpbmc+W10gPSBbXTtcblx0Ly8gdmFyIGNvdW50ID0gMDtcblx0Y29uc3QgcSA9IG5ldyBRKDUsIEluZmluaXR5KTtcblx0Y29uc3QgcmVjaXBlMnBhY2thZ2VzOiB7W3JlY2lwZTogc3RyaW5nXToge1tuYW1lOiBzdHJpbmddOiBzdHJpbmd9fSA9IHt9O1xuXHRjb25zdCBwYWNrYWdlMnRhcmJhbGw6IHtbbmFtZTogc3RyaW5nXTogc3RyaW5nfSA9IHt9O1xuXG5cdHJlY2lwZU1hbmFnZXIuZWFjaFJlY2lwZVNyYyhhcmd2LnByb2plY3REaXIsIGZ1bmN0aW9uKHNyYzogc3RyaW5nLCByZWNpcGVEaXI6IHN0cmluZykge1xuXHRcdGlmICghcmVjaXBlRGlyKVxuXHRcdFx0cmV0dXJuO1xuXHRcdGNvbnN0IGRhdGEgPSBKU09OLnBhcnNlKGZzLnJlYWRGaWxlU3luYyhQYXRoLmpvaW4ocmVjaXBlRGlyLCAncGFja2FnZS5qc29uJyksICd1dGY4JykpO1xuXHRcdHJlY2lwZTJwYWNrYWdlc1tkYXRhLm5hbWUgKyAnQCcgKyBkYXRhLnZlcnNpb25dID0gZGF0YS5kZXBlbmRlbmNpZXM7XG5cdH0pO1xuXHRjb25zdCBuYW1lUGF0ID0gL25hbWU6XFxzKyhbXiBcXG5cXHJdKykvbWk7XG5cdGNvbnN0IGZpbGVOYW1lUGF0ID0gL2ZpbGVuYW1lOlxccysoW14gXFxuXFxyXSspL21pO1xuXHRwYWNrYWdlVXRpbHMuZmluZEFsbFBhY2thZ2VzKChuYW1lOiBzdHJpbmcsIGVudHJ5UGF0aDogc3RyaW5nLCBwYXJzZWROYW1lOiBzdHJpbmcsIGpzb246IGFueSwgcGFja2FnZVBhdGg6IHN0cmluZykgPT4ge1xuXHRcdHByb21pc2VzLnB1c2goXG5cdFx0XHRxLmFkZDxzdHJpbmc+KGFzeW5jICgpID0+IHtcblx0XHRcdFx0dHJ5IHtcblx0XHRcdFx0XHRjb25zdCBvdXRwdXQgPSBhd2FpdCBwcm9taXNpZnlFeGUoJ25wbScsICdwYWNrJywgcGFja2FnZVBhdGgsIHtzaWxlbnQ6IHRydWUsIGN3ZDogUGF0aC5yZXNvbHZlKCd0YXJiYWxscycpfSk7XG5cdFx0XHRcdFx0Y29uc3Qgb2Zmc2V0ID0gb3V0cHV0LmluZGV4T2YoJ1RhcmJhbGwgRGV0YWlscycpO1xuXHRcdFx0XHRcdG5hbWVQYXQubGFzdEluZGV4ID0gb2Zmc2V0O1xuXHRcdFx0XHRcdGxldCBleGVjUmVzID0gbmFtZVBhdC5leGVjKG91dHB1dCk7XG5cdFx0XHRcdFx0Y29uc3QgbmFtZSA9IGV4ZWNSZXMgPyBleGVjUmVzWzFdIDogJzx1bmtub3duPic7XG5cdFx0XHRcdFx0ZmlsZU5hbWVQYXQubGFzdEluZGV4ID0gbmFtZVBhdC5sYXN0SW5kZXg7XG5cblx0XHRcdFx0XHRleGVjUmVzID0gZmlsZU5hbWVQYXQuZXhlYyhvdXRwdXQpO1xuXHRcdFx0XHRcdGNvbnN0IHRhcmJhbGwgPSBleGVjUmVzID8gZXhlY1Jlc1sxXSA6ICc8dW5rbm93biBmaWxlPic7XG5cdFx0XHRcdFx0cGFja2FnZTJ0YXJiYWxsW25hbWVdID0gJy4vdGFyYmFsbHMvJyArIHRhcmJhbGw7XG5cdFx0XHRcdFx0bG9nLmluZm8ob3V0cHV0KTtcblx0XHRcdFx0XHRyZXR1cm4gb3V0cHV0O1xuXHRcdFx0XHR9IGNhdGNoIChlKSB7XG5cdFx0XHRcdFx0aGFuZGxlRXhwdGlvbihqc29uLm5hbWUgKyAnQCcgKyBqc29uLnZlcnNpb24sIGUpO1xuXHRcdFx0XHRcdHJldHVybiAnJztcblx0XHRcdFx0fVxuXHRcdFx0fSkpO1xuXHR9LCAnc3JjJywgYXJndi5wcm9qZWN0RGlyKTtcblxuXHRmdW5jdGlvbiBoYW5kbGVFeHB0aW9uKHBhY2thZ2VOYW1lOiBzdHJpbmcsIGU6IEVycm9yKSB7XG5cdFx0aWYgKGUgJiYgZS5tZXNzYWdlICYmIGUubWVzc2FnZS5pbmRleE9mKCdFUFVCTElTSENPTkZMSUNUJykgPiAwKVxuXHRcdFx0bG9nLmluZm8ocGFja2FnZU5hbWUgKyAnIGV4aXN0cy4nKTtcblx0XHRlbHNlXG5cdFx0XHRsb2cuZXJyb3IocGFja2FnZU5hbWUsIGUpO1xuXHR9XG5cdGF3YWl0IFByb21pc2UuYWxsKHByb21pc2VzKTtcblx0Xy5lYWNoKHJlY2lwZTJwYWNrYWdlcywgKHBhY2thZ2VzLCByZWNpcGUpID0+IHtcblx0XHRfLmVhY2gocGFja2FnZXMsICh2ZXIsIG5hbWUpID0+IHtcblx0XHRcdHBhY2thZ2VzW25hbWVdID0gcGFja2FnZTJ0YXJiYWxsW25hbWVdO1xuXHRcdH0pO1xuXHRcdC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpuby1jb25zb2xlXG5cdFx0Y29uc29sZS5sb2coYm94U3RyaW5nKCdyZWNpcGU6JyArIHJlY2lwZSArICcsIHlvdSBuZWVkIHRvIGNvcHkgZm9sbG93aW5nIGRlcGVuZGVuY2llcyB0byB5b3VyIHBhY2thZ2UuanNvblxcbicpKTtcblx0XHQvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6bm8tY29uc29sZVxuXHRcdGNvbnNvbGUubG9nKEpTT04uc3RyaW5naWZ5KHBhY2thZ2VzLCBudWxsLCAnICAnKSk7XG5cdH0pO1xuXHQvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6bm8tY29uc29sZVxuXHRjb25zb2xlLmxvZyhib3hTdHJpbmcoYFRhcmJhbGwgZmlsZXMgaGF2ZSBiZWVuIHdyaXR0ZW4gdG8gJHtQYXRoLnJlc29sdmUoJ3RhcmJhbGxzJyl9YCkpO1xufVxuIl19