export default class PackageBrowserInstance {
    longName: string;
    shortName: string;
    /** @deprecated */
    parsedName: {
        scope?: string;
        name: string;
    };
    scopeName?: string;
    i18n: string;
    packagePath: string;
    realPackagePath: string;
    browserifyNoParse?: any[];
    translatable: string;
    dr: any;
    json: any;
    isVendor: boolean;
    appType: string;
    constructor(attrs: {
        [key in keyof PackageBrowserInstance]?: PackageBrowserInstance[key];
    });
    init(attrs: {
        [key in keyof PackageBrowserInstance]?: PackageBrowserInstance[key];
    }): void;
    toString(): string;
}
