import * as postcss from 'postcss';
export interface PostcssCliResourcesOptions {
    deployUrl?: string;
    filename: string;
    loader: any;
}
declare const _default: postcss.Plugin<PostcssCliResourcesOptions>;
export default _default;
