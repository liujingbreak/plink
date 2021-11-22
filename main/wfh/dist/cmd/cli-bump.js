"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const package_mgr_1 = require("../package-mgr");
const process_utils_1 = require("../process-utils");
const utils_1 = require("./utils");
const log4js_1 = __importDefault(require("log4js"));
// import Path from 'path';
require("../editor-helper");
const log = log4js_1.default.getLogger('plin.cli-bump');
async function default_1(options) {
    if (options.packages.length > 0) {
        await bumpPackages(options.packages, options.increVersion);
    }
    else if (options.project.length > 0) {
        const pkgNames = options.project.map(proj => (0, package_mgr_1.pathToProjKey)(proj)).reduce((pkgs, proj) => {
            const pkgsOfProj = (0, package_mgr_1.getState)().project2Packages.get(proj);
            if (pkgsOfProj)
                pkgs.push(...pkgsOfProj);
            return pkgs;
        }, []);
        await bumpPackages(pkgNames, options.increVersion);
    }
    await new Promise(resolve => setImmediate(resolve));
    package_mgr_1.actionDispatcher.scanAndSyncPackages({});
}
exports.default = default_1;
async function bumpPackages(pkgNames, increVersion) {
    await Promise.all(Array.from((0, utils_1.findPackagesByNames)((0, package_mgr_1.getState)(), pkgNames)).filter((pkg, idx) => {
        const rs = pkg != null;
        if (!rs) {
            log.error(`Can not find package for name like: ${pkgNames[idx]}`);
        }
        return rs;
    }).map((pkg) => {
        log.info(`bump ${pkg.name} version`);
        const pkDir = pkg.realPath;
        return (0, process_utils_1.exe)('npm', 'version', increVersion, '--no-commit-hooks', '--no-git-tag-version', { cwd: pkDir }).promise;
    }));
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLWJ1bXAuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy9jbWQvY2xpLWJ1bXAudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7QUFDQSxnREFBeUU7QUFDekUsb0RBQXVDO0FBQ3ZDLG1DQUE0QztBQUM1QyxvREFBNEI7QUFDNUIsMkJBQTJCO0FBQzNCLDRCQUEwQjtBQUUxQixNQUFNLEdBQUcsR0FBRyxnQkFBTSxDQUFDLFNBQVMsQ0FBQyxlQUFlLENBQUMsQ0FBQztBQUUvQixLQUFLLG9CQUFVLE9BQTJDO0lBQ3ZFLElBQUksT0FBTyxDQUFDLFFBQVEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO1FBQy9CLE1BQU0sWUFBWSxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUUsT0FBTyxDQUFDLFlBQVksQ0FBQyxDQUFDO0tBQzVEO1NBQU0sSUFBSSxPQUFPLENBQUMsT0FBTyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUU7UUFDckMsTUFBTSxRQUFRLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFBLDJCQUFhLEVBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQ3RFLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxFQUFFO1lBQ2IsTUFBTSxVQUFVLEdBQUcsSUFBQSxzQkFBUSxHQUFFLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ3pELElBQUksVUFBVTtnQkFDWixJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsVUFBVSxDQUFDLENBQUM7WUFDM0IsT0FBTyxJQUFJLENBQUM7UUFDZCxDQUFDLEVBQ0QsRUFBYyxDQUFDLENBQUM7UUFFbEIsTUFBTSxZQUFZLENBQUMsUUFBUSxFQUFFLE9BQU8sQ0FBQyxZQUFZLENBQUMsQ0FBQztLQUNwRDtJQUNELE1BQU0sSUFBSSxPQUFPLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztJQUNwRCw4QkFBZ0IsQ0FBQyxtQkFBbUIsQ0FBQyxFQUFFLENBQUMsQ0FBQztBQUMzQyxDQUFDO0FBakJELDRCQWlCQztBQUVELEtBQUssVUFBVSxZQUFZLENBQUMsUUFBa0IsRUFBRSxZQUFvQjtJQUNsRSxNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFBLDJCQUFtQixFQUFDLElBQUEsc0JBQVEsR0FBRSxFQUFFLFFBQVEsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxFQUFFO1FBQzFGLE1BQU0sRUFBRSxHQUFHLEdBQUcsSUFBSSxJQUFJLENBQUM7UUFDdkIsSUFBSSxDQUFDLEVBQUUsRUFBRTtZQUNQLEdBQUcsQ0FBQyxLQUFLLENBQUMsdUNBQXVDLFFBQVEsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUM7U0FDbkU7UUFDRCxPQUFPLEVBQUUsQ0FBQztJQUNaLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFFO1FBQ2IsR0FBRyxDQUFDLElBQUksQ0FBQyxRQUFRLEdBQUksQ0FBQyxJQUFJLFVBQVUsQ0FBQyxDQUFDO1FBQ3RDLE1BQU0sS0FBSyxHQUFHLEdBQUksQ0FBQyxRQUFRLENBQUM7UUFDNUIsT0FBTyxJQUFBLG1CQUFHLEVBQUMsS0FBSyxFQUFFLFNBQVMsRUFBRSxZQUFZLEVBQUUsbUJBQW1CLEVBQUUsc0JBQXNCLEVBQUUsRUFBQyxHQUFHLEVBQUUsS0FBSyxFQUFDLENBQUMsQ0FBQyxPQUFPLENBQUM7SUFDaEgsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNOLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge0J1bXBPcHRpb25zfSBmcm9tICcuL3R5cGVzJztcbmltcG9ydCB7Z2V0U3RhdGUsIHBhdGhUb1Byb2pLZXksIGFjdGlvbkRpc3BhdGNoZXJ9IGZyb20gJy4uL3BhY2thZ2UtbWdyJztcbmltcG9ydCB7IGV4ZSB9IGZyb20gJy4uL3Byb2Nlc3MtdXRpbHMnO1xuaW1wb3J0IHtmaW5kUGFja2FnZXNCeU5hbWVzfSBmcm9tICcuL3V0aWxzJztcbmltcG9ydCBsb2c0anMgZnJvbSAnbG9nNGpzJztcbi8vIGltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0ICcuLi9lZGl0b3ItaGVscGVyJztcblxuY29uc3QgbG9nID0gbG9nNGpzLmdldExvZ2dlcigncGxpbi5jbGktYnVtcCcpO1xuXG5leHBvcnQgZGVmYXVsdCBhc3luYyBmdW5jdGlvbihvcHRpb25zOiBCdW1wT3B0aW9ucyAmIHtwYWNrYWdlczogc3RyaW5nW119KSB7XG4gIGlmIChvcHRpb25zLnBhY2thZ2VzLmxlbmd0aCA+IDApIHtcbiAgICBhd2FpdCBidW1wUGFja2FnZXMob3B0aW9ucy5wYWNrYWdlcywgb3B0aW9ucy5pbmNyZVZlcnNpb24pO1xuICB9IGVsc2UgaWYgKG9wdGlvbnMucHJvamVjdC5sZW5ndGggPiAwKSB7XG4gICAgY29uc3QgcGtnTmFtZXMgPSBvcHRpb25zLnByb2plY3QubWFwKHByb2ogPT4gcGF0aFRvUHJvaktleShwcm9qKSkucmVkdWNlKFxuICAgICAgKHBrZ3MsIHByb2opID0+IHtcbiAgICAgICAgY29uc3QgcGtnc09mUHJvaiA9IGdldFN0YXRlKCkucHJvamVjdDJQYWNrYWdlcy5nZXQocHJvaik7XG4gICAgICAgIGlmIChwa2dzT2ZQcm9qKVxuICAgICAgICAgIHBrZ3MucHVzaCguLi5wa2dzT2ZQcm9qKTtcbiAgICAgICAgcmV0dXJuIHBrZ3M7XG4gICAgICB9LFxuICAgICAgW10gYXMgc3RyaW5nW10pO1xuXG4gICAgYXdhaXQgYnVtcFBhY2thZ2VzKHBrZ05hbWVzLCBvcHRpb25zLmluY3JlVmVyc2lvbik7XG4gIH1cbiAgYXdhaXQgbmV3IFByb21pc2UocmVzb2x2ZSA9PiBzZXRJbW1lZGlhdGUocmVzb2x2ZSkpO1xuICBhY3Rpb25EaXNwYXRjaGVyLnNjYW5BbmRTeW5jUGFja2FnZXMoe30pO1xufVxuXG5hc3luYyBmdW5jdGlvbiBidW1wUGFja2FnZXMocGtnTmFtZXM6IHN0cmluZ1tdLCBpbmNyZVZlcnNpb246IHN0cmluZykge1xuICBhd2FpdCBQcm9taXNlLmFsbChBcnJheS5mcm9tKGZpbmRQYWNrYWdlc0J5TmFtZXMoZ2V0U3RhdGUoKSwgcGtnTmFtZXMpKS5maWx0ZXIoKHBrZywgaWR4KSA9PiB7XG4gICAgY29uc3QgcnMgPSBwa2cgIT0gbnVsbDtcbiAgICBpZiAoIXJzKSB7XG4gICAgICBsb2cuZXJyb3IoYENhbiBub3QgZmluZCBwYWNrYWdlIGZvciBuYW1lIGxpa2U6ICR7cGtnTmFtZXNbaWR4XX1gKTtcbiAgICB9XG4gICAgcmV0dXJuIHJzO1xuICB9KS5tYXAoKHBrZykgPT4ge1xuICAgIGxvZy5pbmZvKGBidW1wICR7cGtnIS5uYW1lfSB2ZXJzaW9uYCk7XG4gICAgY29uc3QgcGtEaXIgPSBwa2chLnJlYWxQYXRoO1xuICAgIHJldHVybiBleGUoJ25wbScsICd2ZXJzaW9uJywgaW5jcmVWZXJzaW9uLCAnLS1uby1jb21taXQtaG9va3MnLCAnLS1uby1naXQtdGFnLXZlcnNpb24nLCB7Y3dkOiBwa0Rpcn0pLnByb21pc2U7XG4gIH0pKTtcbn1cbiJdfQ==