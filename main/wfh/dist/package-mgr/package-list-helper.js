"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.packages4Workspace = exports.packages4WorkspaceKey = exports.allPackages = void 0;
const index_1 = require("./index");
function* allPackages(_types, recipeType, projectDirs) {
    // const wsKey = pathToWorkspace(process.cwd());
    if (recipeType !== 'installed') {
        if (projectDirs) {
            for (const projectDir of projectDirs) {
                const projKey = index_1.pathToProjKey(projectDir);
                const pkgNames = index_1.getState().project2Packages.get(projKey);
                if (pkgNames == null)
                    return;
                for (const pkgName of pkgNames) {
                    const pkg = index_1.getState().srcPackages.get(pkgName);
                    if (pkg) {
                        yield pkg;
                    }
                }
            }
        }
        else {
            for (const pkg of index_1.getState().srcPackages.values()) {
                yield pkg;
            }
        }
    }
    if (recipeType !== 'src') {
        for (const ws of index_1.getState().workspaces.values()) {
            const installed = ws.installedComponents;
            if (installed) {
                for (const comp of installed.values()) {
                    yield comp;
                }
            }
        }
    }
}
exports.allPackages = allPackages;
function* packages4WorkspaceKey(wsKey, includeInstalled = true) {
    const ws = index_1.getState().workspaces.get(wsKey);
    if (!ws)
        return;
    const linked = index_1.getState().srcPackages;
    const installed = ws.installedComponents;
    for (const [pkName] of ws.linkedDependencies) {
        const pk = linked.get(pkName);
        if (pk == null)
            console.error(`Missing package ${pkName} in workspace ${wsKey}`);
        else
            yield pk;
    }
    for (const [pkName] of ws.linkedDevDependencies) {
        const pk = linked.get(pkName);
        if (pk == null)
            console.error(`Missing package ${pkName} in workspace ${wsKey}`);
        else
            yield pk;
    }
    if (includeInstalled && installed) {
        for (const comp of installed.values()) {
            yield comp;
        }
    }
}
exports.packages4WorkspaceKey = packages4WorkspaceKey;
function packages4Workspace(workspaceDir, includeInstalled = true) {
    const wsKey = index_1.workspaceKey(workspaceDir || process.cwd());
    return packages4WorkspaceKey(wsKey, includeInstalled);
}
exports.packages4Workspace = packages4Workspace;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFja2FnZS1saXN0LWhlbHBlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3RzL3BhY2thZ2UtbWdyL3BhY2thZ2UtbGlzdC1oZWxwZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsbUNBQTJFO0FBRzNFLFFBQWUsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxNQUFvQyxFQUMvRCxVQUFnQyxFQUFFLFdBQXNCO0lBRXhELGdEQUFnRDtJQUVoRCxJQUFJLFVBQVUsS0FBSyxXQUFXLEVBQUU7UUFDOUIsSUFBSSxXQUFXLEVBQUU7WUFDZixLQUFLLE1BQU0sVUFBVSxJQUFJLFdBQVcsRUFBRTtnQkFDcEMsTUFBTSxPQUFPLEdBQUcscUJBQWEsQ0FBQyxVQUFVLENBQUMsQ0FBQztnQkFDMUMsTUFBTSxRQUFRLEdBQUcsZ0JBQVEsRUFBRSxDQUFDLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQztnQkFDMUQsSUFBSSxRQUFRLElBQUksSUFBSTtvQkFDbEIsT0FBTztnQkFDVCxLQUFLLE1BQU0sT0FBTyxJQUFJLFFBQVEsRUFBRTtvQkFDOUIsTUFBTSxHQUFHLEdBQUcsZ0JBQVEsRUFBRSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUM7b0JBQ2hELElBQUksR0FBRyxFQUFFO3dCQUNQLE1BQU0sR0FBRyxDQUFDO3FCQUNYO2lCQUNGO2FBQ0Y7U0FDRjthQUFNO1lBQ0wsS0FBSyxNQUFNLEdBQUcsSUFBSSxnQkFBUSxFQUFFLENBQUMsV0FBVyxDQUFDLE1BQU0sRUFBRSxFQUFFO2dCQUNqRCxNQUFNLEdBQUcsQ0FBQzthQUNYO1NBQ0Y7S0FDRjtJQUNELElBQUksVUFBVSxLQUFLLEtBQUssRUFBRTtRQUN4QixLQUFLLE1BQU0sRUFBRSxJQUFJLGdCQUFRLEVBQUUsQ0FBQyxVQUFVLENBQUMsTUFBTSxFQUFFLEVBQUU7WUFDL0MsTUFBTSxTQUFTLEdBQUcsRUFBRSxDQUFDLG1CQUFtQixDQUFDO1lBQ3pDLElBQUksU0FBUyxFQUFFO2dCQUNiLEtBQUssTUFBTSxJQUFJLElBQUksU0FBUyxDQUFDLE1BQU0sRUFBRSxFQUFFO29CQUNyQyxNQUFNLElBQUksQ0FBQztpQkFDWjthQUNGO1NBQ0Y7S0FDRjtBQUNILENBQUM7QUFuQ0Qsa0NBbUNDO0FBRUQsUUFBZSxDQUFDLENBQUMscUJBQXFCLENBQUMsS0FBYSxFQUFFLGdCQUFnQixHQUFHLElBQUk7SUFDM0UsTUFBTSxFQUFFLEdBQUcsZ0JBQVEsRUFBRSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDNUMsSUFBSSxDQUFDLEVBQUU7UUFDTCxPQUFPO0lBRVQsTUFBTSxNQUFNLEdBQUcsZ0JBQVEsRUFBRSxDQUFDLFdBQVcsQ0FBQztJQUN0QyxNQUFNLFNBQVMsR0FBRyxFQUFFLENBQUMsbUJBQW1CLENBQUM7SUFDekMsS0FBSyxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxDQUFDLGtCQUFrQixFQUFFO1FBQzVDLE1BQU0sRUFBRSxHQUFHLE1BQU0sQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDOUIsSUFBSSxFQUFFLElBQUksSUFBSTtZQUNaLE9BQU8sQ0FBQyxLQUFLLENBQUMsbUJBQW1CLE1BQU0saUJBQWlCLEtBQUssRUFBRSxDQUFDLENBQUM7O1lBRWpFLE1BQU0sRUFBRSxDQUFDO0tBQ1o7SUFDRCxLQUFLLE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLENBQUMscUJBQXFCLEVBQUU7UUFDL0MsTUFBTSxFQUFFLEdBQUcsTUFBTSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUM5QixJQUFJLEVBQUUsSUFBSSxJQUFJO1lBQ1osT0FBTyxDQUFDLEtBQUssQ0FBQyxtQkFBbUIsTUFBTSxpQkFBaUIsS0FBSyxFQUFFLENBQUMsQ0FBQzs7WUFFakUsTUFBTSxFQUFFLENBQUM7S0FDWjtJQUNELElBQUksZ0JBQWdCLElBQUksU0FBUyxFQUFFO1FBQ2pDLEtBQUssTUFBTSxJQUFJLElBQUksU0FBUyxDQUFDLE1BQU0sRUFBRSxFQUFFO1lBQ3JDLE1BQU0sSUFBSSxDQUFDO1NBQ1o7S0FDRjtBQUNILENBQUM7QUExQkQsc0RBMEJDO0FBRUQsU0FBZ0Isa0JBQWtCLENBQUMsWUFBcUIsRUFBRSxnQkFBZ0IsR0FBRyxJQUFJO0lBQy9FLE1BQU0sS0FBSyxHQUFHLG9CQUFZLENBQUMsWUFBWSxJQUFJLE9BQU8sQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDO0lBQzFELE9BQU8scUJBQXFCLENBQUMsS0FBSyxFQUFFLGdCQUFnQixDQUFDLENBQUM7QUFDeEQsQ0FBQztBQUhELGdEQUdDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtnZXRTdGF0ZSwgcGF0aFRvUHJvaktleSwgd29ya3NwYWNlS2V5LCBQYWNrYWdlSW5mb30gZnJvbSAnLi9pbmRleCc7XG5leHBvcnQgdHlwZSBQYWNrYWdlVHlwZSA9ICcqJyB8ICdidWlsZCcgfCAnY29yZSc7XG5cbmV4cG9ydCBmdW5jdGlvbiogYWxsUGFja2FnZXMoX3R5cGVzPzogUGFja2FnZVR5cGUgfCBQYWNrYWdlVHlwZVtdLFxuICByZWNpcGVUeXBlPzogJ3NyYycgfCAnaW5zdGFsbGVkJywgcHJvamVjdERpcnM/OiBzdHJpbmdbXSk6IEdlbmVyYXRvcjxQYWNrYWdlSW5mbz4ge1xuXG4gIC8vIGNvbnN0IHdzS2V5ID0gcGF0aFRvV29ya3NwYWNlKHByb2Nlc3MuY3dkKCkpO1xuXG4gIGlmIChyZWNpcGVUeXBlICE9PSAnaW5zdGFsbGVkJykge1xuICAgIGlmIChwcm9qZWN0RGlycykge1xuICAgICAgZm9yIChjb25zdCBwcm9qZWN0RGlyIG9mIHByb2plY3REaXJzKSB7XG4gICAgICAgIGNvbnN0IHByb2pLZXkgPSBwYXRoVG9Qcm9qS2V5KHByb2plY3REaXIpO1xuICAgICAgICBjb25zdCBwa2dOYW1lcyA9IGdldFN0YXRlKCkucHJvamVjdDJQYWNrYWdlcy5nZXQocHJvaktleSk7XG4gICAgICAgIGlmIChwa2dOYW1lcyA9PSBudWxsKVxuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgZm9yIChjb25zdCBwa2dOYW1lIG9mIHBrZ05hbWVzKSB7XG4gICAgICAgICAgY29uc3QgcGtnID0gZ2V0U3RhdGUoKS5zcmNQYWNrYWdlcy5nZXQocGtnTmFtZSk7XG4gICAgICAgICAgaWYgKHBrZykge1xuICAgICAgICAgICAgeWllbGQgcGtnO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBmb3IgKGNvbnN0IHBrZyBvZiBnZXRTdGF0ZSgpLnNyY1BhY2thZ2VzLnZhbHVlcygpKSB7XG4gICAgICAgIHlpZWxkIHBrZztcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgaWYgKHJlY2lwZVR5cGUgIT09ICdzcmMnKSB7XG4gICAgZm9yIChjb25zdCB3cyBvZiBnZXRTdGF0ZSgpLndvcmtzcGFjZXMudmFsdWVzKCkpIHtcbiAgICAgIGNvbnN0IGluc3RhbGxlZCA9IHdzLmluc3RhbGxlZENvbXBvbmVudHM7XG4gICAgICBpZiAoaW5zdGFsbGVkKSB7XG4gICAgICAgIGZvciAoY29uc3QgY29tcCBvZiBpbnN0YWxsZWQudmFsdWVzKCkpIHtcbiAgICAgICAgICB5aWVsZCBjb21wO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiogcGFja2FnZXM0V29ya3NwYWNlS2V5KHdzS2V5OiBzdHJpbmcsIGluY2x1ZGVJbnN0YWxsZWQgPSB0cnVlKSB7XG4gIGNvbnN0IHdzID0gZ2V0U3RhdGUoKS53b3Jrc3BhY2VzLmdldCh3c0tleSk7XG4gIGlmICghd3MpXG4gICAgcmV0dXJuO1xuXG4gIGNvbnN0IGxpbmtlZCA9IGdldFN0YXRlKCkuc3JjUGFja2FnZXM7XG4gIGNvbnN0IGluc3RhbGxlZCA9IHdzLmluc3RhbGxlZENvbXBvbmVudHM7XG4gIGZvciAoY29uc3QgW3BrTmFtZV0gb2Ygd3MubGlua2VkRGVwZW5kZW5jaWVzKSB7XG4gICAgY29uc3QgcGsgPSBsaW5rZWQuZ2V0KHBrTmFtZSk7XG4gICAgaWYgKHBrID09IG51bGwpXG4gICAgICBjb25zb2xlLmVycm9yKGBNaXNzaW5nIHBhY2thZ2UgJHtwa05hbWV9IGluIHdvcmtzcGFjZSAke3dzS2V5fWApO1xuICAgIGVsc2VcbiAgICAgIHlpZWxkIHBrO1xuICB9XG4gIGZvciAoY29uc3QgW3BrTmFtZV0gb2Ygd3MubGlua2VkRGV2RGVwZW5kZW5jaWVzKSB7XG4gICAgY29uc3QgcGsgPSBsaW5rZWQuZ2V0KHBrTmFtZSk7XG4gICAgaWYgKHBrID09IG51bGwpXG4gICAgICBjb25zb2xlLmVycm9yKGBNaXNzaW5nIHBhY2thZ2UgJHtwa05hbWV9IGluIHdvcmtzcGFjZSAke3dzS2V5fWApO1xuICAgIGVsc2VcbiAgICAgIHlpZWxkIHBrO1xuICB9XG4gIGlmIChpbmNsdWRlSW5zdGFsbGVkICYmIGluc3RhbGxlZCkge1xuICAgIGZvciAoY29uc3QgY29tcCBvZiBpbnN0YWxsZWQudmFsdWVzKCkpIHtcbiAgICAgIHlpZWxkIGNvbXA7XG4gICAgfVxuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBwYWNrYWdlczRXb3Jrc3BhY2Uod29ya3NwYWNlRGlyPzogc3RyaW5nLCBpbmNsdWRlSW5zdGFsbGVkID0gdHJ1ZSkge1xuICBjb25zdCB3c0tleSA9IHdvcmtzcGFjZUtleSh3b3Jrc3BhY2VEaXIgfHwgcHJvY2Vzcy5jd2QoKSk7XG4gIHJldHVybiBwYWNrYWdlczRXb3Jrc3BhY2VLZXkod3NLZXksIGluY2x1ZGVJbnN0YWxsZWQpO1xufVxuIl19