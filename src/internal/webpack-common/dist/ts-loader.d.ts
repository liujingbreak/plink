import * as wp from 'webpack';
import RJ from 'require-injector';
export interface Options {
    tsConfigFile: string;
    injector: RJ;
    compileExpContext?: (sourceFile: string) => {
        [varName: string]: any;
    };
}
declare const loader: wp.LoaderDefinitionFunction<Options>;
export default loader;
