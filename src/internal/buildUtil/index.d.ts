import PackageBrowserInstance from './dist/package-instance';
export interface PackageInfo {
	allModules: PackageBrowserInstance[];
	moduleMap: {[name: string]: PackageBrowserInstance};
	dirTree: {getAllData(dirPath: string): string[]};
}

export {PackageBrowserInstance as packageInstance};
