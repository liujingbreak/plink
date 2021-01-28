import { walkPackages } from '@wfh/plink/wfh/dist/package-mgr/package-info-gathering';
/**
 * @deprecated
 * @param deployUrl
 * @param ssr
 */
export default function walkPackagesAndSetupInjector(deployUrl: string, ssr?: boolean): Promise<ReturnType<typeof walkPackages>>;
