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
/* eslint-disable no-console */
const ts_ast_query_1 = __importStar(require("@wfh/plink/wfh/dist/utils/ts-ast-query"));
const fs = __importStar(require("fs"));
const path_1 = require("path");
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
        // eslint-disable-next-line max-len
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
                ast.parent.parent.parent.kind === ts_ast_query_1.typescript.SyntaxKind.CallExpression) {
                // console.log('here');
                return ast.parent.parent.parent;
            }
        });
        expect(bootCall != null).toBe(true);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHMtYXN0LXF1ZXJ5U3BlYy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInRzLWFzdC1xdWVyeVNwZWMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsK0JBQStCO0FBQy9CLHVGQUF5RjtBQUN6Rix1Q0FBeUI7QUFDekIsK0JBQTZCO0FBRTdCLFFBQVEsQ0FBQyxjQUFjLEVBQUUsR0FBRyxFQUFFO0lBQzVCLEVBQUUsQ0FBQyxlQUFlLEVBQUUsR0FBRyxFQUFFO1FBQ3ZCLE1BQU0sSUFBSSxHQUFHLGNBQU8sQ0FBQyxTQUFTLEVBQUUsNEJBQTRCLENBQUMsQ0FBQztRQUM5RCxNQUFNLEdBQUcsR0FBRyxJQUFJLHNCQUFRLENBQUMsMkJBQTJCLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDNUQsR0FBRyxDQUFDLFFBQVEsRUFBRSxDQUFDO1FBQ2YsTUFBTSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMscUNBQXFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDNUUsQ0FBQyxDQUFDLENBQUM7SUFFSCxFQUFFLENBQUMsc0JBQXNCLEVBQUUsR0FBRyxFQUFFO1FBQzlCLE1BQU0sSUFBSSxHQUFHLGNBQU8sQ0FBQyxTQUFTLEVBQUUsaUNBQWlDLENBQUMsQ0FBQztRQUNuRSxJQUFJLHNCQUFRLENBQUMsRUFBRSxDQUFDLFlBQVksQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUM7SUFDL0QsQ0FBQyxDQUFDLENBQUM7SUFFSCxHQUFHLENBQUMsNEJBQTRCLEVBQUUsR0FBRyxFQUFFO1FBQ3JDLE1BQU0sSUFBSSxHQUFHLGNBQU8sQ0FBQyxTQUFTLEVBQUUsaUNBQWlDLENBQUMsQ0FBQztRQUNuRSxJQUFJLHNCQUFRLENBQUMsRUFBRSxDQUFDLFlBQVksQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLEVBQUUs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LENBQUMsR0FBa0IsRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLEVBQUU7WUFDcEMsdUNBQXVDO1lBQ3ZDLHFHQUFxRztZQUNyRyxJQUFJLEdBQUcsQ0FBQyxJQUFJLEtBQUssd0JBQXdCO2dCQUN4QyxHQUFHLENBQUMsTUFBTSxDQUFDLE1BQXNDLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEtBQUssaUJBQWlCO2dCQUNoRyxHQUFHLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxLQUFLLHlCQUFFLENBQUMsVUFBVSxDQUFDLGNBQWMsRUFBRTtnQkFDOUQsdUJBQXVCO2dCQUN2QixPQUFPLEdBQUcsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQzthQUNqQztRQUNILENBQUMsQ0FBQyxDQUFDO1FBQ0wsTUFBTSxDQUFDLFFBQVEsSUFBSSxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDdEMsQ0FBQyxDQUFDLENBQUM7QUFFTCxDQUFDLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qIGVzbGludC1kaXNhYmxlIG5vLWNvbnNvbGUgKi9cbmltcG9ydCBTZWxlY3Rvciwge1F1ZXJ5LCB0eXBlc2NyaXB0IGFzIHRzfSBmcm9tICdAd2ZoL3BsaW5rL3dmaC9kaXN0L3V0aWxzL3RzLWFzdC1xdWVyeSc7XG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XG5pbXBvcnQge3Jlc29sdmV9IGZyb20gJ3BhdGgnO1xuXG5kZXNjcmliZSgndHMtYXN0LXF1ZXJ5JywgKCkgPT4ge1xuICBpdCgncHJpbnRBbGwgZGVtbycsICgpID0+IHtcbiAgICBjb25zdCBmaWxlID0gcmVzb2x2ZShfX2Rpcm5hbWUsICdtYW51YWwtd3JpdHRlbiBzYW1wbGUgZmlsZScpO1xuICAgIGNvbnN0IHNlbCA9IG5ldyBTZWxlY3RvcignaW1wb3J0IGFwaSBmcm9tIFxcJ19fYXBpXFwnJywgZmlsZSk7XG4gICAgc2VsLnByaW50QWxsKCk7XG4gICAgZXhwZWN0KHNlbC5maW5kQWxsKCc6SW1wb3J0RGVjbGFyYXRpb24+Lm1vZHVsZVNwZWNpZmllcicpLmxlbmd0aCkudG9CZSgxKTtcbiAgfSk7XG5cbiAgaXQoJ3ByaW50QWxsIHNob3VsZCB3b3JrJywgKCkgPT4ge1xuICAgIGNvbnN0IGZpbGUgPSByZXNvbHZlKF9fZGlybmFtZSwgJy4uLy4uL3RzL3NwZWMvYXBwLm1vZHVsZS50cy50eHQnKTtcbiAgICBuZXcgU2VsZWN0b3IoZnMucmVhZEZpbGVTeW5jKGZpbGUsICd1dGY4JyksIGZpbGUpLnByaW50QWxsKCk7XG4gIH0pO1xuXG4gIHhpdCgncHJpbnRBbGxOb1R5cGUgc2hvdWxkIHdvcmsnLCAoKSA9PiB7XG4gICAgY29uc3QgZmlsZSA9IHJlc29sdmUoX19kaXJuYW1lLCAnLi4vLi4vdHMvc3BlYy9hcHAubW9kdWxlLnRzLnR4dCcpO1xuICAgIG5ldyBTZWxlY3Rvcihmcy5yZWFkRmlsZVN5bmMoZmlsZSwgJ3V0ZjgnKSwgZmlsZSkucHJpbnRBbGxOb1R5cGUoKTtcbiAgfSk7XG5cbiAgaXQoJ1F1ZXJ5IHNob3VsZCB3b3JrJywgKCkgPT4ge1xuICAgIC8vIGNvbnN0IGZpbGUgPSByZXNvbHZlKF9fZGlybmFtZSwgJy4uLy4uL3RzL3NwZWMvYXBwLm1vZHVsZS50cy50eHQnKTtcbiAgICAvLyBjb25zdCBzZWwgPSBuZXcgU2VsZWN0b3IoZnMucmVhZEZpbGVTeW5jKGZpbGUsICd1dGY4JyksIGZpbGUpO1xuICAgIGxldCBxID0gbmV3IFF1ZXJ5KCcuc3RhdGVtZW50czpWYXJpYWJsZVN0YXRlbWVudCAgLm5hbWVkQmluZGluZ3MgLmVsZW1lbnRzWzBdID4gOklkZW50aWZpZXInKTtcbiAgICBjb25zb2xlLmxvZyhxLnF1ZXJ5UGF0aHMpO1xuICAgIGV4cGVjdChxLnF1ZXJ5UGF0aHMuc2xpY2UoMCkubWFwKGMgPT4gYy5zbGljZSgwKS5yZXZlcnNlKCkpLnJldmVyc2UoKSkudG9FcXVhbChbXG4gICAgICBbeyBwcm9wZXJ0eU5hbWU6ICdzdGF0ZW1lbnRzJywga2luZDogJ1ZhcmlhYmxlU3RhdGVtZW50JyB9XSxcbiAgICAgIFt7IHByb3BlcnR5TmFtZTogJ25hbWVkQmluZGluZ3MnIH1dLFxuICAgICAgW3sgcHJvcGVydHlOYW1lOiAnZWxlbWVudHMnLCBwcm9wSW5kZXg6IDAgfSwgeyBraW5kOiAnSWRlbnRpZmllcicgfV1cbiAgICBdKTtcbiAgICBleHBlY3QoKHEgYXMgYW55KS5tYXRjaGVzQ29uc2VjdXRpdmVOb2RlcyhcbiAgICAgICAgWyhxIGFzIGFueSkuX3BhcnNlRGVzYygnLmZvb2JhcjpBYmMnKSwgKHEgYXMgYW55KS5fcGFyc2VEZXNjKCc6T2ZmJyldLnJldmVyc2UoKSxcbiAgICAgICAgWycuZm9vYmFyWzNdOkFiYycsICcuZW5kOk9mZiddLCAxXG4gICAgICApKS50b0JlKHRydWUpO1xuICAgIGV4cGVjdCgocSBhcyBhbnkpLm1hdGNoZXNDb25zZWN1dGl2ZU5vZGVzKFxuICAgICAgICBbKHEgYXMgYW55KS5fcGFyc2VEZXNjKCcuZm9vYmFyOkFiYycpLCAocSBhcyBhbnkpLl9wYXJzZURlc2MoJzpPZmYnKV0ucmV2ZXJzZSgpLFxuICAgICAgICBbJy5mb29iYXJbM106QWJjJywgJy5lbmQ6T2ZmJ10sIDBcbiAgICAgICkpLnRvQmUoZmFsc2UpO1xuXG4gICAgZXhwZWN0KHEubWF0Y2hlcyhcbiAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBtYXgtbGVuXG4gICAgICAnLnN0YXRlbWVudHNbMF06VmFyaWFibGVTdGF0ZW1lbnQ+LmltcG9ydENsYXVzZTpJbXBvcnRDbGF1c2U+Lm5hbWVkQmluZGluZ3M6TmFtZWRJbXBvcnRzPi5lbGVtZW50c1swXTpJbXBvcnRTcGVjaWZpZXI+Lm5hbWU6SWRlbnRpZmllcidcbiAgICAgIC5zcGxpdCgnPicpKSkudG9CZSh0cnVlKTtcbiAgICBxID0gbmV3IFF1ZXJ5KCc6SW1wb3J0RGVjbGFyYXRpb24gOklkZW50aWZpZXInKTtcbiAgICBleHBlY3QocS5tYXRjaGVzKCgnLnN0YXRlbWVudHNbMF06SW1wb3J0RGVjbGFyYXRpb24+LmltcG9ydENsYXVzZTpJbXBvcnRDbGF1c2U+Lm5hbWVkQmluZGluZ3M6TmFtZWRJbXBvcnRzPicgK1xuICAgICAgJy5lbGVtZW50c1swXTpJbXBvcnRTcGVjaWZpZXI+Lm5hbWU6SWRlbnRpZmllcicpLnNwbGl0KCc+JykpKS50b0JlKHRydWUpO1xuICAgIGV4cGVjdChxLm1hdGNoZXMoKCcuc3RhdGVtZW50c1swXTpJbXBvcnREZWNsYXJhdGlvbj4uaW1wb3J0Q2xhdXNlOkltcG9ydENsYXVzZT4ubmFtZWRCaW5kaW5nczpOYW1lZEltcG9ydHM+JyArXG4gICAgICAnLmVsZW1lbnRzWzFdOkltcG9ydFNwZWNpZmllcj4ubmFtZTpJZGVudGlmaWVyJykuc3BsaXQoJz4nKSkpLnRvQmUodHJ1ZSk7XG4gIH0pO1xuXG4gIGl0KCdmaW5kRmlyc3Qgc2hvdWxkIHdvcmsnLCAoKSA9PiB7XG4gICAgY29uc3QgZmlsZSA9IHJlc29sdmUoX19kaXJuYW1lLCAnLi4vLi4vdHMvc3BlYy9hcHAubW9kdWxlLnRzLnR4dCcpO1xuICAgIGNvbnN0IHNlbCA9IG5ldyBTZWxlY3Rvcihmcy5yZWFkRmlsZVN5bmMoZmlsZSwgJ3V0ZjgnKSwgZmlsZSk7XG4gICAgY29uc3QgZm91bmQgPSBzZWwuZmluZEZpcnN0KCc6SW1wb3J0RGVjbGFyYXRpb24gOklkZW50aWZpZXInKTtcbiAgICBleHBlY3QoZm91bmQgIT0gbnVsbCkudG9CZVRydXRoeSgpO1xuICAgIGV4cGVjdChmb3VuZCEuZ2V0VGV4dChzZWwuc3JjKSkudG9CZSgnSW5qZWN0YWJsZScpO1xuICB9KTtcblxuICBpdCgnZmluZEFsbCBzaG91bGQgd29yaycsICgpID0+IHtcbiAgICBjb25zdCBmaWxlID0gcmVzb2x2ZShfX2Rpcm5hbWUsICcuLi8uLi90cy9zcGVjL2FwcC5tb2R1bGUudHMudHh0Jyk7XG4gICAgY29uc3Qgc2VsID0gbmV3IFNlbGVjdG9yKGZzLnJlYWRGaWxlU3luYyhmaWxlLCAndXRmOCcpLCBmaWxlKTtcbiAgICBjb25zdCBmb3VuZCA9IHNlbC5maW5kQWxsKCc6SW1wb3J0RGVjbGFyYXRpb24gOklkZW50aWZpZXInKS5tYXAoYXN0ID0+IGFzdC5nZXRUZXh0KHNlbC5zcmMpKTtcblxuICAgIGNvbnNvbGUubG9nKGZvdW5kKTtcblxuICAgIGV4cGVjdChmb3VuZC5sZW5ndGgpLnRvQmUoMSk7XG4gIH0pO1xuXG4gIGl0KCdmaW5kV2l0aCBzaG91bGQgd29yaycsICgpID0+IHtcbiAgICBjb25zdCB0YXJnZXQgPSBgXG5cdFx0cGxhdGZvcm1Ccm93c2VyRHluYW1pYygpLmJvb3RzdHJhcE1vZHVsZShBcHBNb2R1bGUpXG5cdFx0ICAuY2F0Y2goZXJyID0+IGNvbnNvbGUubG9nKGVycikpO1xuXHRcdGA7XG4gICAgY29uc3QgcXVlcnkgPSBuZXcgU2VsZWN0b3IodGFyZ2V0LCAnbWFpbi1obXIudHMnKTtcbiAgICBjb25zb2xlLmxvZygnLS0tLS0tPj4+Pi0tLS0tLS0tLS0nKTtcbiAgICBxdWVyeS5wcmludEFsbChxdWVyeS5zcmMpO1xuICAgIC8vIGNvbnN0IGZvdW5kID0gcXVlcnkuZmluZEFsbChxdWVyeS5zcmMsXG4gICAgLy8gICAnOlByb3BlcnR5QWNjZXNzRXhwcmVzc2lvbiA+IC5leHByZXNzaW9uOkNhbGxFeHByZXNzaW9uID4gLmV4cHJlc3Npb246SWRlbnRpZmllcicpO1xuXG4gICAgLy8gY29uc29sZS5sb2coZm91bmQpO1xuXG4gICAgY29uc3QgYm9vdENhbGwgPSBxdWVyeS5maW5kTWFwVG8ocXVlcnkuc3JjLFxuICAgICAgJ14gLnN0YXRlbWVudHM+OkNhbGxFeHByZXNzaW9uIDpQcm9wZXJ0eUFjY2Vzc0V4cHJlc3Npb24gPiAuZXhwcmVzc2lvbjpDYWxsRXhwcmVzc2lvbiA+IC5leHByZXNzaW9uOklkZW50aWZpZXInLFxuICAgICAgKGFzdDogdHMuSWRlbnRpZmllciwgcGF0aCwgcGFyZW50cykgPT4ge1xuICAgICAgICAvLyBjb25zb2xlLmxvZygnLS0tLS0tPj4+Pi0tLS0tLS0tLS0nKTtcbiAgICAgICAgLy8gY29uc29sZS5sb2coYXN0LnRleHQsIChhc3QucGFyZW50LnBhcmVudCBhcyB0cy5Qcm9wZXJ0eUFjY2Vzc0V4cHJlc3Npb24pLm5hbWUuZ2V0VGV4dChxdWVyeS5zcmMpKTtcbiAgICAgICAgaWYgKGFzdC50ZXh0ID09PSAncGxhdGZvcm1Ccm93c2VyRHluYW1pYycgJiZcbiAgICAgICAgKGFzdC5wYXJlbnQucGFyZW50IGFzIHRzLlByb3BlcnR5QWNjZXNzRXhwcmVzc2lvbikubmFtZS5nZXRUZXh0KHF1ZXJ5LnNyYykgPT09ICdib290c3RyYXBNb2R1bGUnICYmXG4gICAgICAgIGFzdC5wYXJlbnQucGFyZW50LnBhcmVudC5raW5kID09PSB0cy5TeW50YXhLaW5kLkNhbGxFeHByZXNzaW9uKSB7XG4gICAgICAgICAgLy8gY29uc29sZS5sb2coJ2hlcmUnKTtcbiAgICAgICAgICByZXR1cm4gYXN0LnBhcmVudC5wYXJlbnQucGFyZW50O1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICBleHBlY3QoYm9vdENhbGwgIT0gbnVsbCkudG9CZSh0cnVlKTtcbiAgfSk7XG5cbn0pO1xuIl19