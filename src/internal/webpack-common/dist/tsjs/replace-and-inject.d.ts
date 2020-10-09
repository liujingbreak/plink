import RJ from 'require-injector';
export default function replace(file: string, source: string, injector: RJ, tsConfigFile: string, compileExpContex: {
    [varName: string]: any;
}): string;
