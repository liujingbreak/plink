"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
// tslint:disable no-console
const fs_extra_1 = tslib_1.__importDefault(require("fs-extra"));
const path_1 = tslib_1.__importDefault(require("path"));
const lodash_1 = tslib_1.__importDefault(require("lodash"));
const chalk_1 = tslib_1.__importDefault(require("chalk"));
function genPackage(path, dryrun = false) {
    if (!path) {
        throw new Error('Lack of arguments');
    }
    if (dryrun) {
        // tslint:disable-next-line: no-console
        console.log('[cra-scripts cmd] dryrun mode');
    }
    const ma = /^@[^/]\/([^]*)$/.exec(path);
    if (ma) {
        path = ma[1];
    }
    const dir = path_1.default.resolve('projects/cra-lib', path);
    fs_extra_1.default.mkdirpSync(dir);
    copyTempl(dir, path_1.default.basename(path), dryrun);
    console.log('[cra-scripts cmd] You need to run `drcp init`');
}
exports.genPackage = genPackage;
function copyTempl(to, pkName, dryrun) {
    const templDir = path_1.default.resolve(__dirname, '..', 'template');
    const files = fs_extra_1.default.readdirSync(templDir);
    for (const sub of files) {
        const file = path_1.default.resolve(templDir, sub);
        if (fs_extra_1.default.statSync(file).isDirectory()) {
            if (!dryrun)
                fs_extra_1.default.mkdirpSync(path_1.default.resolve(to, sub));
            const relative = path_1.default.relative(templDir, file);
            files.push(...fs_extra_1.default.readdirSync(file).map(child => path_1.default.join(relative, child)));
            continue;
        }
        const newFile = path_1.default.resolve(to, sub.slice(0, sub.lastIndexOf('.')).replace(/-([^-/\\]+)$/, '.$1'));
        if (!fs_extra_1.default.existsSync(newFile)) {
            if (sub === 'package-json.json') {
                const pkJsonStr = fs_extra_1.default.readFileSync(path_1.default.resolve(templDir, sub), 'utf8');
                const newFile = path_1.default.resolve(to, 'package.json');
                if (!dryrun)
                    fs_extra_1.default.writeFile(newFile, lodash_1.default.template(pkJsonStr)({ name: path_1.default.basename('@bk/' + pkName) }));
                console.log(`[cra-scripts cmd] ${chalk_1.default.green(path_1.default.relative(path_1.default.resolve(), newFile))} is created`);
                continue;
            }
            if (!dryrun)
                fs_extra_1.default.copyFile(path_1.default.resolve(templDir, sub), newFile);
            console.log(`[cra-scripts cmd] ${chalk_1.default.green(path_1.default.relative(path_1.default.resolve(), newFile))} is created`);
        }
        else {
            console.log('[cra-scripts cmd] target file already exists:', path_1.default.relative(path_1.default.resolve(), newFile));
        }
    }
}

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AYmsvY3JhLXNjcmlwdHMvdHMvY21kLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLDRCQUE0QjtBQUM1QixnRUFBMEI7QUFDMUIsd0RBQXdCO0FBQ3hCLDREQUF1QjtBQUN2QiwwREFBMEI7QUFFMUIsU0FBZ0IsVUFBVSxDQUFDLElBQVksRUFBRSxNQUFNLEdBQUcsS0FBSztJQUNyRCxJQUFJLENBQUMsSUFBSSxFQUFFO1FBQ1QsTUFBTSxJQUFJLEtBQUssQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO0tBQ3RDO0lBQ0QsSUFBSSxNQUFNLEVBQUU7UUFDVix1Q0FBdUM7UUFDdkMsT0FBTyxDQUFDLEdBQUcsQ0FBQywrQkFBK0IsQ0FBQyxDQUFDO0tBQzlDO0lBQ0QsTUFBTSxFQUFFLEdBQUcsaUJBQWlCLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ3hDLElBQUksRUFBRSxFQUFFO1FBQ04sSUFBSSxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztLQUNkO0lBQ0QsTUFBTSxHQUFHLEdBQUcsY0FBSSxDQUFDLE9BQU8sQ0FBQyxrQkFBa0IsRUFBRSxJQUFJLENBQUMsQ0FBQztJQUNuRCxrQkFBRSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUVuQixTQUFTLENBQUMsR0FBRyxFQUFFLGNBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUM7SUFDNUMsT0FBTyxDQUFDLEdBQUcsQ0FBQywrQ0FBK0MsQ0FBQyxDQUFDO0FBQy9ELENBQUM7QUFqQkQsZ0NBaUJDO0FBRUQsU0FBUyxTQUFTLENBQUMsRUFBVSxFQUFFLE1BQWMsRUFBRSxNQUFlO0lBQzVELE1BQU0sUUFBUSxHQUFHLGNBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLElBQUksRUFBRSxVQUFVLENBQUMsQ0FBQztJQUMzRCxNQUFNLEtBQUssR0FBRyxrQkFBRSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUN2QyxLQUFLLE1BQU0sR0FBRyxJQUFJLEtBQUssRUFBRTtRQUN2QixNQUFNLElBQUksR0FBRyxjQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxHQUFHLENBQUMsQ0FBQztRQUN6QyxJQUFJLGtCQUFFLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLFdBQVcsRUFBRSxFQUFFO1lBQ25DLElBQUksQ0FBQyxNQUFNO2dCQUNULGtCQUFFLENBQUMsVUFBVSxDQUFDLGNBQUksQ0FBQyxPQUFPLENBQUMsRUFBRSxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDdkMsTUFBTSxRQUFRLEdBQUcsY0FBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDL0MsS0FBSyxDQUFDLElBQUksQ0FBQyxHQUFHLGtCQUFFLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLGNBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUM3RSxTQUFTO1NBQ1Y7UUFDRCxNQUFNLE9BQU8sR0FBRyxjQUFJLENBQUMsT0FBTyxDQUFDLEVBQUUsRUFBRSxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLGNBQWMsRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBQ3BHLElBQUksQ0FBQyxrQkFBRSxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsRUFBRTtZQUMzQixJQUFJLEdBQUcsS0FBSyxtQkFBbUIsRUFBRTtnQkFDL0IsTUFBTSxTQUFTLEdBQUcsa0JBQUUsQ0FBQyxZQUFZLENBQUMsY0FBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUUsR0FBRyxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUM7Z0JBQ3ZFLE1BQU0sT0FBTyxHQUFHLGNBQUksQ0FBQyxPQUFPLENBQUMsRUFBRSxFQUFFLGNBQWMsQ0FBQyxDQUFDO2dCQUNqRCxJQUFJLENBQUMsTUFBTTtvQkFDVCxrQkFBRSxDQUFDLFNBQVMsQ0FBQyxPQUFPLEVBQUUsZ0JBQUMsQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBQyxJQUFJLEVBQUUsY0FBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQ3ZGLE9BQU8sQ0FBQyxHQUFHLENBQUMscUJBQXFCLGVBQUssQ0FBQyxLQUFLLENBQUMsY0FBSSxDQUFDLFFBQVEsQ0FBQyxjQUFJLENBQUMsT0FBTyxFQUFFLEVBQUUsT0FBTyxDQUFDLENBQUMsYUFBYSxDQUFDLENBQUM7Z0JBQ25HLFNBQVM7YUFDVjtZQUNELElBQUksQ0FBQyxNQUFNO2dCQUNULGtCQUFFLENBQUMsUUFBUSxDQUFDLGNBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFLEdBQUcsQ0FBQyxFQUFFLE9BQU8sQ0FBQyxDQUFDO1lBQ3BELE9BQU8sQ0FBQyxHQUFHLENBQUMscUJBQXFCLGVBQUssQ0FBQyxLQUFLLENBQUMsY0FBSSxDQUFDLFFBQVEsQ0FBQyxjQUFJLENBQUMsT0FBTyxFQUFFLEVBQUUsT0FBTyxDQUFDLENBQUMsYUFBYSxDQUFDLENBQUM7U0FDcEc7YUFBTTtZQUNMLE9BQU8sQ0FBQyxHQUFHLENBQUMsK0NBQStDLEVBQUUsY0FBSSxDQUFDLFFBQVEsQ0FBQyxjQUFJLENBQUMsT0FBTyxFQUFFLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQztTQUN0RztLQUNGO0FBQ0gsQ0FBQyIsImZpbGUiOiJub2RlX21vZHVsZXMvQGJrL2NyYS1zY3JpcHRzL2Rpc3QvY21kLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLy8gdHNsaW50OmRpc2FibGUgbm8tY29uc29sZVxuaW1wb3J0IGZzIGZyb20gJ2ZzLWV4dHJhJztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCBjaGFsayBmcm9tICdjaGFsayc7XG5cbmV4cG9ydCBmdW5jdGlvbiBnZW5QYWNrYWdlKHBhdGg6IHN0cmluZywgZHJ5cnVuID0gZmFsc2UpIHtcbiAgaWYgKCFwYXRoKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdMYWNrIG9mIGFyZ3VtZW50cycpO1xuICB9XG4gIGlmIChkcnlydW4pIHtcbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICBjb25zb2xlLmxvZygnW2NyYS1zY3JpcHRzIGNtZF0gZHJ5cnVuIG1vZGUnKTtcbiAgfVxuICBjb25zdCBtYSA9IC9eQFteL11cXC8oW15dKikkLy5leGVjKHBhdGgpO1xuICBpZiAobWEpIHtcbiAgICBwYXRoID0gbWFbMV07XG4gIH1cbiAgY29uc3QgZGlyID0gUGF0aC5yZXNvbHZlKCdwcm9qZWN0cy9jcmEtbGliJywgcGF0aCk7XG4gIGZzLm1rZGlycFN5bmMoZGlyKTtcblxuICBjb3B5VGVtcGwoZGlyLCBQYXRoLmJhc2VuYW1lKHBhdGgpLCBkcnlydW4pO1xuICBjb25zb2xlLmxvZygnW2NyYS1zY3JpcHRzIGNtZF0gWW91IG5lZWQgdG8gcnVuIGBkcmNwIGluaXRgJyk7XG59XG5cbmZ1bmN0aW9uIGNvcHlUZW1wbCh0bzogc3RyaW5nLCBwa05hbWU6IHN0cmluZywgZHJ5cnVuOiBib29sZWFuKSB7XG4gIGNvbnN0IHRlbXBsRGlyID0gUGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4uJywgJ3RlbXBsYXRlJyk7XG4gIGNvbnN0IGZpbGVzID0gZnMucmVhZGRpclN5bmModGVtcGxEaXIpO1xuICBmb3IgKGNvbnN0IHN1YiBvZiBmaWxlcykge1xuICAgIGNvbnN0IGZpbGUgPSBQYXRoLnJlc29sdmUodGVtcGxEaXIsIHN1Yik7XG4gICAgaWYgKGZzLnN0YXRTeW5jKGZpbGUpLmlzRGlyZWN0b3J5KCkpIHtcbiAgICAgIGlmICghZHJ5cnVuKVxuICAgICAgICBmcy5ta2RpcnBTeW5jKFBhdGgucmVzb2x2ZSh0bywgc3ViKSk7XG4gICAgICBjb25zdCByZWxhdGl2ZSA9IFBhdGgucmVsYXRpdmUodGVtcGxEaXIsIGZpbGUpO1xuICAgICAgZmlsZXMucHVzaCguLi5mcy5yZWFkZGlyU3luYyhmaWxlKS5tYXAoY2hpbGQgPT4gUGF0aC5qb2luKHJlbGF0aXZlLCBjaGlsZCkpKTtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cbiAgICBjb25zdCBuZXdGaWxlID0gUGF0aC5yZXNvbHZlKHRvLCBzdWIuc2xpY2UoMCwgc3ViLmxhc3RJbmRleE9mKCcuJykpLnJlcGxhY2UoLy0oW14tL1xcXFxdKykkLywgJy4kMScpKTtcbiAgICBpZiAoIWZzLmV4aXN0c1N5bmMobmV3RmlsZSkpIHtcbiAgICAgIGlmIChzdWIgPT09ICdwYWNrYWdlLWpzb24uanNvbicpIHtcbiAgICAgICAgY29uc3QgcGtKc29uU3RyID0gZnMucmVhZEZpbGVTeW5jKFBhdGgucmVzb2x2ZSh0ZW1wbERpciwgc3ViKSwgJ3V0ZjgnKTtcbiAgICAgICAgY29uc3QgbmV3RmlsZSA9IFBhdGgucmVzb2x2ZSh0bywgJ3BhY2thZ2UuanNvbicpO1xuICAgICAgICBpZiAoIWRyeXJ1bilcbiAgICAgICAgICBmcy53cml0ZUZpbGUobmV3RmlsZSwgXy50ZW1wbGF0ZShwa0pzb25TdHIpKHtuYW1lOiBQYXRoLmJhc2VuYW1lKCdAYmsvJyArIHBrTmFtZSl9KSk7XG4gICAgICAgIGNvbnNvbGUubG9nKGBbY3JhLXNjcmlwdHMgY21kXSAke2NoYWxrLmdyZWVuKFBhdGgucmVsYXRpdmUoUGF0aC5yZXNvbHZlKCksIG5ld0ZpbGUpKX0gaXMgY3JlYXRlZGApO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIGlmICghZHJ5cnVuKVxuICAgICAgICBmcy5jb3B5RmlsZShQYXRoLnJlc29sdmUodGVtcGxEaXIsIHN1YiksIG5ld0ZpbGUpO1xuICAgICAgY29uc29sZS5sb2coYFtjcmEtc2NyaXB0cyBjbWRdICR7Y2hhbGsuZ3JlZW4oUGF0aC5yZWxhdGl2ZShQYXRoLnJlc29sdmUoKSwgbmV3RmlsZSkpfSBpcyBjcmVhdGVkYCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnNvbGUubG9nKCdbY3JhLXNjcmlwdHMgY21kXSB0YXJnZXQgZmlsZSBhbHJlYWR5IGV4aXN0czonLCBQYXRoLnJlbGF0aXZlKFBhdGgucmVzb2x2ZSgpLCBuZXdGaWxlKSk7XG4gICAgfVxuICB9XG59XG4iXX0=
