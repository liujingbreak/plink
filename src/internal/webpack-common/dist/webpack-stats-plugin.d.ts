/**
 * Create-react-app hijacked Webpack stats format, I need this plugin to prints more information
 * for library compilation
 */
import { Compiler } from 'webpack';
export default class StatsPlugin {
    apply(compiler: Compiler): void;
}
