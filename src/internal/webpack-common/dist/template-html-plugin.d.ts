import { Compiler } from 'webpack';
export interface TemplateHtmlPluginOptions {
    htmlFile: string;
}
export default class TemplateHtmlPlugin {
    private htmlWebpackPlugin;
    apply(compiler: Compiler): void;
}
export declare function transformHtml(this: void, html: string): string;
