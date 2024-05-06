/**
 * Hack Node.js common module resolve process
 */
/**
 * Hook into Node.js common JS module require function
 */
export declare function hookCommonJsRequire(hook: (filename: string, target: string, originRequire: () => any, resolve: (id: string, options?: {
    paths?: string[];
}) => string) => any): void;
