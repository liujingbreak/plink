declare const cssAutoPrefixSetting: {
    browsers: string[];
};
declare const styleLoaders: {
    css: any[];
    less: any[];
    scss: any[];
};
export { cssAutoPrefixSetting, styleLoaders };
export declare function isIssuerAngular(file: string): boolean;
export declare function isIssuerNotAngular(file: string): boolean;
