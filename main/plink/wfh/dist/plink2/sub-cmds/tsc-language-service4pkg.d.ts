import { ReactorCompositeExtendType, SingleActionFactory } from '@wfh/reactivizer';
import { PackageMgrFullServiceType } from '../../package-mgr/package-mgr2';
import { LanguageServiceType } from './tsc-language-service';
interface PackageFeatureInput {
    setTsConfigOfPlinkBase(): SingleActionFactory;
    addSourcePackage(pkgNames: string[]): SingleActionFactory;
}
interface PackageFeatureOutput {
    didAddSourcePackage(count: number): SingleActionFactory;
}
export declare function addOnPackageFeatures(baseService: LanguageServiceType, pkgMgr: PackageMgrFullServiceType): ReactorCompositeExtendType<LanguageServiceType, PackageFeatureInput, PackageFeatureOutput>;
export {};
