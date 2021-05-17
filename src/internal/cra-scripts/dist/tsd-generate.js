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
function buildTsd(packages, overridePackgeDirs = {}) {
    return __awaiter(this, void 0, void 0, function* () {
        if (packages == null) {
            const opts = utils_1.getCmdOptions();
            packages = [opts.buildTarget];
        }
        const pkgs = [...plink_1.findPackagesByNames(packages)].map((pkg, i) => {
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
                    include: lodash_1.default.get(pkg.json.plink ? pkg.json.plink : pkg.json.dr, types_1.PKG_LIB_ENTRY_PROP, types_1.PKG_LIB_ENTRY_DEFAULT)
                };
            }
        }
        // const targetPackage = pkg.name;
        const workerData = {
            package: pkgs.map(pkg => pkg.name), ed: true, jsx: true, watch: utils_1.getCmdOptions().watch,
            pathsJsons: [],
            overridePackgeDirs: _overridePackgeDirs
        };
        const { tsc } = require('@wfh/plink/wfh/dist/ts-cmd');
        const compilerOptionsDraft = { paths: {} };
        utils_2.runTsConfigHandlers(compilerOptionsDraft);
        workerData.compilerOptions = compilerOptionsDraft;
        yield tsc(workerData);
    });
}
exports.buildTsd = buildTsd;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHNkLWdlbmVyYXRlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsidHNkLWdlbmVyYXRlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7OztBQUFBLG1DQUF3QztBQUV4QyxzQ0FBK0M7QUFDL0MsbUNBQWtFO0FBQ2xFLG1DQUE0QztBQUU1QyxvREFBdUI7QUFFdkIsU0FBc0IsUUFBUSxDQUFDLFFBQW1CLEVBQUUscUJBQXdELEVBQUU7O1FBRTVHLElBQUksUUFBUSxJQUFJLElBQUksRUFBRTtZQUNwQixNQUFNLElBQUksR0FBRyxxQkFBYSxFQUFFLENBQUM7WUFDN0IsUUFBUSxHQUFHLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDO1NBQy9CO1FBRUQsTUFBTSxJQUFJLEdBQUcsQ0FBQyxHQUFHLDJCQUFtQixDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsRUFBRSxFQUFFO1lBQzdELElBQUksR0FBRyxJQUFJLElBQUksRUFBRTtnQkFDZixNQUFNLElBQUksS0FBSyxDQUFDLHdCQUF3QixRQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO2FBQ3pEO1lBQ0QsT0FBTyxHQUFHLENBQUM7UUFDYixDQUFDLENBQUMsQ0FBQztRQUVILE1BQU0sbUJBQW1CLHFCQUEwQyxrQkFBa0IsQ0FBQyxDQUFDO1FBQ3ZGLEtBQUssTUFBTSxHQUFHLElBQUksSUFBSSxFQUFFO1lBQ3RCLElBQUksbUJBQW1CLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLElBQUksRUFBRTtnQkFDekMsbUJBQW1CLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHO29CQUM5QixPQUFPLEVBQUUsT0FBTztvQkFDaEIsTUFBTSxFQUFFLEVBQUU7b0JBQ1YsT0FBTyxFQUFFLGdCQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsMEJBQWtCLEVBQUUsNkJBQXFCLENBQUM7aUJBQ3pHLENBQUM7YUFDSDtTQUNGO1FBQ0Qsa0NBQWtDO1FBQ2xDLE1BQU0sVUFBVSxHQUFnQjtZQUM5QixPQUFPLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLHFCQUFhLEVBQUUsQ0FBQyxLQUFLO1lBQ3JGLFVBQVUsRUFBRSxFQUFFO1lBQ2Qsa0JBQWtCLEVBQUUsbUJBQW1CO1NBQ3hDLENBQUM7UUFDRixNQUFNLEVBQUMsR0FBRyxFQUFDLEdBQUcsT0FBTyxDQUFDLDRCQUE0QixDQUFrQixDQUFDO1FBQ3JFLE1BQU0sb0JBQW9CLEdBQUcsRUFBQyxLQUFLLEVBQUUsRUFBRSxFQUFDLENBQUM7UUFFekMsMkJBQW1CLENBQUMsb0JBQW9CLENBQUMsQ0FBQztRQUMxQyxVQUFVLENBQUMsZUFBZSxHQUFHLG9CQUFvQixDQUFDO1FBQ2xELE1BQU0sR0FBRyxDQUFDLFVBQVUsQ0FBQyxDQUFDO0lBQ3hCLENBQUM7Q0FBQTtBQXBDRCw0QkFvQ0MiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBnZXRDbWRPcHRpb25zIH0gZnJvbSAnLi91dGlscyc7XG5pbXBvcnQge1RzY0NtZFBhcmFtfSBmcm9tICdAd2ZoL3BsaW5rL3dmaC9kaXN0L3RzLWNtZCc7XG5pbXBvcnQge2ZpbmRQYWNrYWdlc0J5TmFtZXN9IGZyb20gJ0B3ZmgvcGxpbmsnO1xuaW1wb3J0IHtQS0dfTElCX0VOVFJZX1BST1AsIFBLR19MSUJfRU5UUllfREVGQVVMVH0gZnJvbSAnLi90eXBlcyc7XG5pbXBvcnQge3J1blRzQ29uZmlnSGFuZGxlcnN9IGZyb20gJy4vdXRpbHMnO1xuaW1wb3J0ICogYXMgX3RzY21kIGZyb20gJ0B3ZmgvcGxpbmsvd2ZoL2Rpc3QvdHMtY21kJztcbmltcG9ydCBfIGZyb20gJ2xvZGFzaCc7XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBidWlsZFRzZChwYWNrYWdlcz86IHN0cmluZ1tdLCBvdmVycmlkZVBhY2tnZURpcnM6IFRzY0NtZFBhcmFtWydvdmVycmlkZVBhY2tnZURpcnMnXSA9IHt9KSB7XG5cbiAgaWYgKHBhY2thZ2VzID09IG51bGwpIHtcbiAgICBjb25zdCBvcHRzID0gZ2V0Q21kT3B0aW9ucygpO1xuICAgIHBhY2thZ2VzID0gW29wdHMuYnVpbGRUYXJnZXRdO1xuICB9XG5cbiAgY29uc3QgcGtncyA9IFsuLi5maW5kUGFja2FnZXNCeU5hbWVzKHBhY2thZ2VzKV0ubWFwKChwa2csIGkpID0+IHtcbiAgICBpZiAocGtnID09IG51bGwpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgQ2FuIG5vdCBmaW5kIHBhY2thZ2UgJHtwYWNrYWdlcyFbaV19YCk7XG4gICAgfVxuICAgIHJldHVybiBwa2c7XG4gIH0pO1xuXG4gIGNvbnN0IF9vdmVycmlkZVBhY2tnZURpcnM6IFRzY0NtZFBhcmFtWydvdmVycmlkZVBhY2tnZURpcnMnXSA9IHsuLi5vdmVycmlkZVBhY2tnZURpcnN9O1xuICBmb3IgKGNvbnN0IHBrZyBvZiBwa2dzKSB7XG4gICAgaWYgKF9vdmVycmlkZVBhY2tnZURpcnNbcGtnLm5hbWVdID09IG51bGwpIHtcbiAgICAgIF9vdmVycmlkZVBhY2tnZURpcnNbcGtnLm5hbWVdID0ge1xuICAgICAgICBkZXN0RGlyOiAnYnVpbGQnLFxuICAgICAgICBzcmNEaXI6ICcnLFxuICAgICAgICBpbmNsdWRlOiBfLmdldChwa2cuanNvbi5wbGluayA/IHBrZy5qc29uLnBsaW5rIDogcGtnLmpzb24uZHIsIFBLR19MSUJfRU5UUllfUFJPUCwgUEtHX0xJQl9FTlRSWV9ERUZBVUxUKVxuICAgICAgfTtcbiAgICB9XG4gIH1cbiAgLy8gY29uc3QgdGFyZ2V0UGFja2FnZSA9IHBrZy5uYW1lO1xuICBjb25zdCB3b3JrZXJEYXRhOiBUc2NDbWRQYXJhbSA9IHtcbiAgICBwYWNrYWdlOiBwa2dzLm1hcChwa2cgPT4gcGtnLm5hbWUpLCBlZDogdHJ1ZSwganN4OiB0cnVlLCB3YXRjaDogZ2V0Q21kT3B0aW9ucygpLndhdGNoLFxuICAgIHBhdGhzSnNvbnM6IFtdLFxuICAgIG92ZXJyaWRlUGFja2dlRGlyczogX292ZXJyaWRlUGFja2dlRGlyc1xuICB9O1xuICBjb25zdCB7dHNjfSA9IHJlcXVpcmUoJ0B3ZmgvcGxpbmsvd2ZoL2Rpc3QvdHMtY21kJykgYXMgdHlwZW9mIF90c2NtZDtcbiAgY29uc3QgY29tcGlsZXJPcHRpb25zRHJhZnQgPSB7cGF0aHM6IHt9fTtcblxuICBydW5Uc0NvbmZpZ0hhbmRsZXJzKGNvbXBpbGVyT3B0aW9uc0RyYWZ0KTtcbiAgd29ya2VyRGF0YS5jb21waWxlck9wdGlvbnMgPSBjb21waWxlck9wdGlvbnNEcmFmdDtcbiAgYXdhaXQgdHNjKHdvcmtlckRhdGEpO1xufVxuIl19