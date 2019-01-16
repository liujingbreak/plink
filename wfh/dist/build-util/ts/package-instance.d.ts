export default class PackageBrowserInstance {
    bundle: string;
    longName: string;
    shortName: string;
    file: string;
    parsedName: {
        scope: string;
        name: string;
    };
    scopeName: string;
    entryPages: string[];
    i18n: string;
    packagePath: string;
    realPackagePath: string;
    main: string;
    style: string;
    entryViews: string[];
    browserifyNoParse: any[];
    isEntryServerTemplate: boolean;
    translatable: string;
    dr: any;
    json: any;
    browser: string;
    isVendor: boolean;
    appType: string;
    constructor(attrs: any);
    init(attrs: any): void;
    toString(): string;
}
import { DirTree } from 'require-injector/dist/dir-tree';
export declare class LazyPackageFactory {
    packagePathMap: DirTree<PackageBrowserInstance>;
    getPackageByPath(file: string): PackageBrowserInstance;
}
//# sourceMappingURL=package-instance.d.ts.map