"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const glob_1 = tslib_1.__importDefault(require("glob"));
const pify_1 = tslib_1.__importDefault(require("pify"));
const fs_1 = tslib_1.__importDefault(require("fs"));
const ts_ast_query_1 = tslib_1.__importDefault(require("@dr-core/ng-app-builder/dist/utils/ts-ast-query"));
const log = require('log4js').getLogger('ng-schematics');
// You don't have to export the function as default. You can also have more than one rule factory
// per file.
function help(options) {
    return (tree, context) => {
        context.logger.info('This schematics is for:\n\
    Upgrading source code to be compatible to Angular 8.\n\
    Be aware there is not "--dryRun" supported for all commands here\
    '.replace(/^\s+/mg, ''));
        // context.addTask()
        fixViewChild(options.dir);
        return tree;
    };
}
exports.help = help;
function fixViewChild(dir = '.') {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        log.info('scan', dir);
        dir = dir.replace(/\/$/g, '');
        const globAsync = pify_1.default(glob_1.default);
        const matches = yield globAsync(dir + '/**/*.ts');
        log.info(matches);
        for (const file of matches) {
            const sel = new ts_ast_query_1.default(fs_1.default.readFileSync(file, 'utf8'), file);
            // sel.printAll();
            const foundModule = sel.findWith('^:ImportDeclaration>.moduleSpecifier:StringLiteral', (ast, path, parents) => {
                log.info('-', ast.text);
                if (ast.text === '@angular/core') {
                    sel.printAll(ast.parent);
                    return sel.findAll(ast.parent, '.namedBindings > .elements > .name')
                        .map(node => node.getText(sel.src));
                }
            });
            if (foundModule) {
                log.info('import:', foundModule);
                // sel.printAll();
            }
        }
    });
}
exports.fixViewChild = fixViewChild;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHIvbmctc2NoZW1hdGljcy9zcmMvbmctc2NoZW1hdGljcy9pbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFDQSx3REFBd0I7QUFDeEIsd0RBQXdCO0FBQ3hCLG9EQUFvQjtBQUdwQiwyR0FBdUU7QUFDdkUsTUFBTSxHQUFHLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxlQUFlLENBQUMsQ0FBQztBQUV6RCxpR0FBaUc7QUFDakcsWUFBWTtBQUNaLFNBQWdCLElBQUksQ0FBQyxPQUFzQjtJQUN6QyxPQUFPLENBQUMsSUFBVSxFQUFFLE9BQXlCLEVBQUUsRUFBRTtRQUMvQyxPQUFPLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQzs7O0tBR25CLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3pCLG9CQUFvQjtRQUNwQixZQUFZLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQzFCLE9BQU8sSUFBSSxDQUFDO0lBQ2QsQ0FBQyxDQUFDO0FBQ0osQ0FBQztBQVZELG9CQVVDO0FBRUQsU0FBc0IsWUFBWSxDQUFDLEdBQUcsR0FBRyxHQUFHOztRQUMxQyxHQUFHLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxHQUFHLENBQUMsQ0FBQztRQUN0QixHQUFHLEdBQUcsR0FBRyxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDOUIsTUFBTSxTQUFTLEdBQUcsY0FBSSxDQUFDLGNBQUksQ0FBQyxDQUFDO1FBQzdCLE1BQU0sT0FBTyxHQUFhLE1BQU0sU0FBUyxDQUFDLEdBQUcsR0FBRyxVQUFVLENBQUMsQ0FBQztRQUM1RCxHQUFHLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ2xCLEtBQUssTUFBTSxJQUFJLElBQUksT0FBTyxFQUFFO1lBQzFCLE1BQU0sR0FBRyxHQUFHLElBQUksc0JBQVEsQ0FBQyxZQUFFLENBQUMsWUFBWSxDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztZQUM5RCxrQkFBa0I7WUFDbEIsTUFBTSxXQUFXLEdBQUcsR0FBRyxDQUFDLFFBQVEsQ0FBQyxvREFBb0QsRUFDbkYsQ0FBQyxHQUFxQixFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsRUFBRTtnQkFDekMsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO2dCQUN4QixJQUFJLEdBQUcsQ0FBQyxJQUFJLEtBQUssZUFBZSxFQUFFO29CQUNoQyxHQUFHLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQztvQkFDekIsT0FBTyxHQUFHLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsb0NBQW9DLENBQUM7eUJBQ25FLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7aUJBQ3JDO1lBQ0gsQ0FBQyxDQUFDLENBQUM7WUFDSCxJQUFJLFdBQVcsRUFBRTtnQkFDZixHQUFHLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxXQUFXLENBQUMsQ0FBQztnQkFDakMsa0JBQWtCO2FBQ25CO1NBQ0Y7SUFDSCxDQUFDO0NBQUE7QUF2QkQsb0NBdUJDIiwiZmlsZSI6Im5vZGVfbW9kdWxlcy9AZHIvbmctc2NoZW1hdGljcy9kaXN0L25nLXNjaGVtYXRpY3MvaW5kZXguanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBSdWxlLCBTY2hlbWF0aWNDb250ZXh0LCBUcmVlIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L3NjaGVtYXRpY3MnO1xuaW1wb3J0IGdsb2IgZnJvbSAnZ2xvYic7XG5pbXBvcnQgcGlmeSBmcm9tICdwaWZ5JztcbmltcG9ydCBmcyBmcm9tICdmcyc7XG5cbmltcG9ydCB0cyBmcm9tICd0eXBlc2NyaXB0JztcbmltcG9ydCBTZWxlY3RvciBmcm9tICdAZHItY29yZS9uZy1hcHAtYnVpbGRlci9kaXN0L3V0aWxzL3RzLWFzdC1xdWVyeSc7XG5jb25zdCBsb2cgPSByZXF1aXJlKCdsb2c0anMnKS5nZXRMb2dnZXIoJ25nLXNjaGVtYXRpY3MnKTtcblxuLy8gWW91IGRvbid0IGhhdmUgdG8gZXhwb3J0IHRoZSBmdW5jdGlvbiBhcyBkZWZhdWx0LiBZb3UgY2FuIGFsc28gaGF2ZSBtb3JlIHRoYW4gb25lIHJ1bGUgZmFjdG9yeVxuLy8gcGVyIGZpbGUuXG5leHBvcnQgZnVuY3Rpb24gaGVscChvcHRpb25zOiB7ZGlyOiBzdHJpbmd9KTogUnVsZSB7XG4gIHJldHVybiAodHJlZTogVHJlZSwgY29udGV4dDogU2NoZW1hdGljQ29udGV4dCkgPT4ge1xuICAgIGNvbnRleHQubG9nZ2VyLmluZm8oJ1RoaXMgc2NoZW1hdGljcyBpcyBmb3I6XFxuXFxcbiAgICBVcGdyYWRpbmcgc291cmNlIGNvZGUgdG8gYmUgY29tcGF0aWJsZSB0byBBbmd1bGFyIDguXFxuXFxcbiAgICBCZSBhd2FyZSB0aGVyZSBpcyBub3QgXCItLWRyeVJ1blwiIHN1cHBvcnRlZCBmb3IgYWxsIGNvbW1hbmRzIGhlcmVcXFxuICAgICcucmVwbGFjZSgvXlxccysvbWcsICcnKSk7XG4gICAgLy8gY29udGV4dC5hZGRUYXNrKClcbiAgICBmaXhWaWV3Q2hpbGQob3B0aW9ucy5kaXIpO1xuICAgIHJldHVybiB0cmVlO1xuICB9O1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZml4Vmlld0NoaWxkKGRpciA9ICcuJykge1xuICBsb2cuaW5mbygnc2NhbicsIGRpcik7XG4gIGRpciA9IGRpci5yZXBsYWNlKC9cXC8kL2csICcnKTtcbiAgY29uc3QgZ2xvYkFzeW5jID0gcGlmeShnbG9iKTtcbiAgY29uc3QgbWF0Y2hlczogc3RyaW5nW10gPSBhd2FpdCBnbG9iQXN5bmMoZGlyICsgJy8qKi8qLnRzJyk7XG4gIGxvZy5pbmZvKG1hdGNoZXMpO1xuICBmb3IgKGNvbnN0IGZpbGUgb2YgbWF0Y2hlcykge1xuICAgIGNvbnN0IHNlbCA9IG5ldyBTZWxlY3Rvcihmcy5yZWFkRmlsZVN5bmMoZmlsZSwgJ3V0ZjgnKSwgZmlsZSk7XG4gICAgLy8gc2VsLnByaW50QWxsKCk7XG4gICAgY29uc3QgZm91bmRNb2R1bGUgPSBzZWwuZmluZFdpdGgoJ146SW1wb3J0RGVjbGFyYXRpb24+Lm1vZHVsZVNwZWNpZmllcjpTdHJpbmdMaXRlcmFsJyxcbiAgICAgIChhc3Q6IHRzLlN0cmluZ0xpdGVyYWwsIHBhdGgsIHBhcmVudHMpID0+IHtcbiAgICAgIGxvZy5pbmZvKCctJywgYXN0LnRleHQpO1xuICAgICAgaWYgKGFzdC50ZXh0ID09PSAnQGFuZ3VsYXIvY29yZScpIHtcbiAgICAgICAgc2VsLnByaW50QWxsKGFzdC5wYXJlbnQpO1xuICAgICAgICByZXR1cm4gc2VsLmZpbmRBbGwoYXN0LnBhcmVudCwgJy5uYW1lZEJpbmRpbmdzID4gLmVsZW1lbnRzID4gLm5hbWUnKVxuICAgICAgICAubWFwKG5vZGUgPT4gbm9kZS5nZXRUZXh0KHNlbC5zcmMpKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICBpZiAoZm91bmRNb2R1bGUpIHtcbiAgICAgIGxvZy5pbmZvKCdpbXBvcnQ6JywgZm91bmRNb2R1bGUpO1xuICAgICAgLy8gc2VsLnByaW50QWxsKCk7XG4gICAgfVxuICB9XG59XG4iXX0=
