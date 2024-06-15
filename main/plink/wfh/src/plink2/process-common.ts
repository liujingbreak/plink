import Path from 'node:path';
import fs from 'node:fs';
import chalk from 'chalk';

export function setupTTY(screenColumns: number, screenRows: number) {
  chalk.level = 3;
  process.stdout.isTTY = true;
  process.stderr.isTTY = true;
  process.stdout.columns = screenColumns;
  process.stderr.columns = screenColumns;
  process.stdout.rows = screenRows;
  process.stderr.rows = screenRows;
  process.stdout.hasColors = process.stderr.hasColors = (...cnt: any[]) => {
    return true;
  };
  process.stdout.getWindowSize = process.stderr.getWindowSize = () => [screenColumns, screenRows];
}

export function lookupPlinkRoot(cwd: string) {
  const {root} = Path.parse(cwd);
  let plinkRoot: string | undefined;
  while (cwd !== root) {
    if (fs.existsSync(Path.join(cwd, 'node_modules/@wfh/plink'))) {
      plinkRoot = cwd;
      break;
    }
    cwd = Path.dirname(cwd);
  }
  return plinkRoot;
}

/**
Block                                   Range       Comment
CJK Unified Ideographs                  4E00-9FFF   Common
CJK Unified Ideographs Extension A      3400-4DBF   Rare
CJK Unified Ideographs Extension B      20000-2A6DF Rare, historic
CJK Unified Ideographs Extension C      2A700–2B73F Rare, historic
CJK Unified Ideographs Extension D      2B740–2B81F Uncommon, some in current use
CJK Unified Ideographs Extension E      2B820–2CEAF Rare, historic
CJK Compatibility Ideographs            F900-FAFF   Duplicates, unifiable variants, corporate characters
CJK Compatibility Ideographs Supplement 2F800-2FA1F Unifiable variants
*/
const CJK_CODE_RANGE = [
  [0x4E00, 0x9FFF],
  [0x3400, 0x4DBF],
  [0x20000, 0x2A6DF]
];

/**
 * Simply guessing any code point that is greater than 16-bit (might be Surrogate pairs) is full-width character,
 * and code point within CJK range is also full-width
 */
export function isCodePointFullWidth(codePoint: number) {
  return codePoint > 0xffff || CJK_CODE_RANGE.some(([low, high]) => codePoint >= low && codePoint <= high);
}
