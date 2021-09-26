"use strict";
/// <reference path="./eslint-cli.d.ts" />
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.eslint = void 0;
const cli_1 = require("eslint/lib/cli");
const glob_1 = __importDefault(require("glob"));
const path_1 = __importDefault(require("path"));
/**
 * Run eslint only for .ts file, exclude .d.ts files
 * @param dir
 */
async function eslint(dir) {
    const files = await new Promise((resolve, reject) => {
        (0, glob_1.default)(dir + '/**/*.ts', (err, matches) => {
            if (err)
                return reject(err);
            resolve(matches.filter(file => !file.endsWith('.d.ts')));
        });
    });
    const args = [...process.argv.slice(0, 2), '-c', path_1.default.resolve(__dirname, '../eslintrc.js'), ''];
    for (const file of files) {
        args.pop();
        args.push(file);
        (0, cli_1.execute)(args, null);
    }
}
exports.eslint = eslint;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXNsaW50LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZXNsaW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSwwQ0FBMEM7Ozs7OztBQUUxQyx3Q0FBdUM7QUFDdkMsZ0RBQXdCO0FBQ3hCLGdEQUF3QjtBQUV4Qjs7O0dBR0c7QUFDSSxLQUFLLFVBQVUsTUFBTSxDQUFDLEdBQVc7SUFDdEMsTUFBTSxLQUFLLEdBQUcsTUFBTSxJQUFJLE9BQU8sQ0FBVyxDQUFDLE9BQU8sRUFBRSxNQUFNLEVBQUUsRUFBRTtRQUM1RCxJQUFBLGNBQUksRUFBQyxHQUFHLEdBQUcsVUFBVSxFQUFFLENBQUMsR0FBRyxFQUFFLE9BQU8sRUFBRSxFQUFFO1lBQ3RDLElBQUksR0FBRztnQkFDTCxPQUFPLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUNyQixPQUFPLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDM0QsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDLENBQUMsQ0FBQztJQUNILE1BQU0sSUFBSSxHQUFHLENBQUMsR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLGNBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLGdCQUFnQixDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7SUFDaEcsS0FBSyxNQUFNLElBQUksSUFBSSxLQUFLLEVBQUU7UUFDeEIsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDO1FBQ1gsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNoQixJQUFBLGFBQU8sRUFBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7S0FDckI7QUFDSCxDQUFDO0FBZEQsd0JBY0MiLCJzb3VyY2VzQ29udGVudCI6WyIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi9lc2xpbnQtY2xpLmQudHNcIiAvPlxuXG5pbXBvcnQge2V4ZWN1dGV9IGZyb20gJ2VzbGludC9saWIvY2xpJztcbmltcG9ydCBnbG9iIGZyb20gJ2dsb2InO1xuaW1wb3J0IHBhdGggZnJvbSAncGF0aCc7XG5cbi8qKlxuICogUnVuIGVzbGludCBvbmx5IGZvciAudHMgZmlsZSwgZXhjbHVkZSAuZC50cyBmaWxlc1xuICogQHBhcmFtIGRpciBcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGVzbGludChkaXI6IHN0cmluZykge1xuICBjb25zdCBmaWxlcyA9IGF3YWl0IG5ldyBQcm9taXNlPHN0cmluZ1tdPigocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgZ2xvYihkaXIgKyAnLyoqLyoudHMnLCAoZXJyLCBtYXRjaGVzKSA9PiB7XG4gICAgICBpZiAoZXJyKVxuICAgICAgICByZXR1cm4gcmVqZWN0KGVycik7XG4gICAgICByZXNvbHZlKG1hdGNoZXMuZmlsdGVyKGZpbGUgPT4gIWZpbGUuZW5kc1dpdGgoJy5kLnRzJykpKTtcbiAgICB9KTtcbiAgfSk7XG4gIGNvbnN0IGFyZ3MgPSBbLi4ucHJvY2Vzcy5hcmd2LnNsaWNlKDAsIDIpLCAnLWMnLCBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi4vZXNsaW50cmMuanMnKSwgJyddO1xuICBmb3IgKGNvbnN0IGZpbGUgb2YgZmlsZXMpIHtcbiAgICBhcmdzLnBvcCgpO1xuICAgIGFyZ3MucHVzaChmaWxlKTtcbiAgICBleGVjdXRlKGFyZ3MsIG51bGwpO1xuICB9XG59XG4iXX0=