import RJ from 'require-injector';
import { FactoryMapCollection, FactoryMapInterf } from 'require-injector/dist/factory-map';
export declare class DrPackageInjector extends RJ {
    protected noNode: boolean;
    constructor(resolve: (id: string) => string, noNode?: boolean);
    addPackage(name: string, dir: string): void;
    fromComponent(name: string | string[], dir?: string | string[]): FactoryMapCollection;
    fromAllComponents(): FactoryMapInterf;
    fromAllPackages(): FactoryMapInterf;
    notFromPackages(...excludePackages: string[]): FactoryMapInterf;
    readInjectFile(fileNameWithoutExt: string): Promise<void>;
}
export declare let nodeInjector: DrPackageInjector;
export declare let webInjector: DrPackageInjector;
