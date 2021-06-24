declare module 'eslint/lib/cli' {
  export function execute(args: string[], stdin: null | string): number;
}
