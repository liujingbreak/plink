export = loader;
declare function loader(content: string, map: any): void;
declare namespace loader {
    const compileHtml: typeof load;
}
declare function load(content: string, loader: any): Promise<string>;
