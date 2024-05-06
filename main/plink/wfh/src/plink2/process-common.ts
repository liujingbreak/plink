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

