"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
// tslint:disable:no-console
const ts_ast_query_1 = __importStar(require("../ts-ast-query"));
const fs = __importStar(require("fs"));
const path_1 = require("path");
const ts = __importStar(require("typescript"));
// const log = require('log4js').getLogger('ts-ast-querySpec');
describe('ts-ast-query', () => {
    it('printAll demo', () => {
        const file = path_1.resolve(__dirname, 'manual-written sample file');
        const sel = new ts_ast_query_1.default('import api from \'__api\'', file);
        sel.printAll();
        expect(sel.findAll(':ImportDeclaration>.moduleSpecifier').length).toBe(1);
    });
    it('printAll should work', () => {
        const file = path_1.resolve(__dirname, '../../ts/spec/app.module.ts.txt');
        new ts_ast_query_1.default(fs.readFileSync(file, 'utf8'), file).printAll();
    });
    xit('printAllNoType should work', () => {
        const file = path_1.resolve(__dirname, '../../ts/spec/app.module.ts.txt');
        new ts_ast_query_1.default(fs.readFileSync(file, 'utf8'), file).printAllNoType();
    });
    it('Query should work', () => {
        // const file = resolve(__dirname, '../../ts/spec/app.module.ts.txt');
        // const sel = new Selector(fs.readFileSync(file, 'utf8'), file);
        let q = new ts_ast_query_1.Query('.statements:VariableStatement  .namedBindings .elements[0] > :Identifier');
        console.log(q.queryPaths);
        expect(q.queryPaths.slice(0).map(c => c.slice(0).reverse()).reverse()).toEqual([
            [{ propertyName: 'statements', kind: 'VariableStatement' }],
            [{ propertyName: 'namedBindings' }],
            [{ propertyName: 'elements', propIndex: 0 }, { kind: 'Identifier' }]
        ]);
        expect(q.matchesConsecutiveNodes([q._parseDesc('.foobar:Abc'), q._parseDesc(':Off')].reverse(), ['.foobar[3]:Abc', '.end:Off'], 1)).toBe(true);
        expect(q.matchesConsecutiveNodes([q._parseDesc('.foobar:Abc'), q._parseDesc(':Off')].reverse(), ['.foobar[3]:Abc', '.end:Off'], 0)).toBe(false);
        expect(q.matches(
        // tslint:disable-next-line:max-line-length
        '.statements[0]:VariableStatement>.importClause:ImportClause>.namedBindings:NamedImports>.elements[0]:ImportSpecifier>.name:Identifier'
            .split('>'))).toBe(true);
        q = new ts_ast_query_1.Query(':ImportDeclaration :Identifier');
        expect(q.matches(('.statements[0]:ImportDeclaration>.importClause:ImportClause>.namedBindings:NamedImports>' +
            '.elements[0]:ImportSpecifier>.name:Identifier').split('>'))).toBe(true);
        expect(q.matches(('.statements[0]:ImportDeclaration>.importClause:ImportClause>.namedBindings:NamedImports>' +
            '.elements[1]:ImportSpecifier>.name:Identifier').split('>'))).toBe(true);
    });
    it('findFirst should work', () => {
        const file = path_1.resolve(__dirname, '../../ts/spec/app.module.ts.txt');
        const sel = new ts_ast_query_1.default(fs.readFileSync(file, 'utf8'), file);
        const found = sel.findFirst(':ImportDeclaration :Identifier');
        expect(found != null).toBeTruthy();
        expect(found.getText(sel.src)).toBe('Injectable');
    });
    it('findAll should work', () => {
        const file = path_1.resolve(__dirname, '../../ts/spec/app.module.ts.txt');
        const sel = new ts_ast_query_1.default(fs.readFileSync(file, 'utf8'), file);
        const found = sel.findAll(':ImportDeclaration :Identifier').map(ast => ast.getText(sel.src));
        console.log(found);
        expect(found.length).toBe(1);
    });
    it('findWith should work', () => {
        const target = `
		platformBrowserDynamic().bootstrapModule(AppModule)
		  .catch(err => console.log(err));
		`;
        const query = new ts_ast_query_1.default(target, 'main-hmr.ts');
        console.log('------>>>>----------');
        query.printAll(query.src);
        // const found = query.findAll(query.src,
        //   ':PropertyAccessExpression > .expression:CallExpression > .expression:Identifier');
        // console.log(found);
        const bootCall = query.findMapTo(query.src, '^ .statements>:CallExpression :PropertyAccessExpression > .expression:CallExpression > .expression:Identifier', (ast, path, parents) => {
            // console.log('------>>>>----------');
            // console.log(ast.text, (ast.parent.parent as ts.PropertyAccessExpression).name.getText(query.src));
            if (ast.text === 'platformBrowserDynamic' &&
                ast.parent.parent.name.getText(query.src) === 'bootstrapModule' &&
                ast.parent.parent.parent.kind === ts.SyntaxKind.CallExpression) {
                // console.log('here');
                return ast.parent.parent.parent;
            }
        });
        expect(bootCall != null).toBe(true);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHMtYXN0LXF1ZXJ5U3BlYy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInRzLWFzdC1xdWVyeVNwZWMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsNEJBQTRCO0FBQzVCLGdFQUFrRTtBQUNsRSx1Q0FBeUI7QUFDekIsK0JBQTZCO0FBQzdCLCtDQUFpQztBQUNqQywrREFBK0Q7QUFFL0QsUUFBUSxDQUFDLGNBQWMsRUFBRSxHQUFHLEVBQUU7SUFDNUIsRUFBRSxDQUFDLGVBQWUsRUFBRSxHQUFHLEVBQUU7UUFDdkIsTUFBTSxJQUFJLEdBQUcsY0FBTyxDQUFDLFNBQVMsRUFBRSw0QkFBNEIsQ0FBQyxDQUFDO1FBQzlELE1BQU0sR0FBRyxHQUFHLElBQUksc0JBQVEsQ0FBQywyQkFBMkIsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUM1RCxHQUFHLENBQUMsUUFBUSxFQUFFLENBQUM7UUFDZixNQUFNLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxxQ0FBcUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUM1RSxDQUFDLENBQUMsQ0FBQztJQUVILEVBQUUsQ0FBQyxzQkFBc0IsRUFBRSxHQUFHLEVBQUU7UUFDOUIsTUFBTSxJQUFJLEdBQUcsY0FBTyxDQUFDLFNBQVMsRUFBRSxpQ0FBaUMsQ0FBQyxDQUFDO1FBQ25FLElBQUksc0JBQVEsQ0FBQyxFQUFFLENBQUMsWUFBWSxDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQztJQUMvRCxDQUFDLENBQUMsQ0FBQztJQUVILEdBQUcsQ0FBQyw0QkFBNEIsRUFBRSxHQUFHLEVBQUU7UUFDckMsTUFBTSxJQUFJLEdBQUcsY0FBTyxDQUFDLFNBQVMsRUFBRSxpQ0FBaUMsQ0FBQyxDQUFDO1FBQ25FLElBQUksc0JBQVEsQ0FBQyxFQUFFLENBQUMsWUFBWSxDQUFD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QUMsR0FBRyxFQUN4QywrR0FBK0csRUFDL0csQ0FBQyxHQUFrQixFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsRUFBRTtZQUNwQyx1Q0FBdUM7WUFDdkMscUdBQXFHO1lBQ3JHLElBQUksR0FBRyxDQUFDLElBQUksS0FBSyx3QkFBd0I7Z0JBQ3hDLEdBQUcsQ0FBQyxNQUFNLENBQUMsTUFBc0MsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsS0FBSyxpQkFBaUI7Z0JBQ2hHLEdBQUcsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEtBQUssRUFBRSxDQUFDLFVBQVUsQ0FBQyxjQUFjLEVBQUU7Z0JBQzlELHVCQUF1QjtnQkFDdkIsT0FBTyxHQUFHLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUM7YUFDakM7UUFDSCxDQUFDLENBQUMsQ0FBQztRQUNMLE1BQU0sQ0FBQyxRQUFRLElBQUksSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ3RDLENBQUMsQ0FBQyxDQUFDO0FBRUwsQ0FBQyxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyB0c2xpbnQ6ZGlzYWJsZTpuby1jb25zb2xlXG5pbXBvcnQgU2VsZWN0b3IsIHtRdWVyeS8qLCBBc3RDaGFyYWN0ZXIqL30gZnJvbSAnLi4vdHMtYXN0LXF1ZXJ5JztcbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcbmltcG9ydCB7cmVzb2x2ZX0gZnJvbSAncGF0aCc7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0Jztcbi8vIGNvbnN0IGxvZyA9IHJlcXVpcmUoJ2xvZzRqcycpLmdldExvZ2dlcigndHMtYXN0LXF1ZXJ5U3BlYycpO1xuXG5kZXNjcmliZSgndHMtYXN0LXF1ZXJ5JywgKCkgPT4ge1xuICBpdCgncHJpbnRBbGwgZGVtbycsICgpID0+IHtcbiAgICBjb25zdCBmaWxlID0gcmVzb2x2ZShfX2Rpcm5hbWUsICdtYW51YWwtd3JpdHRlbiBzYW1wbGUgZmlsZScpO1xuICAgIGNvbnN0IHNlbCA9IG5ldyBTZWxlY3RvcignaW1wb3J0IGFwaSBmcm9tIFxcJ19fYXBpXFwnJywgZmlsZSk7XG4gICAgc2VsLnByaW50QWxsKCk7XG4gICAgZXhwZWN0KHNlbC5maW5kQWxsKCc6SW1wb3J0RGVjbGFyYXRpb24+Lm1vZHVsZVNwZWNpZmllcicpLmxlbmd0aCkudG9CZSgxKTtcbiAgfSk7XG5cbiAgaXQoJ3ByaW50QWxsIHNob3VsZCB3b3JrJywgKCkgPT4ge1xuICAgIGNvbnN0IGZpbGUgPSByZXNvbHZlKF9fZGlybmFtZSwgJy4uLy4uL3RzL3NwZWMvYXBwLm1vZHVsZS50cy50eHQnKTtcbiAgICBuZXcgU2VsZWN0b3IoZnMucmVhZEZpbGVTeW5jKGZpbGUsICd1dGY4JyksIGZpbGUpLnByaW50QWxsKCk7XG4gIH0pO1xuXG4gIHhpdCgncHJpbnRBbGxOb1R5cGUgc2hvdWxkIHdvcmsnLCAoKSA9PiB7XG4gICAgY29uc3QgZmlsZSA9IHJlc29sdmUoX19kaXJuYW1lLCAnLi4vLi4vdHMvc3BlYy9hcHAubW9kdWxlLnRzLnR4dCcpO1xuICAgIG5ldyBTZWxlY3Rvcihmcy5yZWFkRmlsZVN5bmMoZmlsZSwgJ3V0ZjgnKSwgZmlsZSkucHJpbnRBbGxOb1R5cGUoKTtcbiAgfSk7XG5cbiAgaXQoJ1F1ZXJ5IHNob3VsZCB3b3JrJywgKCkgPT4ge1xuICAgIC8vIGNvbnN0IGZpbGUgPSByZXNvbHZlKF9fZGlybmFtZSwgJy4uLy4uL3RzL3NwZWMvYXBwLm1vZHVsZS50cy50eHQnKTtcbiAgICAvLyBjb25zdCBzZWwgPSBuZXcgU2VsZWN0b3IoZnMucmVhZEZpbGVTeW5jKGZpbGUsICd1dGY4JyksIGZpbGUpO1xuICAgIGxldCBxID0gbmV3IFF1ZXJ5KCcuc3RhdGVtZW50czpWYXJpYWJsZVN0YXRlbWVudCAgLm5hbWVkQmluZGluZ3MgLmVsZW1lbnRzWzBdID4gOklkZW50aWZpZXInKTtcbiAgICBjb25zb2xlLmxvZyhxLnF1ZXJ5UGF0aHMpO1xuICAgIGV4cGVjdChxLnF1ZXJ5UGF0aHMuc2xpY2UoMCkubWFwKGMgPT4gYy5zbGljZSgwKS5yZXZlcnNlKCkpLnJldmVyc2UoKSkudG9FcXVhbChbXG4gICAgICBbeyBwcm9wZXJ0eU5hbWU6ICdzdGF0ZW1lbnRzJywga2luZDogJ1ZhcmlhYmxlU3RhdGVtZW50JyB9XSxcbiAgICAgIFt7IHByb3BlcnR5TmFtZTogJ25hbWVkQmluZGluZ3MnIH1dLFxuICAgICAgW3sgcHJvcGVydHlOYW1lOiAnZWxlbWVudHMnLCBwcm9wSW5kZXg6IDAgfSwgeyBraW5kOiAnSWRlbnRpZmllcicgfV1cbiAgICBdKTtcbiAgICBleHBlY3QoKHEgYXMgYW55KS5tYXRjaGVzQ29uc2VjdXRpdmVOb2RlcyhcbiAgICAgICAgWyhxIGFzIGFueSkuX3BhcnNlRGVzYygnLmZvb2JhcjpBYmMnKSwgKHEgYXMgYW55KS5fcGFyc2VEZXNjKCc6T2ZmJyldLnJldmVyc2UoKSxcbiAgICAgICAgWycuZm9vYmFyWzNdOkFiYycsICcuZW5kOk9mZiddLCAxXG4gICAgICApKS50b0JlKHRydWUpO1xuICAgIGV4cGVjdCgocSBhcyBhbnkpLm1hdGNoZXNDb25zZWN1dGl2ZU5vZGVzKFxuICAgICAgICBbKHEgYXMgYW55KS5fcGFyc2VEZXNjKCcuZm9vYmFyOkFiYycpLCAocSBhcyBhbnkpLl9wYXJzZURlc2MoJzpPZmYnKV0ucmV2ZXJzZSgpLFxuICAgICAgICBbJy5mb29iYXJbM106QWJjJywgJy5lbmQ6T2ZmJ10sIDBcbiAgICAgICkpLnRvQmUoZmFsc2UpO1xuXG4gICAgZXhwZWN0KHEubWF0Y2hlcyhcbiAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTptYXgtbGluZS1sZW5ndGhcbiAgICAgICcuc3RhdGVtZW50c1swXTpWYXJpYWJsZVN0YXRlbWVudD4uaW1wb3J0Q2xhdXNlOkltcG9ydENsYXVzZT4ubmFtZWRCaW5kaW5nczpOYW1lZEltcG9ydHM+LmVsZW1lbnRzWzBdOkltcG9ydFNwZWNpZmllcj4ubmFtZTpJZGVudGlmaWVyJ1xuICAgICAgLnNwbGl0KCc+JykpKS50b0JlKHRydWUpO1xuICAgIHEgPSBuZXcgUXVlcnkoJzpJbXBvcnREZWNsYXJhdGlvbiA6SWRlbnRpZmllcicpO1xuICAgIGV4cGVjdChxLm1hdGNoZXMoKCcuc3RhdGVtZW50c1swXTpJbXBvcnREZWNsYXJhdGlvbj4uaW1wb3J0Q2xhdXNlOkltcG9ydENsYXVzZT4ubmFtZWRCaW5kaW5nczpOYW1lZEltcG9ydHM+JyArXG4gICAgICAnLmVsZW1lbnRzWzBdOkltcG9ydFNwZWNpZmllcj4ubmFtZTpJZGVudGlmaWVyJykuc3BsaXQoJz4nKSkpLnRvQmUodHJ1ZSk7XG4gICAgZXhwZWN0KHEubWF0Y2hlcygoJy5zdGF0ZW1lbnRzWzBdOkltcG9ydERlY2xhcmF0aW9uPi5pbXBvcnRDbGF1c2U6SW1wb3J0Q2xhdXNlPi5uYW1lZEJpbmRpbmdzOk5hbWVkSW1wb3J0cz4nICtcbiAgICAgICcuZWxlbWVudHNbMV06SW1wb3J0U3BlY2lmaWVyPi5uYW1lOklkZW50aWZpZXInKS5zcGxpdCgnPicpKSkudG9CZSh0cnVlKTtcbiAgfSk7XG5cbiAgaXQoJ2ZpbmRGaXJzdCBzaG91bGQgd29yaycsICgpID0+IHtcbiAgICBjb25zdCBmaWxlID0gcmVzb2x2ZShfX2Rpcm5hbWUsICcuLi8uLi90cy9zcGVjL2FwcC5tb2R1bGUudHMudHh0Jyk7XG4gICAgY29uc3Qgc2VsID0gbmV3IFNlbGVjdG9yKGZzLnJlYWRGaWxlU3luYyhmaWxlLCAndXRmOCcpLCBmaWxlKTtcbiAgICBjb25zdCBmb3VuZCA9IHNlbC5maW5kRmlyc3QoJzpJbXBvcnREZWNsYXJhdGlvbiA6SWRlbnRpZmllcicpO1xuICAgIGV4cGVjdChmb3VuZCAhPSBudWxsKS50b0JlVHJ1dGh5KCk7XG4gICAgZXhwZWN0KGZvdW5kIS5nZXRUZXh0KHNlbC5zcmMpKS50b0JlKCdJbmplY3RhYmxlJyk7XG4gIH0pO1xuXG4gIGl0KCdmaW5kQWxsIHNob3VsZCB3b3JrJywgKCkgPT4ge1xuICAgIGNvbnN0IGZpbGUgPSByZXNvbHZlKF9fZGlybmFtZSwgJy4uLy4uL3RzL3NwZWMvYXBwLm1vZHVsZS50cy50eHQnKTtcbiAgICBjb25zdCBzZWwgPSBuZXcgU2VsZWN0b3IoZnMucmVhZEZpbGVTeW5jKGZpbGUsICd1dGY4JyksIGZpbGUpO1xuICAgIGNvbnN0IGZvdW5kID0gc2VsLmZpbmRBbGwoJzpJbXBvcnREZWNsYXJhdGlvbiA6SWRlbnRpZmllcicpLm1hcChhc3QgPT4gYXN0LmdldFRleHQoc2VsLnNyYykpO1xuXG4gICAgY29uc29sZS5sb2coZm91bmQpO1xuXG4gICAgZXhwZWN0KGZvdW5kLmxlbmd0aCkudG9CZSgxKTtcbiAgfSk7XG5cbiAgaXQoJ2ZpbmRXaXRoIHNob3VsZCB3b3JrJywgKCkgPT4ge1xuICAgIGNvbnN0IHRhcmdldCA9IGBcblx0XHRwbGF0Zm9ybUJyb3dzZXJEeW5hbWljKCkuYm9vdHN0cmFwTW9kdWxlKEFwcE1vZHVsZSlcblx0XHQgIC5jYXRjaChlcnIgPT4gY29uc29sZS5sb2coZXJyKSk7XG5cdFx0YDtcbiAgICBjb25zdCBxdWVyeSA9IG5ldyBTZWxlY3Rvcih0YXJnZXQsICdtYWluLWhtci50cycpO1xuICAgIGNvbnNvbGUubG9nKCctLS0tLS0+Pj4+LS0tLS0tLS0tLScpO1xuICAgIHF1ZXJ5LnByaW50QWxsKHF1ZXJ5LnNyYyk7XG4gICAgLy8gY29uc3QgZm91bmQgPSBxdWVyeS5maW5kQWxsKHF1ZXJ5LnNyYyxcbiAgICAvLyAgICc6UHJvcGVydHlBY2Nlc3NFeHByZXNzaW9uID4gLmV4cHJlc3Npb246Q2FsbEV4cHJlc3Npb24gPiAuZXhwcmVzc2lvbjpJZGVudGlmaWVyJyk7XG5cbiAgICAvLyBjb25zb2xlLmxvZyhmb3VuZCk7XG5cbiAgICBjb25zdCBib290Q2FsbCA9IHF1ZXJ5LmZpbmRNYXBUbyhxdWVyeS5zcmMsXG4gICAgICAnXiAuc3RhdGVtZW50cz46Q2FsbEV4cHJlc3Npb24gOlByb3BlcnR5QWNjZXNzRXhwcmVzc2lvbiA+IC5leHByZXNzaW9uOkNhbGxFeHByZXNzaW9uID4gLmV4cHJlc3Npb246SWRlbnRpZmllcicsXG4gICAgICAoYXN0OiB0cy5JZGVudGlmaWVyLCBwYXRoLCBwYXJlbnRzKSA9PiB7XG4gICAgICAgIC8vIGNvbnNvbGUubG9nKCctLS0tLS0+Pj4+LS0tLS0tLS0tLScpO1xuICAgICAgICAvLyBjb25zb2xlLmxvZyhhc3QudGV4dCwgKGFzdC5wYXJlbnQucGFyZW50IGFzIHRzLlByb3BlcnR5QWNjZXNzRXhwcmVzc2lvbikubmFtZS5nZXRUZXh0KHF1ZXJ5LnNyYykpO1xuICAgICAgICBpZiAoYXN0LnRleHQgPT09ICdwbGF0Zm9ybUJyb3dzZXJEeW5hbWljJyAmJlxuICAgICAgICAoYXN0LnBhcmVudC5wYXJlbnQgYXMgdHMuUHJvcGVydHlBY2Nlc3NFeHByZXNzaW9uKS5uYW1lLmdldFRleHQocXVlcnkuc3JjKSA9PT0gJ2Jvb3RzdHJhcE1vZHVsZScgJiZcbiAgICAgICAgYXN0LnBhcmVudC5wYXJlbnQucGFyZW50LmtpbmQgPT09IHRzLlN5bnRheEtpbmQuQ2FsbEV4cHJlc3Npb24pIHtcbiAgICAgICAgICAvLyBjb25zb2xlLmxvZygnaGVyZScpO1xuICAgICAgICAgIHJldHVybiBhc3QucGFyZW50LnBhcmVudC5wYXJlbnQ7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIGV4cGVjdChib290Q2FsbCAhPSBudWxsKS50b0JlKHRydWUpO1xuICB9KTtcblxufSk7XG4iXX0=