export interface PackageInfo {
    name: string;
    priority?: string | number;
}
export type PackageInfoWithPriority = {
    [key in keyof PackageInfo]-?: PackageInfo[key];
};
export declare function orderPackages(packages: PackageInfo[], run: (pk: PackageInfoWithPriority) => Promise<any> | any): Promise<void>;
