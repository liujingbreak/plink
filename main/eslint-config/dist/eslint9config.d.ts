import { ConfigWithExtends } from 'typescript-eslint';
export declare function createConfigObj(tsconfigDir: string, tsconfigFileName?: string): (...more: ConfigWithExtends[]) => import("@typescript-eslint/utils/ts-eslint").FlatConfig.ConfigArray;
