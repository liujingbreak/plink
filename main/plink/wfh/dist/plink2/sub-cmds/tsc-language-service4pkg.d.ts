import { SimplexReactorMergeType, SimplexReactor, SingleActionFactory, InferPayload } from '@wfh/reactivizer';
import { PackageMgrFullServiceType } from '../../package-mgr/package-mgr2';
import { PlinkPackageLookupService } from '../../package-mgr/package-mgr2-lookup';
import { LanguageServiceType, LangServiceOutput } from './tsc-language-service';
interface PackageFeatureInput {
    setTsConfigOfPlinkBase(): SingleActionFactory;
    addSourcePackage(pkgNames: string[]): SingleActionFactory;
}
interface PackageFeatureOutput {
    /** In context of "addSourcePackage" */
    onEmitFileForPackage(file: string, content: string): SingleActionFactory;
    didAddSourcePackage(countFiles: number, emitFiles: string[], suggestions: [file: string, msg: string][], fails: InferPayload<LangServiceOutput['onEmitFailure']>[]): SingleActionFactory;
    onTscDirsConfig(data: Map<string, {
        isom?: string;
        srcRoots: string[];
        dest: string;
    }>): SingleActionFactory;
}
declare const newTableActions: readonly ["onTscDirsConfig"];
type FullFeaturedType = SimplexReactorMergeType<LanguageServiceType, SimplexReactor<PackageFeatureInput & PackageFeatureOutput, typeof newTableActions>>;
export declare function addOnPackageFeatures(baseService: LanguageServiceType, pkgMgr: PackageMgrFullServiceType, lookupService: PlinkPackageLookupService): FullFeaturedType;
export {};
