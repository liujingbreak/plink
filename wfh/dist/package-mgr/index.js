"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const config = require('../../lib/config');
const packageUtils = require('../../lib/packageMgr/packageUtils');
const { green: col1, cyan } = require('chalk');
const path_1 = __importDefault(require("path"));
const recipe_manager_1 = require("../recipe-manager");
function listPackages() {
    let out = '';
    let i = 0;
    packageUtils.findAllPackages(onComponent, 'src');
    function onComponent(name, entryPath, parsedName, json, packagePath) {
        out += `${i++}. ${name}`;
        out += '\n';
    }
    return out;
}
exports.listPackages = listPackages;
function listPackagesByProjects() {
    let out = '';
    for (const prj of config().projectList) {
        out += col1(`Project: ${prj}`) + '\n';
        recipe_manager_1.eachRecipeSrc(prj, (srcDir, recipeDir) => {
            const relDir = path_1.default.relative(prj, srcDir) || '/';
            out += `  ${col1('|-')} ${cyan(relDir)}\n`;
            const deps = Object.keys(require(path_1.default.resolve(recipeDir, 'package.json')).dependencies);
            deps.forEach(name => out += `  ${col1('|')}  ${col1('|-')} ${name}\n`);
        });
        out += '\n';
    }
    // out += '\nInstalled:\n';
    // eachInstalledRecipe((recipeDir) => {
    //   out += `${recipeDir}\n`;
    // });
    return out;
}
exports.listPackagesByProjects = listPackagesByProjects;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy9wYWNrYWdlLW1nci9pbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7OztBQUFBLE1BQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO0FBQzNDLE1BQU0sWUFBWSxHQUFHLE9BQU8sQ0FBQyxtQ0FBbUMsQ0FBQyxDQUFDO0FBQ2xFLE1BQU0sRUFBQyxLQUFLLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBQyxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQztBQUM3QyxnREFBd0I7QUFDeEIsc0RBQWdEO0FBRWhELFNBQWdCLFlBQVk7SUFDMUIsSUFBSSxHQUFHLEdBQUcsRUFBRSxDQUFDO0lBQ2IsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQ1YsWUFBWSxDQUFDLGVBQWUsQ0FBQyxXQUFXLEVBQUUsS0FBSyxDQUFDLENBQUM7SUFFakQsU0FBUyxXQUFXLENBQUMsSUFBWSxFQUFFLFNBQWlCLEVBQUUsVUFBa0IsRUFBRSxJQUFTLEVBQUUsV0FBbUI7UUFDdEcsR0FBRyxJQUFJLEdBQUcsQ0FBQyxFQUFFLEtBQUssSUFBSSxFQUFFLENBQUM7UUFDekIsR0FBRyxJQUFJLElBQUksQ0FBQztJQUNkLENBQUM7SUFDRCxPQUFPLEdBQUcsQ0FBQztBQUNiLENBQUM7QUFWRCxvQ0FVQztBQUVELFNBQWdCLHNCQUFzQjtJQUNwQyxJQUFJLEdBQUcsR0FBRyxFQUFFLENBQUM7SUFDYixLQUFLLE1BQU0sR0FBRyxJQUFJLE1BQU0sRUFBRSxDQUFDLFdBQVcsRUFBRTtRQUN0QyxHQUFHLElBQUksSUFBSSxDQUFDLFlBQVksR0FBRyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUM7UUFDdEMsOEJBQWEsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxNQUFNLEVBQUUsU0FBUyxFQUFFLEVBQUU7WUFDdkMsTUFBTSxNQUFNLEdBQUcsY0FBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLEVBQUUsTUFBTSxDQUFDLElBQUksR0FBRyxDQUFDO1lBQ2pELEdBQUcsSUFBSSxLQUFLLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQztZQUMzQyxNQUFNLElBQUksR0FBYSxNQUFNLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxjQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSxjQUFjLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFDO1lBQ2xHLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQU0sSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLElBQUksSUFBSSxDQUFDLENBQUM7UUFDMUUsQ0FBQyxDQUFDLENBQUM7UUFDSCxHQUFHLElBQUksSUFBSSxDQUFDO0tBQ2I7SUFDRCwyQkFBMkI7SUFDM0IsdUNBQXVDO0lBQ3ZDLDZCQUE2QjtJQUM3QixNQUFNO0lBQ04sT0FBTyxHQUFHLENBQUM7QUFDYixDQUFDO0FBakJELHdEQWlCQyIsInNvdXJjZXNDb250ZW50IjpbImNvbnN0IGNvbmZpZyA9IHJlcXVpcmUoJy4uLy4uL2xpYi9jb25maWcnKTtcbmNvbnN0IHBhY2thZ2VVdGlscyA9IHJlcXVpcmUoJy4uLy4uL2xpYi9wYWNrYWdlTWdyL3BhY2thZ2VVdGlscycpO1xuY29uc3Qge2dyZWVuOiBjb2wxLCBjeWFufSA9IHJlcXVpcmUoJ2NoYWxrJyk7XG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7ZWFjaFJlY2lwZVNyY30gZnJvbSAnLi4vcmVjaXBlLW1hbmFnZXInO1xuXG5leHBvcnQgZnVuY3Rpb24gbGlzdFBhY2thZ2VzKCk6IHN0cmluZyB7XG4gIGxldCBvdXQgPSAnJztcbiAgbGV0IGkgPSAwO1xuICBwYWNrYWdlVXRpbHMuZmluZEFsbFBhY2thZ2VzKG9uQ29tcG9uZW50LCAnc3JjJyk7XG5cbiAgZnVuY3Rpb24gb25Db21wb25lbnQobmFtZTogc3RyaW5nLCBlbnRyeVBhdGg6IHN0cmluZywgcGFyc2VkTmFtZTogc3RyaW5nLCBqc29uOiBhbnksIHBhY2thZ2VQYXRoOiBzdHJpbmcpIHtcbiAgICBvdXQgKz0gYCR7aSsrfS4gJHtuYW1lfWA7XG4gICAgb3V0ICs9ICdcXG4nO1xuICB9XG4gIHJldHVybiBvdXQ7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBsaXN0UGFja2FnZXNCeVByb2plY3RzKCkge1xuICBsZXQgb3V0ID0gJyc7XG4gIGZvciAoY29uc3QgcHJqIG9mIGNvbmZpZygpLnByb2plY3RMaXN0KSB7XG4gICAgb3V0ICs9IGNvbDEoYFByb2plY3Q6ICR7cHJqfWApICsgJ1xcbic7XG4gICAgZWFjaFJlY2lwZVNyYyhwcmosIChzcmNEaXIsIHJlY2lwZURpcikgPT4ge1xuICAgICAgY29uc3QgcmVsRGlyID0gUGF0aC5yZWxhdGl2ZShwcmosIHNyY0RpcikgfHwgJy8nO1xuICAgICAgb3V0ICs9IGAgICR7Y29sMSgnfC0nKX0gJHtjeWFuKHJlbERpcil9XFxuYDtcbiAgICAgIGNvbnN0IGRlcHM6IHN0cmluZ1tdID0gT2JqZWN0LmtleXMocmVxdWlyZShQYXRoLnJlc29sdmUocmVjaXBlRGlyLCAncGFja2FnZS5qc29uJykpLmRlcGVuZGVuY2llcyk7XG4gICAgICBkZXBzLmZvckVhY2gobmFtZSA9PiBvdXQgKz0gYCAgJHtjb2wxKCd8Jyl9ICAkeyBjb2wxKCd8LScpfSAke25hbWV9XFxuYCk7XG4gICAgfSk7XG4gICAgb3V0ICs9ICdcXG4nO1xuICB9XG4gIC8vIG91dCArPSAnXFxuSW5zdGFsbGVkOlxcbic7XG4gIC8vIGVhY2hJbnN0YWxsZWRSZWNpcGUoKHJlY2lwZURpcikgPT4ge1xuICAvLyAgIG91dCArPSBgJHtyZWNpcGVEaXJ9XFxuYDtcbiAgLy8gfSk7XG4gIHJldHVybiBvdXQ7XG59XG4iXX0=