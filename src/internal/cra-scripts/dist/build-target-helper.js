"use strict";
// import Path from 'path';
Object.defineProperty(exports, "__esModule", { value: true });
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
exports.findPackageJson = findPackageJson;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AYmsvY3JhLXNjcmlwdHMvdHMvYnVpbGQtdGFyZ2V0LWhlbHBlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsMkJBQTJCOztBQUUzQixNQUFNLGFBQWEsR0FBRyxDQUFDLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQztBQUVyQyxTQUFnQixlQUFlLENBQUMsSUFBWTtJQUMxQyxNQUFNLElBQUksR0FBRyxJQUFJLEdBQUcsZUFBZSxDQUFDO0lBQ3BDLE1BQU0sWUFBWSxHQUFhO1FBQzdCLElBQUk7UUFDSixHQUFHLGFBQWEsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEtBQUssSUFBSSxJQUFJLEVBQUUsQ0FBQztLQUNsRCxDQUFDO0lBQ0YsSUFBSSxRQUFnQixDQUFDO0lBQ3JCLE1BQU0sV0FBVyxHQUFHLFlBQVksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEVBQUU7UUFDN0MsSUFBSTtZQUNGLFFBQVEsR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ25DLE9BQU8sSUFBSSxDQUFDO1NBQ2I7UUFBQyxPQUFPLEVBQUUsRUFBRTtZQUNYLE9BQU8sS0FBSyxDQUFDO1NBQ2Q7SUFDSCxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxXQUFXLEVBQUU7UUFDaEIsTUFBTSxJQUFJLEtBQUssQ0FBQyxvREFBb0QsWUFBWSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7S0FDaEc7SUFDRCxPQUFPLFFBQVMsQ0FBQztBQUNuQixDQUFDO0FBcEJELDBDQW9CQyIsImZpbGUiOiJub2RlX21vZHVsZXMvQGJrL2NyYS1zY3JpcHRzL2Rpc3QvYnVpbGQtdGFyZ2V0LWhlbHBlci5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8vIGltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuXG5jb25zdCBwYWNrYWdlU2NvcGVzID0gWydAYmsnLCAnQGRyJ107XG5cbmV4cG9ydCBmdW5jdGlvbiBmaW5kUGFja2FnZUpzb24obmFtZTogc3RyaW5nKTogc3RyaW5nIHtcbiAgY29uc3QgZmlsZSA9IG5hbWUgKyAnL3BhY2thZ2UuanNvbic7XG4gIGNvbnN0IGd1ZXNzaW5nRmlsZTogc3RyaW5nW10gPSBbXG4gICAgZmlsZSxcbiAgICAuLi5wYWNrYWdlU2NvcGVzLm1hcChzY29wZSA9PiBgJHtzY29wZX0vJHtmaWxlfWApXG4gIF07XG4gIGxldCByZXNvbHZlZDogc3RyaW5nO1xuICBjb25zdCBmb3VuZE1vZHVsZSA9IGd1ZXNzaW5nRmlsZS5maW5kKHRhcmdldCA9PiB7XG4gICAgdHJ5IHtcbiAgICAgIHJlc29sdmVkID0gcmVxdWlyZS5yZXNvbHZlKHRhcmdldCk7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9IGNhdGNoIChleCkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgfSk7XG5cbiAgaWYgKCFmb3VuZE1vZHVsZSkge1xuICAgIHRocm93IG5ldyBFcnJvcihgQ291bGQgbm90IHJlc29sdmUgcGFja2FnZS5qc29uIGZyb20gcGF0aHMgbGlrZTpcXG4ke2d1ZXNzaW5nRmlsZS5qb2luKCdcXG4nKX1gKTtcbiAgfVxuICByZXR1cm4gcmVzb2x2ZWQhO1xufVxuIl19
