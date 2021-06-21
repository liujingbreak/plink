"use strict";
/**
 * This file is intented to run before "npm install" in workspace, should not dependens on any 3rd-party node packages
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
if (fs_1.default.existsSync('node_modules')) {
    const files = fs_1.default.readdirSync('node_modules');
    for (const fname of files) {
        const target = path_1.default.resolve('node_modules', fname);
        try {
            const stat = fs_1.default.lstatSync(target);
            if (stat.isDirectory() && fname.startsWith('@')) {
                const scopeDir = target;
                const scopedNames = fs_1.default.readdirSync(scopeDir);
                for (const partName of scopedNames) {
                    const scopedPkg = path_1.default.resolve(scopeDir, partName);
                    try {
                        if (fs_1.default.lstatSync(scopedPkg).isSymbolicLink()) {
                            fs_1.default.unlinkSync(scopedPkg);
                            // eslint-disable-next-line no-console
                            console.log('[preinstall] delete symlink', scopedPkg);
                        }
                    }
                    catch (err) {
                        // eslint-disable-next-line no-console
                        console.log('[preinstall] delete symlink', scopedPkg);
                        fs_1.default.unlinkSync(scopedPkg);
                    }
                }
            }
            else if (stat.isSymbolicLink()) {
                // eslint-disable-next-line no-console
                console.log('[preinstall] delete symlink', target);
                fs_1.default.unlinkSync(target);
            }
        }
        catch (ex) {
            // eslint-disable-next-line no-console
            console.log('[preinstall] delete symlink', target);
            fs_1.default.unlinkSync(target);
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJlaW5zdGFsbC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3RzL3ByZWluc3RhbGwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOztHQUVHOzs7OztBQUVILDRDQUFvQjtBQUNwQixnREFBd0I7QUFFeEIsSUFBSSxZQUFFLENBQUMsVUFBVSxDQUFDLGNBQWMsQ0FBQyxFQUFFO0lBQ2pDLE1BQU0sS0FBSyxHQUFHLFlBQUUsQ0FBQyxXQUFXLENBQUMsY0FBYyxDQUFDLENBQUM7SUFDN0MsS0FBSyxNQUFNLEtBQUssSUFBSSxLQUFLLEVBQUU7UUFDekIsTUFBTSxNQUFNLEdBQUcsY0FBSSxDQUFDLE9BQU8sQ0FBQyxjQUFjLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDbkQsSUFBSTtZQUNGLE1BQU0sSUFBSSxHQUFHLFlBQUUsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDbEMsSUFBSSxJQUFJLENBQUMsV0FBVyxFQUFFLElBQUksS0FBSyxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsRUFBRTtnQkFDL0MsTUFBTSxRQUFRLEdBQUcsTUFBTSxDQUFDO2dCQUN4QixNQUFNLFdBQVcsR0FBRyxZQUFFLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxDQUFDO2dCQUM3QyxLQUFLLE1BQU0sUUFBUSxJQUFJLFdBQVcsRUFBRTtvQkFDbEMsTUFBTSxTQUFTLEdBQUcsY0FBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUUsUUFBUSxDQUFDLENBQUM7b0JBQ25ELElBQUk7d0JBQ0YsSUFBSSxZQUFFLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxDQUFDLGNBQWMsRUFBRSxFQUFFOzRCQUM1QyxZQUFFLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQyxDQUFDOzRCQUN6QixzQ0FBc0M7NEJBQ3RDLE9BQU8sQ0FBQyxHQUFHLENBQUMsNkJBQTZCLEVBQUUsU0FBUyxDQUFDLENBQUM7eUJBQ3ZEO3FCQUNGO29CQUFDLE9BQU8sR0FBRyxFQUFFO3dCQUNaLHNDQUFzQzt3QkFDdEMsT0FBTyxDQUFDLEdBQUcsQ0FBQyw2QkFBNkIsRUFBRSxTQUFTLENBQUMsQ0FBQzt3QkFDdEQsWUFBRSxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUMsQ0FBQztxQkFDMUI7aUJBQ0Y7YUFDRjtpQkFBTSxJQUFJLElBQUksQ0FBQyxjQUFjLEVBQUUsRUFBRTtnQkFDaEMsc0NBQXNDO2dCQUN0QyxPQUFPLENBQUMsR0FBRyxDQUFDLDZCQUE2QixFQUFFLE1BQU0sQ0FBQyxDQUFDO2dCQUNuRCxZQUFFLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDO2FBQ3ZCO1NBQ0Y7UUFBQyxPQUFPLEVBQUUsRUFBRTtZQUNYLHNDQUFzQztZQUN0QyxPQUFPLENBQUMsR0FBRyxDQUFDLDZCQUE2QixFQUFFLE1BQU0sQ0FBQyxDQUFDO1lBQ25ELFlBQUUsQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUM7U0FDdkI7S0FDRjtDQUNGIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBUaGlzIGZpbGUgaXMgaW50ZW50ZWQgdG8gcnVuIGJlZm9yZSBcIm5wbSBpbnN0YWxsXCIgaW4gd29ya3NwYWNlLCBzaG91bGQgbm90IGRlcGVuZGVucyBvbiBhbnkgM3JkLXBhcnR5IG5vZGUgcGFja2FnZXNcbiAqL1xuXG5pbXBvcnQgZnMgZnJvbSAnZnMnO1xuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5cbmlmIChmcy5leGlzdHNTeW5jKCdub2RlX21vZHVsZXMnKSkge1xuICBjb25zdCBmaWxlcyA9IGZzLnJlYWRkaXJTeW5jKCdub2RlX21vZHVsZXMnKTtcbiAgZm9yIChjb25zdCBmbmFtZSBvZiBmaWxlcykge1xuICAgIGNvbnN0IHRhcmdldCA9IFBhdGgucmVzb2x2ZSgnbm9kZV9tb2R1bGVzJywgZm5hbWUpO1xuICAgIHRyeSB7XG4gICAgICBjb25zdCBzdGF0ID0gZnMubHN0YXRTeW5jKHRhcmdldCk7XG4gICAgICBpZiAoc3RhdC5pc0RpcmVjdG9yeSgpICYmIGZuYW1lLnN0YXJ0c1dpdGgoJ0AnKSkge1xuICAgICAgICBjb25zdCBzY29wZURpciA9IHRhcmdldDtcbiAgICAgICAgY29uc3Qgc2NvcGVkTmFtZXMgPSBmcy5yZWFkZGlyU3luYyhzY29wZURpcik7XG4gICAgICAgIGZvciAoY29uc3QgcGFydE5hbWUgb2Ygc2NvcGVkTmFtZXMpIHtcbiAgICAgICAgICBjb25zdCBzY29wZWRQa2cgPSBQYXRoLnJlc29sdmUoc2NvcGVEaXIsIHBhcnROYW1lKTtcbiAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgaWYgKGZzLmxzdGF0U3luYyhzY29wZWRQa2cpLmlzU3ltYm9saWNMaW5rKCkpIHtcbiAgICAgICAgICAgICAgZnMudW5saW5rU3luYyhzY29wZWRQa2cpO1xuICAgICAgICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgICAgICAgICAgICBjb25zb2xlLmxvZygnW3ByZWluc3RhbGxdIGRlbGV0ZSBzeW1saW5rJywgc2NvcGVkUGtnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgICAgICAgICBjb25zb2xlLmxvZygnW3ByZWluc3RhbGxdIGRlbGV0ZSBzeW1saW5rJywgc2NvcGVkUGtnKTtcbiAgICAgICAgICAgIGZzLnVubGlua1N5bmMoc2NvcGVkUGtnKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAoc3RhdC5pc1N5bWJvbGljTGluaygpKSB7XG4gICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgICAgIGNvbnNvbGUubG9nKCdbcHJlaW5zdGFsbF0gZGVsZXRlIHN5bWxpbmsnLCB0YXJnZXQpO1xuICAgICAgICBmcy51bmxpbmtTeW5jKHRhcmdldCk7XG4gICAgICB9XG4gICAgfSBjYXRjaCAoZXgpIHtcbiAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgICBjb25zb2xlLmxvZygnW3ByZWluc3RhbGxdIGRlbGV0ZSBzeW1saW5rJywgdGFyZ2V0KTtcbiAgICAgIGZzLnVubGlua1N5bmModGFyZ2V0KTtcbiAgICB9XG4gIH1cbn1cbiJdfQ==