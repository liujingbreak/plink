declare class Configurable {
    rule: any;
    addTsFiles(filePatterns: string[], tsconfigFile: string): this;
    build(): any;
}
declare const instance: Configurable;
export default instance;
