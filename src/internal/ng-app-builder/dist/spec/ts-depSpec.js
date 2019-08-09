"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const typescript_1 = tslib_1.__importDefault(require("typescript"));
const fs_1 = tslib_1.__importDefault(require("fs"));
const ts_ast_query_1 = tslib_1.__importDefault(require("../utils/ts-ast-query"));
describe('ts', () => {
    it('should can list dependencies', () => {
        const file = '/Users/liujing/bk/dr-comp-package/wfh/ts/config-handler.ts';
        const src = typescript_1.default.createSourceFile(file, fs_1.default.readFileSync(file, 'utf8'), typescript_1.default.ScriptTarget.ES2015);
        // console.log(src.statements);
        new ts_ast_query_1.default(src).printAll();
    });
});

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci90cy9zcGVjL3RzLWRlcFNwZWMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsb0VBQTRCO0FBQzVCLG9EQUFvQjtBQUNwQixpRkFBMEM7QUFFMUMsUUFBUSxDQUFDLElBQUksRUFBRSxHQUFHLEVBQUU7SUFDbEIsRUFBRSxDQUFDLDhCQUE4QixFQUFFLEdBQUcsRUFBRTtRQUN0QyxNQUFNLElBQUksR0FBRyw0REFBNEQsQ0FBQztRQUMxRSxNQUFNLEdBQUcsR0FBRyxvQkFBRSxDQUFDLGdCQUFnQixDQUFDLElBQUksRUFDbEMsWUFBRSxDQUFDLFlBQVksQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLEVBQUUsb0JBQUUsQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDLENBQUM7UUFFekQsK0JBQStCO1FBQy9CLElBQUksc0JBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQztJQUM1QixDQUFDLENBQUMsQ0FBQztBQUNMLENBQUMsQ0FBQyxDQUFDIiwiZmlsZSI6Im5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci9kaXN0L3NwZWMvdHMtZGVwU3BlYy5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB0cyBmcm9tICd0eXBlc2NyaXB0JztcbmltcG9ydCBmcyBmcm9tICdmcyc7XG5pbXBvcnQgUXVlcnkgZnJvbSAnLi4vdXRpbHMvdHMtYXN0LXF1ZXJ5JztcblxuZGVzY3JpYmUoJ3RzJywgKCkgPT4ge1xuICBpdCgnc2hvdWxkIGNhbiBsaXN0IGRlcGVuZGVuY2llcycsICgpID0+IHtcbiAgICBjb25zdCBmaWxlID0gJy9Vc2Vycy9saXVqaW5nL2JrL2RyLWNvbXAtcGFja2FnZS93ZmgvdHMvY29uZmlnLWhhbmRsZXIudHMnO1xuICAgIGNvbnN0IHNyYyA9IHRzLmNyZWF0ZVNvdXJjZUZpbGUoZmlsZSxcbiAgICAgIGZzLnJlYWRGaWxlU3luYyhmaWxlLCAndXRmOCcpLCB0cy5TY3JpcHRUYXJnZXQuRVMyMDE1KTtcblxuICAgIC8vIGNvbnNvbGUubG9nKHNyYy5zdGF0ZW1lbnRzKTtcbiAgICBuZXcgUXVlcnkoc3JjKS5wcmludEFsbCgpO1xuICB9KTtcbn0pO1xuIl19
