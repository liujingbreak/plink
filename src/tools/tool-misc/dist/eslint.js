"use strict";
/// <reference path="./eslint-cli.d.ts" />
Object.defineProperty(exports, "__esModule", { value: true });
exports.eslint = void 0;
const tslib_1 = require("tslib");
const cli_1 = require("eslint/lib/cli");
const glob_1 = tslib_1.__importDefault(require("glob"));
const path_1 = tslib_1.__importDefault(require("path"));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXNsaW50LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZXNsaW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSwwQ0FBMEM7Ozs7QUFFMUMsd0NBQXVDO0FBQ3ZDLHdEQUF3QjtBQUN4Qix3REFBd0I7QUFFeEI7OztHQUdHO0FBQ0ksS0FBSyxVQUFVLE1BQU0sQ0FBQyxHQUFXO0lBQ3RDLE1BQU0sS0FBSyxHQUFHLE1BQU0sSUFBSSxPQUFPLENBQVcsQ0FBQyxPQUFPLEVBQUUsTUFBTSxFQUFFLEVBQUU7UUFDNUQsSUFBQSxjQUFJLEVBQUMsR0FBRyxHQUFHLFVBQVUsRUFBRSxDQUFDLEdBQUcsRUFBRSxPQUFPLEVBQUUsRUFBRTtZQUN0QyxJQUFJLEdBQUc7Z0JBQ0wsT0FBTyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDckIsT0FBTyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzNELENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQyxDQUFDLENBQUM7SUFDSCxNQUFNLElBQUksR0FBRyxDQUFDLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxjQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSxnQkFBZ0IsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO0lBQ2hHLEtBQUssTUFBTSxJQUFJLElBQUksS0FBSyxFQUFFO1FBQ3hCLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQztRQUNYLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDaEIsSUFBQSxhQUFPLEVBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO0tBQ3JCO0FBQ0gsQ0FBQztBQWRELHdCQWNDIiwic291cmNlc0NvbnRlbnQiOlsiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4vZXNsaW50LWNsaS5kLnRzXCIgLz5cblxuaW1wb3J0IHtleGVjdXRlfSBmcm9tICdlc2xpbnQvbGliL2NsaSc7XG5pbXBvcnQgZ2xvYiBmcm9tICdnbG9iJztcbmltcG9ydCBwYXRoIGZyb20gJ3BhdGgnO1xuXG4vKipcbiAqIFJ1biBlc2xpbnQgb25seSBmb3IgLnRzIGZpbGUsIGV4Y2x1ZGUgLmQudHMgZmlsZXNcbiAqIEBwYXJhbSBkaXIgXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBlc2xpbnQoZGlyOiBzdHJpbmcpIHtcbiAgY29uc3QgZmlsZXMgPSBhd2FpdCBuZXcgUHJvbWlzZTxzdHJpbmdbXT4oKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgIGdsb2IoZGlyICsgJy8qKi8qLnRzJywgKGVyciwgbWF0Y2hlcykgPT4ge1xuICAgICAgaWYgKGVycilcbiAgICAgICAgcmV0dXJuIHJlamVjdChlcnIpO1xuICAgICAgcmVzb2x2ZShtYXRjaGVzLmZpbHRlcihmaWxlID0+ICFmaWxlLmVuZHNXaXRoKCcuZC50cycpKSk7XG4gICAgfSk7XG4gIH0pO1xuICBjb25zdCBhcmdzID0gWy4uLnByb2Nlc3MuYXJndi5zbGljZSgwLCAyKSwgJy1jJywgcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4uL2VzbGludHJjLmpzJyksICcnXTtcbiAgZm9yIChjb25zdCBmaWxlIG9mIGZpbGVzKSB7XG4gICAgYXJncy5wb3AoKTtcbiAgICBhcmdzLnB1c2goZmlsZSk7XG4gICAgZXhlY3V0ZShhcmdzLCBudWxsKTtcbiAgfVxufVxuIl19