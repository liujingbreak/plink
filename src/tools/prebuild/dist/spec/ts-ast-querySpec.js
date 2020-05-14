"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
// tslint:disable:no-console
const ts_ast_query_1 = tslib_1.__importStar(require("../ts-ast-query"));
const fs = tslib_1.__importStar(require("fs"));
const path_1 = require("path");
const ts = tslib_1.__importStar(require("typescript"));
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AYmsvcHJlYnVpbGQvdHMvc3BlYy90cy1hc3QtcXVlcnlTcGVjLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLDRCQUE0QjtBQUM1Qix3RUFBa0U7QUFDbEUsK0NBQXlCO0FBQ3pCLCtCQUE2QjtBQUM3Qix1REFBaUM7QUFDakMsK0RBQStEO0FBRS9ELFFBQVEsQ0FBQyxjQUFjLEVBQUUsR0FBRyxFQUFFO0lBQzVCLEVBQUUsQ0FBQyxlQUFlLEVBQUUsR0FBRyxFQUFFO1FBQ3ZCLE1BQU0sSUFBSSxHQUFHLGNBQU8sQ0FBQyxTQUFTLEVBQUUsNEJBQTRCLENBQUMsQ0FBQztRQUM5RCxNQUFNLEdBQUcsR0FBRyxJQUFJLHNCQUFRLENBQUMsMkJBQTJCLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDNUQsR0FBRyxDQUFDLFFBQVEsRUFBRSxDQUFDO1FBQ2YsTUFBTSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMscUNBQXFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDNUUsQ0FBQyxDQUFDLENBQUM7SUFFSCxFQUFFLENBQUMsc0JBQXNCLEVBQUUsR0FBRyxFQUFFO1FBQzlCLE1BQU0sSUFBSSxHQUFHLGNBQU8sQ0FBQyxTQUFTLEVBQUUsaUNBQWlDLENBQUMsQ0FBQztRQUNuRSxJQUFJLHNCQUFRLENBQUMsRUFBRSxDQUFDLFlBQVksQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUM7SUFDL0QsQ0FBQyxDQUFDLENBQUM7SUFFSCxHQUFHLENBQUMsNEJBQTRCLEVBQUUsR0FBRyxFQUFFO1FBQ3JDLE1BQU0sSUFBSSxHQUFHLGNBQU8sQ0FBQyxTQUFTLEVBQUUsaUNBQWlDLENBQUMsQ0FBQztRQUNuRSxJQUFJLHNCQUFRLENBQUMsRUFBRSxDQUFDLFlBQVksQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLEVBQUUsSUFB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QUMsR0FBa0IsRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLEVBQUU7WUFDcEMsdUNBQXVDO1lBQ3ZDLHFHQUFxRztZQUNyRyxJQUFJLEdBQUcsQ0FBQyxJQUFJLEtBQUssd0JBQXdCO2dCQUN4QyxHQUFHLENBQUMsTUFBTSxDQUFDLE1BQXNDLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEtBQUssaUJBQWlCO2dCQUNoRyxHQUFHLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxLQUFLLEVBQUUsQ0FBQyxVQUFVLENBQUMsY0FBYyxFQUFFO2dCQUM5RCx1QkFBdUI7Z0JBQ3ZCLE9BQU8sR0FBRyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDO2FBQ2pDO1FBQ0gsQ0FBQyxDQUFDLENBQUM7UUFDTCxNQUFNLENBQUMsUUFBUSxJQUFJLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUN0QyxDQUFDLENBQUMsQ0FBQztBQUVMLENBQUMsQ0FBQyxDQUFDIiwiZmlsZSI6Im5vZGVfbW9kdWxlcy9AYmsvcHJlYnVpbGQvZGlzdC9zcGVjL3RzLWFzdC1xdWVyeVNwZWMuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyB0c2xpbnQ6ZGlzYWJsZTpuby1jb25zb2xlXG5pbXBvcnQgU2VsZWN0b3IsIHtRdWVyeS8qLCBBc3RDaGFyYWN0ZXIqL30gZnJvbSAnLi4vdHMtYXN0LXF1ZXJ5JztcbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcbmltcG9ydCB7cmVzb2x2ZX0gZnJvbSAncGF0aCc7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0Jztcbi8vIGNvbnN0IGxvZyA9IHJlcXVpcmUoJ2xvZzRqcycpLmdldExvZ2dlcigndHMtYXN0LXF1ZXJ5U3BlYycpO1xuXG5kZXNjcmliZSgndHMtYXN0LXF1ZXJ5JywgKCkgPT4ge1xuICBpdCgncHJpbnRBbGwgZGVtbycsICgpID0+IHtcbiAgICBjb25zdCBmaWxlID0gcmVzb2x2ZShfX2Rpcm5hbWUsICdtYW51YWwtd3JpdHRlbiBzYW1wbGUgZmlsZScpO1xuICAgIGNvbnN0IHNlbCA9IG5ldyBTZWxlY3RvcignaW1wb3J0IGFwaSBmcm9tIFxcJ19fYXBpXFwnJywgZmlsZSk7XG4gICAgc2VsLnByaW50QWxsKCk7XG4gICAgZXhwZWN0KHNlbC5maW5kQWxsKCc6SW1wb3J0RGVjbGFyYXRpb24+Lm1vZHVsZVNwZWNpZmllcicpLmxlbmd0aCkudG9CZSgxKTtcbiAgfSk7XG5cbiAgaXQoJ3ByaW50QWxsIHNob3VsZCB3b3JrJywgKCkgPT4ge1xuICAgIGNvbnN0IGZpbGUgPSByZXNvbHZlKF9fZGlybmFtZSwgJy4uLy4uL3RzL3NwZWMvYXBwLm1vZHVsZS50cy50eHQnKTtcbiAgICBuZXcgU2VsZWN0b3IoZnMucmVhZEZpbGVTeW5jKGZpbGUsICd1dGY4JyksIGZpbGUpLnByaW50QWxsKCk7XG4gIH0pO1xuXG4gIHhpdCgncHJpbnRBbGxOb1R5cGUgc2hvdWxkIHdvcmsnLCAoKSA9PiB7XG4gICAgY29uc3QgZmlsZSA9IHJlc29sdmUoX19kaXJuYW1lLCAnLi4vLi4vdHMvc3BlYy9hcHAubW9kdWxlLnRzLnR4dCcpO1xuICAgIG5ldyBTZWxlY3Rvcihmcy5yZWFkRmlsZVN5bmMoZmlsZSwgJ3V0ZjgnKSwgZmlsZSkucHJpbnRBbGxOb1R5cGUoKTtcbiAgfSk7XG5cbiAgaXQoJ1F1ZXJ5IHNob3VsZCB3b3JrJywgKCkgPT4ge1xuICAgIC8vIGNvbnN0IGZpbGUgPSByZXNvbHZlKF9fZGlybmFtZSwgJy4uLy4uL3RzL3NwZWMvYXBwLm1vZHVsZS50cy50eHQnKTtcbiAgICAvLyBjb25zdCBzZWwgPSBuZXcgU2VsZWN0b3IoZnMucmVhZEZpbGVTeW5jKGZpbGUsICd1dGY4JyksIGZpbGUpO1xuICAgIGxldCBxID0gbmV3IFF1ZXJ5KCcuc3RhdGVtZW50czpWYXJpYWJsZVN0YXRlbWVudCAgLm5hbWVkQmluZGluZ3MgLmVsZW1lbnRzWzBdID4gOklkZW50aWZpZXInKTtcbiAgICBjb25zb2xlLmxvZyhxLnF1ZXJ5UGF0aHMpO1xuICAgIGV4cGVjdChxLnF1ZXJ5UGF0aHMuc2xpY2UoMCkubWFwKGMgPT4gYy5zbGljZSgwKS5yZXZlcnNlKCkpLnJldmVyc2UoKSkudG9FcXVhbChbXG4gICAgICBbeyBwcm9wZXJ0eU5hbWU6ICdzdGF0ZW1lbnRzJywga2luZDogJ1ZhcmlhYmxlU3RhdGVtZW50JyB9XSxcbiAgICAgIFt7IHByb3BlcnR5TmFtZTogJ25hbWVkQmluZGluZ3MnIH1dLFxuICAgICAgW3sgcHJvcGVydHlOYW1lOiAnZWxlbWVudHMnLCBwcm9wSW5kZXg6IDAgfSwgeyBraW5kOiAnSWRlbnRpZmllcicgfV1cbiAgICBdKTtcbiAgICBleHBlY3QoKHEgYXMgYW55KS5tYXRjaGVzQ29uc2VjdXRpdmVOb2RlcyhcbiAgICAgICAgWyhxIGFzIGFueSkuX3BhcnNlRGVzYygnLmZvb2JhcjpBYmMnKSwgKHEgYXMgYW55KS5fcGFyc2VEZXNjKCc6T2ZmJyldLnJldmVyc2UoKSxcbiAgICAgICAgWycuZm9vYmFyWzNdOkFiYycsICcuZW5kOk9mZiddLCAxXG4gICAgICApKS50b0JlKHRydWUpO1xuICAgIGV4cGVjdCgocSBhcyBhbnkpLm1hdGNoZXNDb25zZWN1dGl2ZU5vZGVzKFxuICAgICAgICBbKHEgYXMgYW55KS5fcGFyc2VEZXNjKCcuZm9vYmFyOkFiYycpLCAocSBhcyBhbnkpLl9wYXJzZURlc2MoJzpPZmYnKV0ucmV2ZXJzZSgpLFxuICAgICAgICBbJy5mb29iYXJbM106QWJjJywgJy5lbmQ6T2ZmJ10sIDBcbiAgICAgICkpLnRvQmUoZmFsc2UpO1xuXG4gICAgZXhwZWN0KHEubWF0Y2hlcyhcbiAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTptYXgtbGluZS1sZW5ndGhcbiAgICAgICcuc3RhdGVtZW50c1swXTpWYXJpYWJsZVN0YXRlbWVudD4uaW1wb3J0Q2xhdXNlOkltcG9ydENsYXVzZT4ubmFtZWRCaW5kaW5nczpOYW1lZEltcG9ydHM+LmVsZW1lbnRzWzBdOkltcG9ydFNwZWNpZmllcj4ubmFtZTpJZGVudGlmaWVyJ1xuICAgICAgLnNwbGl0KCc+JykpKS50b0JlKHRydWUpO1xuICAgIHEgPSBuZXcgUXVlcnkoJzpJbXBvcnREZWNsYXJhdGlvbiA6SWRlbnRpZmllcicpO1xuICAgIGV4cGVjdChxLm1hdGNoZXMoKCcuc3RhdGVtZW50c1swXTpJbXBvcnREZWNsYXJhdGlvbj4uaW1wb3J0Q2xhdXNlOkltcG9ydENsYXVzZT4ubmFtZWRCaW5kaW5nczpOYW1lZEltcG9ydHM+JyArXG4gICAgICAnLmVsZW1lbnRzWzBdOkltcG9ydFNwZWNpZmllcj4ubmFtZTpJZGVudGlmaWVyJykuc3BsaXQoJz4nKSkpLnRvQmUodHJ1ZSk7XG4gICAgZXhwZWN0KHEubWF0Y2hlcygoJy5zdGF0ZW1lbnRzWzBdOkltcG9ydERlY2xhcmF0aW9uPi5pbXBvcnRDbGF1c2U6SW1wb3J0Q2xhdXNlPi5uYW1lZEJpbmRpbmdzOk5hbWVkSW1wb3J0cz4nICtcbiAgICAgICcuZWxlbWVudHNbMV06SW1wb3J0U3BlY2lmaWVyPi5uYW1lOklkZW50aWZpZXInKS5zcGxpdCgnPicpKSkudG9CZSh0cnVlKTtcbiAgfSk7XG5cbiAgaXQoJ2ZpbmRGaXJzdCBzaG91bGQgd29yaycsICgpID0+IHtcbiAgICBjb25zdCBmaWxlID0gcmVzb2x2ZShfX2Rpcm5hbWUsICcuLi8uLi90cy9zcGVjL2FwcC5tb2R1bGUudHMudHh0Jyk7XG4gICAgY29uc3Qgc2VsID0gbmV3IFNlbGVjdG9yKGZzLnJlYWRGaWxlU3luYyhmaWxlLCAndXRmOCcpLCBmaWxlKTtcbiAgICBjb25zdCBmb3VuZCA9IHNlbC5maW5kRmlyc3QoJzpJbXBvcnREZWNsYXJhdGlvbiA6SWRlbnRpZmllcicpO1xuICAgIGV4cGVjdChmb3VuZCAhPSBudWxsKS50b0JlVHJ1dGh5KCk7XG4gICAgZXhwZWN0KGZvdW5kIS5nZXRUZXh0KHNlbC5zcmMpKS50b0JlKCdJbmplY3RhYmxlJyk7XG4gIH0pO1xuXG4gIGl0KCdmaW5kQWxsIHNob3VsZCB3b3JrJywgKCkgPT4ge1xuICAgIGNvbnN0IGZpbGUgPSByZXNvbHZlKF9fZGlybmFtZSwgJy4uLy4uL3RzL3NwZWMvYXBwLm1vZHVsZS50cy50eHQnKTtcbiAgICBjb25zdCBzZWwgPSBuZXcgU2VsZWN0b3IoZnMucmVhZEZpbGVTeW5jKGZpbGUsICd1dGY4JyksIGZpbGUpO1xuICAgIGNvbnN0IGZvdW5kID0gc2VsLmZpbmRBbGwoJzpJbXBvcnREZWNsYXJhdGlvbiA6SWRlbnRpZmllcicpLm1hcChhc3QgPT4gYXN0LmdldFRleHQoc2VsLnNyYykpO1xuXG4gICAgY29uc29sZS5sb2coZm91bmQpO1xuXG4gICAgZXhwZWN0KGZvdW5kLmxlbmd0aCkudG9CZSgxKTtcbiAgfSk7XG5cbiAgaXQoJ2ZpbmRXaXRoIHNob3VsZCB3b3JrJywgKCkgPT4ge1xuICAgIGNvbnN0IHRhcmdldCA9IGBcblx0XHRwbGF0Zm9ybUJyb3dzZXJEeW5hbWljKCkuYm9vdHN0cmFwTW9kdWxlKEFwcE1vZHVsZSlcblx0XHQgIC5jYXRjaChlcnIgPT4gY29uc29sZS5sb2coZXJyKSk7XG5cdFx0YDtcbiAgICBjb25zdCBxdWVyeSA9IG5ldyBTZWxlY3Rvcih0YXJnZXQsICdtYWluLWhtci50cycpO1xuICAgIGNvbnNvbGUubG9nKCctLS0tLS0+Pj4+LS0tLS0tLS0tLScpO1xuICAgIHF1ZXJ5LnByaW50QWxsKHF1ZXJ5LnNyYyk7XG4gICAgLy8gY29uc3QgZm91bmQgPSBxdWVyeS5maW5kQWxsKHF1ZXJ5LnNyYyxcbiAgICAvLyAgICc6UHJvcGVydHlBY2Nlc3NFeHByZXNzaW9uID4gLmV4cHJlc3Npb246Q2FsbEV4cHJlc3Npb24gPiAuZXhwcmVzc2lvbjpJZGVudGlmaWVyJyk7XG5cbiAgICAvLyBjb25zb2xlLmxvZyhmb3VuZCk7XG5cbiAgICBjb25zdCBib290Q2FsbCA9IHF1ZXJ5LmZpbmRNYXBUbyhxdWVyeS5zcmMsXG4gICAgICAnXiAuc3RhdGVtZW50cz46Q2FsbEV4cHJlc3Npb24gOlByb3BlcnR5QWNjZXNzRXhwcmVzc2lvbiA+IC5leHByZXNzaW9uOkNhbGxFeHByZXNzaW9uID4gLmV4cHJlc3Npb246SWRlbnRpZmllcicsXG4gICAgICAoYXN0OiB0cy5JZGVudGlmaWVyLCBwYXRoLCBwYXJlbnRzKSA9PiB7XG4gICAgICAgIC8vIGNvbnNvbGUubG9nKCctLS0tLS0+Pj4+LS0tLS0tLS0tLScpO1xuICAgICAgICAvLyBjb25zb2xlLmxvZyhhc3QudGV4dCwgKGFzdC5wYXJlbnQucGFyZW50IGFzIHRzLlByb3BlcnR5QWNjZXNzRXhwcmVzc2lvbikubmFtZS5nZXRUZXh0KHF1ZXJ5LnNyYykpO1xuICAgICAgICBpZiAoYXN0LnRleHQgPT09ICdwbGF0Zm9ybUJyb3dzZXJEeW5hbWljJyAmJlxuICAgICAgICAoYXN0LnBhcmVudC5wYXJlbnQgYXMgdHMuUHJvcGVydHlBY2Nlc3NFeHByZXNzaW9uKS5uYW1lLmdldFRleHQocXVlcnkuc3JjKSA9PT0gJ2Jvb3RzdHJhcE1vZHVsZScgJiZcbiAgICAgICAgYXN0LnBhcmVudC5wYXJlbnQucGFyZW50LmtpbmQgPT09IHRzLlN5bnRheEtpbmQuQ2FsbEV4cHJlc3Npb24pIHtcbiAgICAgICAgICAvLyBjb25zb2xlLmxvZygnaGVyZScpO1xuICAgICAgICAgIHJldHVybiBhc3QucGFyZW50LnBhcmVudC5wYXJlbnQ7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIGV4cGVjdChib290Q2FsbCAhPSBudWxsKS50b0JlKHRydWUpO1xuICB9KTtcblxufSk7XG4iXX0=
