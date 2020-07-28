"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const lodash_1 = tslib_1.__importDefault(require("lodash"));
const fs_extra_1 = tslib_1.__importDefault(require("fs-extra"));
const path_1 = tslib_1.__importDefault(require("path"));
const packageScopes = ['@bk', '@dr'];
function findPackageJson(name) {
    const file = name + '/package.json';
    const guessingFile = [
        file,
        ...packageScopes.map(scope => `${scope}/${file}`)
    ];
    let resolved;
    const foundModule = guessingFile.find(target => {
        try {
            resolved = require.resolve(target);
            return true;
        }
        catch (ex) {
            return false;
        }
    });
    if (!foundModule) {
        throw new Error(`Could not resolve package.json from paths like:\n${guessingFile.join('\n')}`);
    }
    return resolved;
}
function _findPackage(shortName) {
    const jsonFile = findPackageJson(shortName);
    const pkJson = JSON.parse(fs_extra_1.default.readFileSync(jsonFile, 'utf8'));
    const pkDir = path_1.default.dirname(jsonFile);
    return {
        name: pkJson.name,
        packageJson: pkJson,
        dir: pkDir
    };
}
exports.findPackage = lodash_1.default.memoize(_findPackage);

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AYmsvY3JhLXNjcmlwdHMvdHMvYnVpbGQtdGFyZ2V0LWhlbHBlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSw0REFBdUI7QUFDdkIsZ0VBQTBCO0FBQzFCLHdEQUF3QjtBQUV4QixNQUFNLGFBQWEsR0FBRyxDQUFDLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQztBQUVyQyxTQUFTLGVBQWUsQ0FBQyxJQUFZO0lBQ25DLE1BQU0sSUFBSSxHQUFHLElBQUksR0FBRyxlQUFlLENBQUM7SUFDcEMsTUFBTSxZQUFZLEdBQWE7UUFDN0IsSUFBSTtRQUNKLEdBQUcsYUFBYSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLEdBQUcsS0FBSyxJQUFJLElBQUksRUFBRSxDQUFDO0tBQ2xELENBQUM7SUFDRixJQUFJLFFBQWdCLENBQUM7SUFDckIsTUFBTSxXQUFXLEdBQUcsWUFBWSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsRUFBRTtRQUM3QyxJQUFJO1lBQ0YsUUFBUSxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDbkMsT0FBTyxJQUFJLENBQUM7U0FDYjtRQUFDLE9BQU8sRUFBRSxFQUFFO1lBQ1gsT0FBTyxLQUFLLENBQUM7U0FDZDtJQUNILENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLFdBQVcsRUFBRTtRQUNoQixNQUFNLElBQUksS0FBSyxDQUFDLG9EQUFvRCxZQUFZLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQztLQUNoRztJQUNELE9BQU8sUUFBUyxDQUFDO0FBQ25CLENBQUM7QUFFRCxTQUFTLFlBQVksQ0FBQyxTQUFpQjtJQUNyQyxNQUFNLFFBQVEsR0FBRyxlQUFlLENBQUMsU0FBUyxDQUFDLENBQUM7SUFDNUMsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxrQkFBRSxDQUFDLFlBQVksQ0FBQyxRQUFRLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQztJQUU3RCxNQUFNLEtBQUssR0FBRyxjQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQ3JDLE9BQU87UUFDTCxJQUFJLEVBQUUsTUFBTSxDQUFDLElBQUk7UUFDakIsV0FBVyxFQUFFLE1BQU07UUFDbkIsR0FBRyxFQUFFLEtBQUs7S0FDWCxDQUFDO0FBQ0osQ0FBQztBQUVZLFFBQUEsV0FBVyxHQUFHLGdCQUFDLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQyxDQUFDIiwiZmlsZSI6Im5vZGVfbW9kdWxlcy9AYmsvY3JhLXNjcmlwdHMvZGlzdC9idWlsZC10YXJnZXQtaGVscGVyLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCBmcyBmcm9tICdmcy1leHRyYSc7XG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcblxuY29uc3QgcGFja2FnZVNjb3BlcyA9IFsnQGJrJywgJ0BkciddO1xuXG5mdW5jdGlvbiBmaW5kUGFja2FnZUpzb24obmFtZTogc3RyaW5nKTogc3RyaW5nIHtcbiAgY29uc3QgZmlsZSA9IG5hbWUgKyAnL3BhY2thZ2UuanNvbic7XG4gIGNvbnN0IGd1ZXNzaW5nRmlsZTogc3RyaW5nW10gPSBbXG4gICAgZmlsZSxcbiAgICAuLi5wYWNrYWdlU2NvcGVzLm1hcChzY29wZSA9PiBgJHtzY29wZX0vJHtmaWxlfWApXG4gIF07XG4gIGxldCByZXNvbHZlZDogc3RyaW5nO1xuICBjb25zdCBmb3VuZE1vZHVsZSA9IGd1ZXNzaW5nRmlsZS5maW5kKHRhcmdldCA9PiB7XG4gICAgdHJ5IHtcbiAgICAgIHJlc29sdmVkID0gcmVxdWlyZS5yZXNvbHZlKHRhcmdldCk7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9IGNhdGNoIChleCkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgfSk7XG5cbiAgaWYgKCFmb3VuZE1vZHVsZSkge1xuICAgIHRocm93IG5ldyBFcnJvcihgQ291bGQgbm90IHJlc29sdmUgcGFja2FnZS5qc29uIGZyb20gcGF0aHMgbGlrZTpcXG4ke2d1ZXNzaW5nRmlsZS5qb2luKCdcXG4nKX1gKTtcbiAgfVxuICByZXR1cm4gcmVzb2x2ZWQhO1xufVxuXG5mdW5jdGlvbiBfZmluZFBhY2thZ2Uoc2hvcnROYW1lOiBzdHJpbmcpOiB7bmFtZTogc3RyaW5nOyBwYWNrYWdlSnNvbjogYW55LCBkaXI6IHN0cmluZ30ge1xuICBjb25zdCBqc29uRmlsZSA9IGZpbmRQYWNrYWdlSnNvbihzaG9ydE5hbWUpO1xuICBjb25zdCBwa0pzb24gPSBKU09OLnBhcnNlKGZzLnJlYWRGaWxlU3luYyhqc29uRmlsZSwgJ3V0ZjgnKSk7XG5cbiAgY29uc3QgcGtEaXIgPSBQYXRoLmRpcm5hbWUoanNvbkZpbGUpO1xuICByZXR1cm4ge1xuICAgIG5hbWU6IHBrSnNvbi5uYW1lLFxuICAgIHBhY2thZ2VKc29uOiBwa0pzb24sXG4gICAgZGlyOiBwa0RpclxuICB9O1xufVxuXG5leHBvcnQgY29uc3QgZmluZFBhY2thZ2UgPSBfLm1lbW9pemUoX2ZpbmRQYWNrYWdlKTtcblxuIl19
