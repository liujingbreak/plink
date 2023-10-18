/* eslint-disable @typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-unsafe-return,@typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-call */
/**
 * Hack Node.js common module resolve process
 */

// export interface CmjHookFunction {
//   (): 
// }
import Module from 'module';


/**
 * Hook into Node.js common JS module require function
 */
export function hookCommonJsRequire(hook: (
  filename: string,
  target: string,
  originRequire: () => any,
  resolve: (id: string, options?: { paths?: string[] }) => string
) => any
) {
  const superReq = Module.prototype.require;
  Module.prototype.require = function(this: Module, target: string) {
    const callSuperReq = () => superReq.call(this, target);
    const exported = hook(this.filename, target, callSuperReq,
      (resolveTarget, options) => (Module as any)._resolveFilename(resolveTarget, this, false, options));
    return exported === undefined ? callSuperReq() : exported;
  } as any;
}
