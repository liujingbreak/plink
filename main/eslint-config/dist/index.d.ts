import { ConfigWithExtends } from '@eslint/config-helpers';
declare class Configurable {
    common: ConfigWithExtends;
    specifics: ConfigWithExtends[];
    addTsFiles(filePatterns: string[], tsconfigFile: string): this;
    build(): import("eslint").Linter.Config<import("eslint").Linter.RulesRecord>[];
}
declare const instance: Configurable;
export default instance;
