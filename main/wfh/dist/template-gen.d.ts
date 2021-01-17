export interface TemplReplacement {
    fileMapping?: [RegExp, string][];
    /** lodah template */
    textMapping?: {
        [key: string]: string;
    };
    /** Suffix name of target file, default: /(?:[tj]sx?|s?css|json|yaml|yml|html|svg)$/ */
    includeTextType?: RegExp;
}
export interface GenerateOption {
    dryrun?: boolean;
}
/**
 * The template file name and directory name is replaced by regular expression,
 * file name suffix is removed, therefor you should use a double suffix as a template
 * file name (like 'hellow.ts.txt' will become 'hellow.ts').
 *
 * lodash template setting:
 * - interpolate: /\$__([\s\S]+?)__\$/g,
 * - evaluate: /\/\*<%([\s\S]+?)%>\*\//g,
 *
 * The template file content is replace by lodash template function
 * @param templDir
 * @param targetPath
 * @param replacement
 * @param opt
 */
export default function generateStructure(templDir: string, targetPath: string, replacement: TemplReplacement, opt?: GenerateOption): Promise<any>;
