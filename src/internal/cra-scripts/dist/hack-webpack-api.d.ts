import _webpack from 'webpack';
/**
 * CRA only has "build" command which runs Webpack compiler.run() function, but we want to
 * support "watch" function, so hack Webpack's compiler.run() function by replacing it with
 * compiler.watch() function
 */
export declare function hackWebpack4Compiler(): ((args_0: any, ...args_1: any[]) => _webpack.Compiler) & typeof _webpack;
