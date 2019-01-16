import { RawSourceMap } from 'source-map';
import { loader as wbLoader } from 'webpack';
declare function loader(content: string, map?: RawSourceMap): void;
declare namespace loader {
    const compileHtml: typeof load;
}
export = loader;
declare function load(content: string, loader: wbLoader.LoaderContext): Promise<string>;
//# sourceMappingURL=ng-html-loader.d.ts.map