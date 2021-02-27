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
const chalk_1 = __importDefault(require("chalk"));
function scanTran(dir, output) {
    return __awaiter(this, void 0, void 0, function* () {
        let transByFile;
        let oldMetaFileExits = false;
        if (output == null) {
            output = path_1.default.resolve(dir, 'scan-tran.json');
        }
        if (fs_1.default.existsSync(output)) {
            transByFile = JSON.parse(fs_1.default.readFileSync(output, 'utf8'));
            oldMetaFileExits = true;
        }
        else {
            transByFile = {};
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
                const relFilePath = path_1.default.relative(path_1.default.dirname(output), file).replace(/\\/g, '/');
                const res = yield pool.submit({
                    file: path_1.default.resolve(__dirname, 'cli-scan-tran-worker.js'),
                    exportFn: 'scanFile',
                    args: [file, transByFile[relFilePath]]
                });
                __plink_1.default.logger.info(file + `: ${chalk_1.default.green(res.length)} found`);
                const translatables = res.map(([start, end, text, line, col, type]) => ({
                    start, end, desc: `line: ${line}, col: ${col}: ${type}`, default: text, text: null
                }));
                if (!translatables || translatables.length === 0) {
                    delete transByFile[relFilePath];
                }
                else {
                    transByFile[relFilePath] = translatables;
                }
            }
            catch (ex) {
                __plink_1.default.logger.error(ex);
            }
        })));
        // if (!output.endsWith('json')) {
        //   output = output + '.json';
        // }
        fs_extra_1.default.mkdirpSync(path_1.default.dirname(output));
        fs_1.default.promises.writeFile(output, JSON.stringify(transByFile, null, '  '));
        __plink_1.default.logger.info(output + ' is ' + (oldMetaFileExits ? 'updated' : 'written'));
        // plink.logger.info('Command is executing with configuration:', config());
        // TODO: Your command job implementation here
    });
}
exports.scanTran = scanTran;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLXNjYW4tdHJhbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImNsaS1zY2FuLXRyYW4udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7O0FBQUEscUNBQXFDO0FBQ3JDLHNEQUE0QjtBQUM1Qiw0Q0FBb0I7QUFDcEIsd0RBQTZCO0FBQzdCLGdEQUF3QjtBQUN4QixnREFBd0I7QUFDeEIsa0VBQThDO0FBQzlDLGtEQUEwQjtBQXVCMUIsU0FBc0IsUUFBUSxDQUFDLEdBQVcsRUFBRSxNQUFlOztRQUN6RCxJQUFJLFdBQThDLENBQUM7UUFDbkQsSUFBSSxnQkFBZ0IsR0FBRyxLQUFLLENBQUM7UUFDN0IsSUFBSSxNQUFNLElBQUksSUFBSSxFQUFFO1lBQ2xCLE1BQU0sR0FBRyxjQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxnQkFBZ0IsQ0FBQyxDQUFDO1NBQzlDO1FBQ0QsSUFBSSxZQUFFLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxFQUFFO1lBQ3pCLFdBQVcsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLFlBQUUsQ0FBQyxZQUFZLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUM7WUFDMUQsZ0JBQWdCLEdBQUcsSUFBSSxDQUFDO1NBQ3pCO2FBQU07WUFDTCxXQUFXLEdBQUcsRUFBRSxDQUFDO1NBQ2xCO1FBQ0QsSUFBSSxDQUFDLFlBQUUsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUMsV0FBVyxFQUFFLEVBQUU7WUFDbkMsaUJBQUssQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLEdBQUcsR0FBRyxxQkFBcUIsQ0FBQyxDQUFDO1lBQ2hELE9BQU87U0FDUjtRQUNELElBQUksS0FBSyxHQUFHLE1BQU0sSUFBSSxPQUFPLENBQVcsQ0FBQyxPQUFPLEVBQUUsTUFBTSxFQUFFLEVBQUU7WUFDMUQsTUFBTSxPQUFPLEdBQUcsY0FBSSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLEVB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QUFTLENBQUMsQ0FBQyxDQUFDO1FBQ2hGLDJFQUEyRTtRQUMzRSw2Q0FBNkM7SUFDL0MsQ0FBQztDQUFBO0FBNURELDRCQTREQyIsInNvdXJjZXNDb250ZW50IjpbIi8vIGltcG9ydCB7Y29uZmlnfSBmcm9tICdAd2ZoL3BsaW5rJztcbmltcG9ydCBwbGluayBmcm9tICdfX3BsaW5rJztcbmltcG9ydCBmcyBmcm9tICdmcyc7XG5pbXBvcnQgZnNleHQgZnJvbSAnZnMtZXh0cmEnO1xuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgZ2xvYiBmcm9tICdnbG9iJztcbmltcG9ydCB7UG9vbH0gZnJvbSAnQHdmaC90aHJlYWQtcHJvbWlzZS1wb29sJztcbmltcG9ydCBjaGFsayBmcm9tICdjaGFsayc7XG4vLyBDaGFsayBpcyB1c2VmdWwgZm9yIHByaW50aW5nIGNvbG9yZnVsIHRleHQgaW4gYSB0ZXJtaW5hbFxuLy8gaW1wb3J0IGNoYWxrIGZyb20gJ2NoYWxrJztcblxuZXhwb3J0IGludGVyZmFjZSBUcmFuc2xhdGFibGVzIHtcbiAgc3RhcnQ6IG51bWJlcjtcbiAgZW5kOiBudW1iZXI7XG4gIGRlc2M6IHN0cmluZztcbiAgZGVmYXVsdDogc3RyaW5nO1xuICB0ZXh0OiBzdHJpbmcgfCBudWxsO1xufVxuXG5leHBvcnQgdHlwZSBTdHJpbmdJbmZvID0gW1xuICBzdGFydDogbnVtYmVyLFxuICBlbmQ6IG51bWJlcixcbiAgdGV4dDogc3RyaW5nLFxuICAvKiogMSBiYXNlZCAqL1xuICBsaW5lOiBudW1iZXIsXG4gIC8qKiAxIGJhc2VkICovXG4gIGNvbDogbnVtYmVyLFxuICB0eXBlOiBzdHJpbmdcbl07XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBzY2FuVHJhbihkaXI6IHN0cmluZywgb3V0cHV0Pzogc3RyaW5nKSB7XG4gIGxldCB0cmFuc0J5RmlsZToge1tmaWxlOiBzdHJpbmddOiBUcmFuc2xhdGFibGVzW119O1xuICBsZXQgb2xkTWV0YUZpbGVFeGl0cyA9IGZhbHNlO1xuICBpZiAob3V0cHV0ID09IG51bGwpIHtcbiAgICBvdXRwdXQgPSBQYXRoLnJlc29sdmUoZGlyLCAnc2Nhbi10cmFuLmpzb24nKTtcbiAgfVxuICBpZiAoZnMuZXhpc3RzU3luYyhvdXRwdXQpKSB7XG4gICAgdHJhbnNCeUZpbGUgPSBKU09OLnBhcnNlKGZzLnJlYWRGaWxlU3luYyhvdXRwdXQsICd1dGY4JykpO1xuICAgIG9sZE1ldGFGaWxlRXhpdHMgPSB0cnVlO1xuICB9IGVsc2Uge1xuICAgIHRyYW5zQnlGaWxlID0ge307XG4gIH1cbiAgaWYgKCFmcy5zdGF0U3luYyhkaXIpLmlzRGlyZWN0b3J5KCkpIHtcbiAgICBwbGluay5sb2dnZXIuZXJyb3IoYCR7ZGlyfSBpcyBub3QgYSBkaXJlY3RvcnlgKTtcbiAgICByZXR1cm47XG4gIH1cbiAgbGV0IGZpbGVzID0gYXdhaXQgbmV3IFByb21pc2U8c3RyaW5nW10+KChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICBjb25zdCBwYXR0ZXJuID0gUGF0aC5yZWxhdGl2ZShwcm9jZXNzLmN3ZCgpLCBkaXIpLnJlcGxhY2UoL1xcXFwvZywgJy8nKSArICcvKiovKi57dHMsdHN4LGpzLGpzeH0nO1xuXG4gICAgZ2xvYihwYXR0ZXJuLCB7Y3dkOiBwcm9jZXNzLmN3ZCgpLCBub2RpcjogdHJ1ZX0sIChlcnIsIG1hdGNoZXMpID0+IHtcbiAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgcmV0dXJuIHJlamVjdChlcnIpO1xuICAgICAgfVxuICAgICAgcmVzb2x2ZShtYXRjaGVzKTtcbiAgICB9KTtcbiAgfSk7XG5cbiAgcGxpbmsubG9nZ2VyLmluZm8oYEZvdW5kIHRvdGFsICR7ZmlsZXMubGVuZ3RofWApO1xuICBjb25zdCBwb29sID0gbmV3IFBvb2woKTtcblxuICBhd2FpdCBQcm9taXNlLmFsbChmaWxlcy5tYXAoYXN5bmMgZmlsZSA9PiB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHJlbEZpbGVQYXRoID0gUGF0aC5yZWxhdGl2ZShQYXRoLmRpcm5hbWUob3V0cHV0ISksIGZpbGUpLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbiAgICAgIGNvbnN0IHJlcyA9IGF3YWl0IHBvb2wuc3VibWl0PFN0cmluZ0luZm9bXT4oe1xuICAgICAgICBmaWxlOiBQYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnY2xpLXNjYW4tdHJhbi13b3JrZXIuanMnKSxcbiAgICAgICAgZXhwb3J0Rm46ICdzY2FuRmlsZScsXG4gICAgICAgIGFyZ3M6IFtmaWxlLCB0cmFuc0J5RmlsZVtyZWxGaWxlUGF0aF1dXG4gICAgICB9KTtcbiAgICAgIHBsaW5rLmxvZ2dlci5pbmZvKGZpbGUgKyBgOiAke2NoYWxrLmdyZWVuKHJlcy5sZW5ndGgpfSBmb3VuZGApO1xuICAgICAgY29uc3QgdHJhbnNsYXRhYmxlcyA9IHJlcy5tYXA8VHJhbnNsYXRhYmxlcz4oKFtzdGFydCwgZW5kLCB0ZXh0LCBsaW5lLCBjb2wsIHR5cGVdKSA9PiAoe1xuICAgICAgICBzdGFydCwgZW5kLCBkZXNjOiBgbGluZTogJHtsaW5lfSwgY29sOiAke2NvbH06ICR7dHlwZX1gLCBkZWZhdWx0OiB0ZXh0LCB0ZXh0OiBudWxsXG4gICAgICB9KSk7XG4gICAgICBpZiAoIXRyYW5zbGF0YWJsZXMgfHwgdHJhbnNsYXRhYmxlcy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgZGVsZXRlIHRyYW5zQnlGaWxlW3JlbEZpbGVQYXRoXTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRyYW5zQnlGaWxlW3JlbEZpbGVQYXRoXSA9IHRyYW5zbGF0YWJsZXM7XG4gICAgICB9XG4gICAgfSBjYXRjaCAoZXgpIHtcbiAgICAgIHBsaW5rLmxvZ2dlci5lcnJvcihleCk7XG4gICAgfVxuICB9KSk7XG5cbiAgLy8gaWYgKCFvdXRwdXQuZW5kc1dpdGgoJ2pzb24nKSkge1xuICAvLyAgIG91dHB1dCA9IG91dHB1dCArICcuanNvbic7XG4gIC8vIH1cbiAgZnNleHQubWtkaXJwU3luYyhQYXRoLmRpcm5hbWUob3V0cHV0KSk7XG4gIGZzLnByb21pc2VzLndyaXRlRmlsZShvdXRwdXQsIEpTT04uc3RyaW5naWZ5KHRyYW5zQnlGaWxlLCBudWxsLCAnICAnKSk7XG4gIHBsaW5rLmxvZ2dlci5pbmZvKG91dHB1dCArICcgaXMgJyArIChvbGRNZXRhRmlsZUV4aXRzID8gJ3VwZGF0ZWQnIDogJ3dyaXR0ZW4nKSk7XG4gIC8vIHBsaW5rLmxvZ2dlci5pbmZvKCdDb21tYW5kIGlzIGV4ZWN1dGluZyB3aXRoIGNvbmZpZ3VyYXRpb246JywgY29uZmlnKCkpO1xuICAvLyBUT0RPOiBZb3VyIGNvbW1hbmQgam9iIGltcGxlbWVudGF0aW9uIGhlcmVcbn1cblxuIl19