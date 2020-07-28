import _ from 'lodash';
declare function _findPackage(shortName: string): {
    name: string;
    packageJson: any;
    dir: string;
};
export declare const findPackage: typeof _findPackage & _.MemoizedFunction;
export {};
