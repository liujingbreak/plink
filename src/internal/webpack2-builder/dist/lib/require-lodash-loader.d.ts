declare function loader(content: string, map: any): any;
declare namespace loader {
    function doEs(code: string, file: string): [string, any];
    class TSParser {
        private requireLodashPos;
        private lodashFunctions;
        private file;
        private patches;
        doTs(code: string, file: string): string;
        private traverseTsAst;
    }
}
export = loader;
//# sourceMappingURL=require-lodash-loader.d.ts.map