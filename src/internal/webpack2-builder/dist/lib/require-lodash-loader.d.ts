declare function loader(content: string, map: any): any;
declare namespace loader {
    function doEs(code: string, file: string): [string, any];
    class TSParser {
        private requireLodashPos;
        private lodashFunctions;
        private file;
        private patches;
        doTs(code: string, file: string): string;
        private traverseTsAst(ast, srcfile, level?);
    }
}
export = loader;
