/**
 * Logger — Centralized logging and spinner management.
 *
 * Wraps ora for spinners and chalk for consistent colored output.
 * All modules use this instead of console.log directly.
 */

import chalk from 'chalk';
import ora, { type Ora } from 'ora';

let verboseMode = false;

export function setVerbose(enabled: boolean): void {
  verboseMode = enabled;
}

export function info(message: string): void {
  console.log(chalk.blue('ℹ'), message);
}

export function success(message: string): void {
  console.log(chalk.green('✓'), message);
}

export function warn(message: string): void {
  console.log(chalk.yellow('⚠'), message);
}

export function error(message: string): void {
  console.error(chalk.red('✗'), message);
}

export function debug(message: string): void {
  if (verboseMode) {
    console.log(chalk.gray('⋯'), chalk.gray(message));
  }
}

export function createSpinner(text: string): Ora {
  return ora({
    text,
    color: 'cyan',
    spinner: 'dots',
  });
}
