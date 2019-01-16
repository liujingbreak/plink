/// <reference types="node" />
import { loader as wl } from 'webpack';
import { RawSourceMap } from 'source-map';
declare function loader(this: wl.LoaderContext, content: string | Buffer, sourceMap?: RawSourceMap): string | Buffer | void | undefined;
declare namespace loader {
    const raw = true;
}
export = loader;
//# sourceMappingURL=dr-file-loader.d.ts.map