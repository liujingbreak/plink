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
exports.scan = void 0;
// import api from '__api';
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const util_1 = require("util");
const log = require('log4js').getLogger('tool-misc.' + path_1.default.basename(__filename));
function scan(dir) {
    return __awaiter(this, void 0, void 0, function* () {
        // let globExcludes: string[] = ['node_modules'];
        if (!dir)
            dir = path_1.default.resolve();
        const result = {};
        yield globDirs(dir, result);
        log.info(result);
    });
}
exports.scan = scan;
const readdir = util_1.promisify(fs_1.default.readdir);
const statAsync = util_1.promisify(fs_1.default.stat);
function globDirs(dir, collection) {
    return __awaiter(this, void 0, void 0, function* () {
        const baseDirName = path_1.default.basename(dir);
        if (baseDirName === 'node_modules' || baseDirName.startsWith('.'))
            return Promise.resolve(collection);
        log.info('scan', dir);
        const subDirDone = readdir(dir)
            .then((dirs) => __awaiter(this, void 0, void 0, function* () {
            const subDirs = yield Promise.all(dirs.map((baseSubDir) => __awaiter(this, void 0, void 0, function* () {
                const subDir = path_1.default.resolve(dir, baseSubDir);
                const stat = yield statAsync(subDir);
                if (stat.isFile() && subDir.endsWith('.md')) {
                    let col = collection[dir];
                    if (!col)
                        col = collection[dir] = [];
                    col.push(baseSubDir);
                }
                return stat.isDirectory() ? subDir : null;
            })));
            return Promise.all(subDirs.filter(subDir => subDir).map(subDir => {
                return globDirs(subDir, collection);
            }));
        }));
        yield subDirDone;
        return collection;
    });
}

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3dlYi1mdW4taG91c2Uvc3JjL3Rvb2xzL3Rvb2wtbWlzYy90cy9zY2FuLW1hcmtkb3duLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7OztBQUNBLDJCQUEyQjtBQUMzQixnREFBd0I7QUFDeEIsNENBQW9CO0FBQ3BCLCtCQUErQjtBQUUvQixNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsU0FBUyxDQUFDLFlBQVksR0FBRyxjQUFJLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUM7QUFFbEYsU0FBc0IsSUFBSSxDQUFDLEdBQVc7O1FBQ3BDLGlEQUFpRDtRQUNqRCxJQUFJLENBQUMsR0FBRztZQUNOLEdBQUcsR0FBRyxjQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7UUFFdkIsTUFBTSxNQUFNLEdBQThCLEVBQUUsQ0FBQztRQUM3QyxNQUFNLFFBQVEsQ0FBQyxHQUFHLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFFNUIsR0FBRyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUNuQixDQUFDO0NBQUE7QUFURCxvQkFTQztBQUVELE1BQU0sT0FBTyxHQUFHLGdCQUFTLENBQUMsWUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0FBQ3RDLE1BQU0sU0FBUyxHQUFHLGdCQUFTLENBQUMsWUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDO0FBR3JDLFNBQWUsUUFBUSxDQUFDLEdBQVcsRUFBRSxVQUFxQzs7UUFDeEUsTUFBTSxXQUFXLEdBQUcsY0FBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUN2QyxJQUFJLFdBQVcsS0FBSyxjQUFjLElBQUksV0FBVyxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUM7WUFDL0QsT0FBTyxPQUFPLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBRXJDLEdBQUcsQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBRXRCLE1BQU0sVUFBVSxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUM7YUFDOUIsSUFBSSxDQUFDLENBQU0sSUFBSSxFQUFDLEVBQUU7WUFDakIsTUFBTSxPQUFPLEdBQUcsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBTSxVQUFVLEVBQUMsRUFBRTtnQkFDNUQsTUFBTSxNQUFNLEdBQUcsY0FBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsVUFBVSxDQUFDLENBQUM7Z0JBQzdDLE1BQU0sSUFBSSxHQUFHLE1BQU0sU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUFDO2dCQUNyQyxJQUFJLElBQUksQ0FBQyxNQUFNLEVBQUUsSUFBSSxNQUFNLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxFQUFFO29CQUMzQyxJQUFJLEdBQUcsR0FBRyxVQUFVLENBQUMsR0FBRyxDQUFDLENBQUM7b0JBQzFCLElBQUksQ0FBQyxHQUFHO3dCQUNOLEdBQUcsR0FBRyxVQUFVLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxDQUFDO29CQUM3QixHQUFHLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDO2lCQUN0QjtnQkFDRCxPQUFPLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7WUFDNUMsQ0FBQyxDQUFBLENBQUMsQ0FBQyxDQUFDO1lBQ0osT0FBTyxPQUFPLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEVBQUU7Z0JBQy9ELE9BQU8sUUFBUSxDQUFDLE1BQU8sRUFBRSxVQUFVLENBQUMsQ0FBQztZQUN2QyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ04sQ0FBQyxDQUFBLENBQUMsQ0FBQztRQUNILE1BQU0sVUFBVSxDQUFDO1FBQ2pCLE9BQU8sVUFBVSxDQUFDO0lBQ3BCLENBQUM7Q0FBQSIsImZpbGUiOiJ0b29scy90b29sLW1pc2MvZGlzdC9zY2FuLW1hcmtkb3duLmpzIiwic291cmNlc0NvbnRlbnQiOltudWxsXX0=
