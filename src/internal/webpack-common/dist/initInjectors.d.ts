import { walkPackages } from '@wfh/plink/wfh/dist/package-mgr/package-info-gathering';
export default function walkPackagesAndSetupInjector(deployUrl: string, ssr?: boolean): Promise<ReturnType<typeof walkPackages>>;
