
### Modify package.json file

```json
"dr": {
  "cli": "dist/cli.js#default"
}
```
`cli.js` can be any file file, `#default` can be any other **export** member function name.

### Template `ts/cli.ts`

```ts
import {CliExtension, GlobalOptions, initConfigAsync} from '@wfh/plink/wfh/dist';

const cliExt: CliExtension = (program, withGlobalOptions) => {
  const cmd = program.command('hellow [package...]')
  .description('Hellow command description')
  .option('-f, --file <spec>', 'run single file')
  .action(async (packages: string[]) => {
    // If you want to utilize Plink's configuration system
    await initConfigAsync(cmd.opts() as GlobalOptions);
    // TODO
    (await import('your-function-file')).foobar();
  });
  // If you want to utilize Plink's configuration system
  withGlobalOptions(cliExt);
};

export default cliExt;
```

#### Always lazily import/require files in `.action()` handler
Command is a program's entry, so you may want to initialize some configuration or process event handler before require/import
other feature files which depends on configuration or Plink's `__api` interface.

By using: async import syntax or require() function in `.action()`

#### Other Plink useful functions for a command `.action()` handler.
TBD.
