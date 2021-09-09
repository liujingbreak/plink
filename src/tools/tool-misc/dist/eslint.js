"use strict";
/// <reference path="./eslint-cli.d.ts" />
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
exports.eslint = void 0;
const cli_1 = require("eslint/lib/cli");
const glob_1 = __importDefault(require("glob"));
const path_1 = __importDefault(require("path"));
/**
 * Run eslint only for .ts file, exclude .d.ts files
 * @param dir
 */
function eslint(dir) {
    return __awaiter(this, void 0, void 0, function* () {
        const files = yield new Promise((resolve, reject) => {
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
    });
}
exports.eslint = eslint;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXNsaW50LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZXNsaW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSwwQ0FBMEM7Ozs7Ozs7Ozs7Ozs7OztBQUUxQyx3Q0FBdUM7QUFDdkMsZ0RBQXdCO0FBQ3hCLGdEQUF3QjtBQUV4Qjs7O0dBR0c7QUFDSCxTQUFzQixNQUFNLENBQUMsR0FBVzs7UUFDdEMsTUFBTSxLQUFLLEdBQUcsTUFBTSxJQUFJLE9BQU8sQ0FBVyxDQUFDLE9BQU8sRUFBRSxNQUFNLEVBQUUsRUFBRTtZQUM1RCxJQUFBLGNBQUksRUFBQyxHQUFHLEdBQUcsVUFBVSxFQUFFLENBQUMsR0FBRyxFQUFFLE9BQU8sRUFBRSxFQUFFO2dCQUN0QyxJQUFJLEdBQUc7b0JBQ0wsT0FBTyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUM7Z0JBQ3JCLE9BQU8sQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUMzRCxDQUFDLENBQUMsQ0FBQztRQUNMLENBQUMsQ0FBQyxDQUFDO1FBQ0gsTUFBTSxJQUFJLEdBQUcsQ0FBQyxHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsY0FBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUsZ0JBQWdCLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUNoRyxLQUFLLE1BQU0sSUFBSSxJQUFJLEtBQUssRUFBRTtZQUN4QixJQUFJLENBQUMsR0FBRyxFQUFFLENBQUM7WUFDWCxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ2hCLElBQUEsYUFBTyxFQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztTQUNyQjtJQUNILENBQUM7Q0FBQTtBQWRELHdCQWNDIiwic291cmNlc0NvbnRlbnQiOlsiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4vZXNsaW50LWNsaS5kLnRzXCIgLz5cblxuaW1wb3J0IHtleGVjdXRlfSBmcm9tICdlc2xpbnQvbGliL2NsaSc7XG5pbXBvcnQgZ2xvYiBmcm9tICdnbG9iJztcbmltcG9ydCBwYXRoIGZyb20gJ3BhdGgnO1xuXG4vKipcbiAqIFJ1biBlc2xpbnQgb25seSBmb3IgLnRzIGZpbGUsIGV4Y2x1ZGUgLmQudHMgZmlsZXNcbiAqIEBwYXJhbSBkaXIgXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBlc2xpbnQoZGlyOiBzdHJpbmcpIHtcbiAgY29uc3QgZmlsZXMgPSBhd2FpdCBuZXcgUHJvbWlzZTxzdHJpbmdbXT4oKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgIGdsb2IoZGlyICsgJy8qKi8qLnRzJywgKGVyciwgbWF0Y2hlcykgPT4ge1xuICAgICAgaWYgKGVycilcbiAgICAgICAgcmV0dXJuIHJlamVjdChlcnIpO1xuICAgICAgcmVzb2x2ZShtYXRjaGVzLmZpbHRlcihmaWxlID0+ICFmaWxlLmVuZHNXaXRoKCcuZC50cycpKSk7XG4gICAgfSk7XG4gIH0pO1xuICBjb25zdCBhcmdzID0gWy4uLnByb2Nlc3MuYXJndi5zbGljZSgwLCAyKSwgJy1jJywgcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4uL2VzbGludHJjLmpzJyksICcnXTtcbiAgZm9yIChjb25zdCBmaWxlIG9mIGZpbGVzKSB7XG4gICAgYXJncy5wb3AoKTtcbiAgICBhcmdzLnB1c2goZmlsZSk7XG4gICAgZXhlY3V0ZShhcmdzLCBudWxsKTtcbiAgfVxufVxuIl19