"use strict";
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
exports.scanTran = void 0;
// import {config} from '@wfh/plink';
const __plink_1 = __importDefault(require("__plink"));
const fs_1 = __importDefault(require("fs"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const glob_1 = __importDefault(require("glob"));
const thread_promise_pool_1 = require("@wfh/thread-promise-pool");
const misc_1 = require("@wfh/plink/wfh/dist/utils/misc");
function scanTran(dir, metaDir) {
    return __awaiter(this, void 0, void 0, function* () {
        // let transByFile: {[file: string]: Translatables[]};
        if (metaDir == null) {
            const pkg = __plink_1.default.findPackageByFile(dir);
            if (pkg == null) {
                throw new Error(`${dir} is not inside any of linked source package, you have to specify a metadata output directory`);
            }
            metaDir = path_1.default.resolve(pkg.realPath, misc_1.getTscConfigOfPkg(pkg.json).srcDir, 'i18n');
        }
        if (!fs_1.default.existsSync(metaDir)) {
            fs_extra_1.default.mkdirpSync(metaDir);
        }
        if (!fs_1.default.statSync(dir).isDirectory()) {
            __plink_1.default.logger.error(`${dir} is not a directory`);
            return;
        }
        let files = yield new Promise((resolve, reject) => {
            const pattern = path_1.default.relative(process.cwd(), dir).replace(/\\/g, '/') + '/**/*.{ts,tsx,js,jsx}';
            glob_1.default(pattern, { cwd: process.cwd(), nodir: true }, (err, matches) => {
                if (err) {
                    return reject(err);
                }
                resolve(matches);
            });
        });
        __plink_1.default.logger.info(`Found total ${files.length}`);
        const pool = new thread_promise_pool_1.Pool();
        yield Promise.all(files.map((file) => __awaiter(this, void 0, void 0, function* () {
            try {
                const relPath = path_1.default.relative(dir, file);
                const metadataFile = path_1.default.resolve(metaDir, relPath.replace(/\.[^./\\]+$/g, '.yaml'));
                yield pool.submit({
                    file: path_1.default.resolve(__dirname, 'cli-scan-tran-worker.js'),
                    exportFn: 'scanFile',
                    args: [file, metadataFile]
                });
            }
            catch (ex) {
                __plink_1.default.logger.error(ex);
            }
        })));
        // fsext.mkdirpSync(Path.dirname(output));
        // fs.promises.writeFile(output, JSON.stringify(transByFile, null, '  '));
        // plink.logger.info(output + ' is ' + (oldMetaFileExits ? 'updated' : 'written'));
    });
}
exports.scanTran = scanTran;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLXNjYW4tdHJhbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImNsaS1zY2FuLXRyYW4udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7O0FBQUEscUNBQXFDO0FBQ3JDLHNEQUE0QjtBQUM1Qiw0Q0FBb0I7QUFDcEIsd0RBQTZCO0FBQzdCLGdEQUF3QjtBQUN4QixnREFBd0I7QUFDeEIsa0VBQThDO0FBQzlDLHlEQUFpRTtBQXVCakUsU0FBc0IsUUFBUSxDQUFDLEdBQVcsRUFBRSxPQUFnQjs7UUFDMUQsc0RBQXNEO1FBQ3RELElBQUksT0FBTyxJQUFJLElBQUksRUFBRTtZQUNuQixNQUFNLEdBQUcsR0FBRyxpQkFBSyxDQUFDLGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQ3pDLElBQUksR0FBRyxJQUFJLElBQUksRUFBRTtnQkFDZixNQUFNLElBQUksS0FBSyxDQUFDLEdBQUcsR0FBRyw4RkFBOEYsQ0FBQyxDQUFDO2FBQ3ZIO1lBQ0QsT0FBTyxHQUFHLGNBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSx3QkFBaUIsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1NBQ2xGO1FBRUQsSUFBSSxDQUFDLFlBQUUsQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLEVBQUU7WUFDM0Isa0JBQUssQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLENBQUM7U0FDM0I7UUFFRCxJQUFJLENBQUMsWUFBRSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxXQUFXLEVBQUUsRUFBRTtZQUNuQyxpQkFBSyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsR0FBRyxHQUFHLHFCQUFxQixDQUFDLENBQUM7WUFDaEQsT0FBTztTQUNSO1FBQ0QsSUFBSSxLQUFLLEdBQUcsTUFBTSxJQUFJLE9BQU8sQ0FBVyxDQUFDLE9BQU8sRUFBRSxNQUFNLEVBQUUsRUFBRTtZQUMxRCxNQUFNLE9BQU8sR0FBRyxjQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsRUFBRSxHQUFHLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxHQUFHLHVCQUF1QixDQUFDO1lBRWhHLGNBQUksQ0FBQyxPQUFPLEVBQUUsRUFBQyxHQUFHLEVBQUUsT0FBTyxDQUFDLEdBQUcsRUFBRSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUMsRUFBRSxDQUFDLEdBQUcsRUFBRSxPQUFPLEVBQUUsRUFBRTtnQkFDaEUsSUFBSSxHQUFHLEVBQUU7b0JBQ1AsT0FBTyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUM7aUJBQ3BCO2dCQUNELE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUNuQixDQUFDLENBQUMsQ0FBQztRQUNMLENBQUMsQ0FBQyxDQUFDO1FBRUgsaUJBQUssQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLGVBQWUsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUM7UUFDakQsTUFBTSxJQUFJLEdBQUcsSUFBSSwwQkFBSSxFQUFFLENBQUM7UUFFeEIsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBTSxJQUFJLEVBQUMsRUFBRTtZQUN2QyxJQUFJO2dCQUNGLE1BQU0sT0FBTyxHQUFHLGNBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxDQUFDO2dCQUN6QyxNQUFNLFlBQVksR0FBRyxjQUFJLENBQUMsT0FBTyxDQUFDLE9BQVEsRUFBRSxPQUFPLENBQUMsT0FBTyxDQUFDLGNBQWMsRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDO2dCQUN0RixNQUFNLElBQUksQ0FBQyxNQUFNLENBQWU7b0JBQzlCLElBQUksRUFBRSxjQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSx5QkFBeUIsQ0FBQztvQkFDeEQsUUFBUSxFQUFFLFVBQVU7b0JBQ3BCLElBQUksRUFBRSxDQUFDLElBQUksRUFBRSxZQUFZLENBQUM7aUJBQzNCLENBQUMsQ0FBQzthQUNKO1lBQUMsT0FBTyxFQUFFLEVBQUU7Z0JBQ1gsaUJBQUssQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDO2FBQ3hCO1FBQ0gsQ0FBQyxDQUFBLENBQUMsQ0FBQyxDQUFDO1FBR0osMENBQTBDO1FBQzFDLDBFQUEwRTtRQUMxRSxtRkFBbUY7SUFDckYsQ0FBQztDQUFBO0FBbERELDRCQWtEQyIsInNvdXJjZXNDb250ZW50IjpbIi8vIGltcG9ydCB7Y29uZmlnfSBmcm9tICdAd2ZoL3BsaW5rJztcbmltcG9ydCBwbGluayBmcm9tICdfX3BsaW5rJztcbmltcG9ydCBmcyBmcm9tICdmcyc7XG5pbXBvcnQgZnNleHQgZnJvbSAnZnMtZXh0cmEnO1xuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgZ2xvYiBmcm9tICdnbG9iJztcbmltcG9ydCB7UG9vbH0gZnJvbSAnQHdmaC90aHJlYWQtcHJvbWlzZS1wb29sJztcbmltcG9ydCB7Z2V0VHNjQ29uZmlnT2ZQa2d9IGZyb20gJ0B3ZmgvcGxpbmsvd2ZoL2Rpc3QvdXRpbHMvbWlzYyc7XG4vLyBDaGFsayBpcyB1c2VmdWwgZm9yIHByaW50aW5nIGNvbG9yZnVsIHRleHQgaW4gYSB0ZXJtaW5hbFxuLy8gaW1wb3J0IGNoYWxrIGZyb20gJ2NoYWxrJztcblxuZXhwb3J0IGludGVyZmFjZSBUcmFuc2xhdGFibGUge1xuICBrZXk6IHN0cmluZztcbiAgdGV4dDogc3RyaW5nIHwgbnVsbDtcbiAgc3RhcnQ6IG51bWJlcjtcbiAgZW5kOiBudW1iZXI7XG4gIGRlc2M6IHN0cmluZztcbn1cblxuZXhwb3J0IHR5cGUgU3RyaW5nSW5mbyA9IFtcbiAgc3RhcnQ6IG51bWJlcixcbiAgZW5kOiBudW1iZXIsXG4gIHRleHQ6IHN0cmluZyxcbiAgLyoqIDEgYmFzZWQgKi9cbiAgbGluZTogbnVtYmVyLFxuICAvKiogMSBiYXNlZCAqL1xuICBjb2w6IG51bWJlcixcbiAgdHlwZTogc3RyaW5nXG5dO1xuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gc2NhblRyYW4oZGlyOiBzdHJpbmcsIG1ldGFEaXI/OiBzdHJpbmcpIHtcbiAgLy8gbGV0IHRyYW5zQnlGaWxlOiB7W2ZpbGU6IHN0cmluZ106IFRyYW5zbGF0YWJsZXNbXX07XG4gIGlmIChtZXRhRGlyID09IG51bGwpIHtcbiAgICBjb25zdCBwa2cgPSBwbGluay5maW5kUGFja2FnZUJ5RmlsZShkaXIpO1xuICAgIGlmIChwa2cgPT0gbnVsbCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGAke2Rpcn0gaXMgbm90IGluc2lkZSBhbnkgb2YgbGlua2VkIHNvdXJjZSBwYWNrYWdlLCB5b3UgaGF2ZSB0byBzcGVjaWZ5IGEgbWV0YWRhdGEgb3V0cHV0IGRpcmVjdG9yeWApO1xuICAgIH1cbiAgICBtZXRhRGlyID0gUGF0aC5yZXNvbHZlKHBrZy5yZWFsUGF0aCwgZ2V0VHNjQ29uZmlnT2ZQa2cocGtnLmpzb24pLnNyY0RpciwgJ2kxOG4nKTtcbiAgfVxuXG4gIGlmICghZnMuZXhpc3RzU3luYyhtZXRhRGlyKSkge1xuICAgIGZzZXh0Lm1rZGlycFN5bmMobWV0YURpcik7XG4gIH1cblxuICBpZiAoIWZzLnN0YXRTeW5jKGRpcikuaXNEaXJlY3RvcnkoKSkge1xuICAgIHBsaW5rLmxvZ2dlci5lcnJvcihgJHtkaXJ9IGlzIG5vdCBhIGRpcmVjdG9yeWApO1xuICAgIHJldHVybjtcbiAgfVxuICBsZXQgZmlsZXMgPSBhd2FpdCBuZXcgUHJvbWlzZTxzdHJpbmdbXT4oKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgIGNvbnN0IHBhdHRlcm4gPSBQYXRoLnJlbGF0aXZlKHByb2Nlc3MuY3dkKCksIGRpcikucmVwbGFjZSgvXFxcXC9nLCAnLycpICsgJy8qKi8qLnt0cyx0c3gsanMsanN4fSc7XG5cbiAgICBnbG9iKHBhdHRlcm4sIHtjd2Q6IHByb2Nlc3MuY3dkKCksIG5vZGlyOiB0cnVlfSwgKGVyciwgbWF0Y2hlcykgPT4ge1xuICAgICAgaWYgKGVycikge1xuICAgICAgICByZXR1cm4gcmVqZWN0KGVycik7XG4gICAgICB9XG4gICAgICByZXNvbHZlKG1hdGNoZXMpO1xuICAgIH0pO1xuICB9KTtcblxuICBwbGluay5sb2dnZXIuaW5mbyhgRm91bmQgdG90YWwgJHtmaWxlcy5sZW5ndGh9YCk7XG4gIGNvbnN0IHBvb2wgPSBuZXcgUG9vbCgpO1xuXG4gIGF3YWl0IFByb21pc2UuYWxsKGZpbGVzLm1hcChhc3luYyBmaWxlID0+IHtcbiAgICB0cnkge1xuICAgICAgY29uc3QgcmVsUGF0aCA9IFBhdGgucmVsYXRpdmUoZGlyLCBmaWxlKTtcbiAgICAgIGNvbnN0IG1ldGFkYXRhRmlsZSA9IFBhdGgucmVzb2x2ZShtZXRhRGlyISwgcmVsUGF0aC5yZXBsYWNlKC9cXC5bXi4vXFxcXF0rJC9nLCAnLnlhbWwnKSk7XG4gICAgICBhd2FpdCBwb29sLnN1Ym1pdDxTdHJpbmdJbmZvW10+KHtcbiAgICAgICAgZmlsZTogUGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJ2NsaS1zY2FuLXRyYW4td29ya2VyLmpzJyksXG4gICAgICAgIGV4cG9ydEZuOiAnc2NhbkZpbGUnLFxuICAgICAgICBhcmdzOiBbZmlsZSwgbWV0YWRhdGFGaWxlXVxuICAgICAgfSk7XG4gICAgfSBjYXRjaCAoZXgpIHtcbiAgICAgIHBsaW5rLmxvZ2dlci5lcnJvcihleCk7XG4gICAgfVxuICB9KSk7XG5cblxuICAvLyBmc2V4dC5ta2RpcnBTeW5jKFBhdGguZGlybmFtZShvdXRwdXQpKTtcbiAgLy8gZnMucHJvbWlzZXMud3JpdGVGaWxlKG91dHB1dCwgSlNPTi5zdHJpbmdpZnkodHJhbnNCeUZpbGUsIG51bGwsICcgICcpKTtcbiAgLy8gcGxpbmsubG9nZ2VyLmluZm8ob3V0cHV0ICsgJyBpcyAnICsgKG9sZE1ldGFGaWxlRXhpdHMgPyAndXBkYXRlZCcgOiAnd3JpdHRlbicpKTtcbn1cblxuIl19