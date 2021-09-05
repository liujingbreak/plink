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
exports.buildTsd = void 0;
const utils_1 = require("./utils");
const plink_1 = require("@wfh/plink");
const types_1 = require("./types");
const utils_2 = require("./utils");
const lodash_1 = __importDefault(require("lodash"));
const typescript_1 = __importDefault(require("typescript"));
function buildTsd(packages, overridePackgeDirs = {}) {
    return __awaiter(this, void 0, void 0, function* () {
        if (packages == null) {
            const opts = (0, utils_1.getCmdOptions)();
            packages = [opts.buildTarget];
        }
        const pkgs = [...(0, plink_1.findPackagesByNames)(packages)].map((pkg, i) => {
            if (pkg == null) {
                throw new Error(`Can not find package ${packages[i]}`);
            }
            return pkg;
        });
        const _overridePackgeDirs = Object.assign({}, overridePackgeDirs);
        for (const pkg of pkgs) {
            if (_overridePackgeDirs[pkg.name] == null) {
                _overridePackgeDirs[pkg.name] = {
                    destDir: 'build',
                    srcDir: '',
                    files: [lodash_1.default.get(pkg.json.plink ? pkg.json.plink : pkg.json.dr, types_1.PKG_LIB_ENTRY_PROP, types_1.PKG_LIB_ENTRY_DEFAULT)]
                };
            }
        }
        // const targetPackage = pkg.name;
        const workerData = {
            package: pkgs.map(pkg => pkg.name), ed: true, jsx: true, watch: (0, utils_1.getCmdOptions)().watch,
            pathsJsons: [],
            overridePackgeDirs: _overridePackgeDirs
        };
        const { tsc } = require('@wfh/plink/wfh/dist/ts-cmd');
        workerData.compilerOptions = (0, utils_2.runTsConfigHandlers4LibTsd)();
        yield tsc(workerData, typescript_1.default);
    });
}
exports.buildTsd = buildTsd;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHNkLWdlbmVyYXRlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsidHNkLWdlbmVyYXRlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7OztBQUFBLG1DQUF3QztBQUV4QyxzQ0FBK0M7QUFDL0MsbUNBQWtFO0FBQ2xFLG1DQUFtRDtBQUVuRCxvREFBdUI7QUFDdkIsNERBQTRCO0FBRTVCLFNBQXNCLFFBQVEsQ0FBQyxRQUFtQixFQUFFLHFCQUF3RCxFQUFFOztRQUU1RyxJQUFJLFFBQVEsSUFBSSxJQUFJLEVBQUU7WUFDcEIsTUFBTSxJQUFJLEdBQUcsSUFBQSxxQkFBYSxHQUFFLENBQUM7WUFDN0IsUUFBUSxHQUFHLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDO1NBQy9CO1FBRUQsTUFBTSxJQUFJLEdBQUcsQ0FBQyxHQUFHLElBQUEsMkJBQW1CLEVBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLEVBQUU7WUFDN0QsSUFBSSxHQUFHLElBQUksSUFBSSxFQUFFO2dCQUNmLE1BQU0sSUFBSSxLQUFLLENBQUMsd0JBQXdCLFFBQVMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7YUFDekQ7WUFDRCxPQUFPLEdBQUcsQ0FBQztRQUNiLENBQUMsQ0FBQyxDQUFDO1FBRUgsTUFBTSxtQkFBbUIscUJBQTBDLGtCQUFrQixDQUFDLENBQUM7UUFDdkYsS0FBSyxNQUFNLEdBQUcsSUFBSSxJQUFJLEVBQUU7WUFDdEIsSUFBSSxtQkFBbUIsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksSUFBSSxFQUFFO2dCQUN6QyxtQkFBbUIsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUc7b0JBQzlCLE9BQU8sRUFBRSxPQUFPO29CQUNoQixNQUFNLEVBQUUsRUFBRTtvQkFDVixLQUFLLEVBQUUsQ0FBQyxnQkFBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLDBCQUFrQixFQUFFLDZCQUFxQixDQUFDLENBQUM7aUJBQ3pHLENBQUM7YUFDSDtTQUNGO1FBQ0Qsa0NBQWtDO1FBQ2xDLE1BQU0sVUFBVSxHQUFnQjtZQUM5QixPQUFPLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLElBQUEscUJBQWEsR0FBRSxDQUFDLEtBQUs7WUFDckYsVUFBVSxFQUFFLEVBQUU7WUFDZCxrQkFBa0IsRUFBRSxtQkFBbUI7U0FDeEMsQ0FBQztRQUNGLE1BQU0sRUFBQyxHQUFHLEVBQUMsR0FBRyxPQUFPLENBQUMsNEJBQTRCLENBQWtCLENBQUM7UUFDckUsVUFBVSxDQUFDLGVBQWUsR0FBRyxJQUFBLGtDQUEwQixHQUFFLENBQUM7UUFDMUQsTUFBTSxHQUFHLENBQUMsVUFBVSxFQUFFLG9CQUFFLENBQUMsQ0FBQztJQUM1QixDQUFDO0NBQUE7QUFqQ0QsNEJBaUNDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgZ2V0Q21kT3B0aW9ucyB9IGZyb20gJy4vdXRpbHMnO1xuaW1wb3J0IHtUc2NDbWRQYXJhbX0gZnJvbSAnQHdmaC9wbGluay93ZmgvZGlzdC90cy1jbWQnO1xuaW1wb3J0IHtmaW5kUGFja2FnZXNCeU5hbWVzfSBmcm9tICdAd2ZoL3BsaW5rJztcbmltcG9ydCB7UEtHX0xJQl9FTlRSWV9QUk9QLCBQS0dfTElCX0VOVFJZX0RFRkFVTFR9IGZyb20gJy4vdHlwZXMnO1xuaW1wb3J0IHtydW5Uc0NvbmZpZ0hhbmRsZXJzNExpYlRzZH0gZnJvbSAnLi91dGlscyc7XG5pbXBvcnQgKiBhcyBfdHNjbWQgZnJvbSAnQHdmaC9wbGluay93ZmgvZGlzdC90cy1jbWQnO1xuaW1wb3J0IF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGJ1aWxkVHNkKHBhY2thZ2VzPzogc3RyaW5nW10sIG92ZXJyaWRlUGFja2dlRGlyczogVHNjQ21kUGFyYW1bJ292ZXJyaWRlUGFja2dlRGlycyddID0ge30pIHtcblxuICBpZiAocGFja2FnZXMgPT0gbnVsbCkge1xuICAgIGNvbnN0IG9wdHMgPSBnZXRDbWRPcHRpb25zKCk7XG4gICAgcGFja2FnZXMgPSBbb3B0cy5idWlsZFRhcmdldF07XG4gIH1cblxuICBjb25zdCBwa2dzID0gWy4uLmZpbmRQYWNrYWdlc0J5TmFtZXMocGFja2FnZXMpXS5tYXAoKHBrZywgaSkgPT4ge1xuICAgIGlmIChwa2cgPT0gbnVsbCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBDYW4gbm90IGZpbmQgcGFja2FnZSAke3BhY2thZ2VzIVtpXX1gKTtcbiAgICB9XG4gICAgcmV0dXJuIHBrZztcbiAgfSk7XG5cbiAgY29uc3QgX292ZXJyaWRlUGFja2dlRGlyczogVHNjQ21kUGFyYW1bJ292ZXJyaWRlUGFja2dlRGlycyddID0gey4uLm92ZXJyaWRlUGFja2dlRGlyc307XG4gIGZvciAoY29uc3QgcGtnIG9mIHBrZ3MpIHtcbiAgICBpZiAoX292ZXJyaWRlUGFja2dlRGlyc1twa2cubmFtZV0gPT0gbnVsbCkge1xuICAgICAgX292ZXJyaWRlUGFja2dlRGlyc1twa2cubmFtZV0gPSB7XG4gICAgICAgIGRlc3REaXI6ICdidWlsZCcsXG4gICAgICAgIHNyY0RpcjogJycsXG4gICAgICAgIGZpbGVzOiBbXy5nZXQocGtnLmpzb24ucGxpbmsgPyBwa2cuanNvbi5wbGluayA6IHBrZy5qc29uLmRyLCBQS0dfTElCX0VOVFJZX1BST1AsIFBLR19MSUJfRU5UUllfREVGQVVMVCldXG4gICAgICB9O1xuICAgIH1cbiAgfVxuICAvLyBjb25zdCB0YXJnZXRQYWNrYWdlID0gcGtnLm5hbWU7XG4gIGNvbnN0IHdvcmtlckRhdGE6IFRzY0NtZFBhcmFtID0ge1xuICAgIHBhY2thZ2U6IHBrZ3MubWFwKHBrZyA9PiBwa2cubmFtZSksIGVkOiB0cnVlLCBqc3g6IHRydWUsIHdhdGNoOiBnZXRDbWRPcHRpb25zKCkud2F0Y2gsXG4gICAgcGF0aHNKc29uczogW10sXG4gICAgb3ZlcnJpZGVQYWNrZ2VEaXJzOiBfb3ZlcnJpZGVQYWNrZ2VEaXJzXG4gIH07XG4gIGNvbnN0IHt0c2N9ID0gcmVxdWlyZSgnQHdmaC9wbGluay93ZmgvZGlzdC90cy1jbWQnKSBhcyB0eXBlb2YgX3RzY21kO1xuICB3b3JrZXJEYXRhLmNvbXBpbGVyT3B0aW9ucyA9IHJ1blRzQ29uZmlnSGFuZGxlcnM0TGliVHNkKCk7XG4gIGF3YWl0IHRzYyh3b3JrZXJEYXRhLCB0cyk7XG59XG4iXX0=