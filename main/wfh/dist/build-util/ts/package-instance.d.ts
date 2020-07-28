export default class PackageBrowserInstance {
    bundle: string;
    longName: string;
    shortName: string;
    file?: string;
    parsedName: {
        scope?: string;
        name: string;
    };
    scopeName?: string;
    entryPages?: string[];
    i18n: string;
    packagePath: string;
    realPackagePath: string;
    main: string;
    style?: string | null;
    entryViews?: string[];
    browserifyNoParse?: any[];
    isEntryServerTemplate: boolean;
    translatable: string;
    dr: any;
    json: any;
    browser: string;
    isVendor: boolean;
    appType: string;
    compiler?: any;
    constructor(attrs: any);
    init(attrs: {
        [key in keyof PackageBrowserInstance]?: PackageBrowserInstance[key];
    }): void;
    toString(): string;
}
