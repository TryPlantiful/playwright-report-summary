import { includeIgnoreFile } from '@eslint/compat';
import eslint from '@eslint/js';
import globals from 'globals';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import tsEslint from 'typescript-eslint';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const tsconfigPath = path.resolve(__dirname, 'tsconfig.json');
const gitignorePaths = [path.join('.gitignore')];
const ignores = Array.from(
  new Set([
    'node_modules',
    'dist',
    'eslint.config.mjs',
    '.prettierrc.js',
    'tests/',
    ...gitignorePaths
      .filter((gitignorePath) => fs.existsSync(gitignorePath))
      .flatMap((gitignorePath) =>
        (
          includeIgnoreFile(path.resolve(__dirname, gitignorePath)).ignores ||
          []
        ).map((ignore) => path.join(path.dirname(gitignorePath), ignore)),
      ),
  ]),
).sort();

const config = tsEslint.config(
  { ignores },
  eslint.configs.recommended,
  tsEslint.configs.recommended,
  tsEslint.configs.eslintRecommended,
  {
    files: ['**/*.ts', '*.ts'],
    ignores: ['playwright.config.ts'],
    languageOptions: {
      ecmaVersion: 'latest',
      globals: {
        ...globals.browser,
        ...globals.es2021,
      },
      parserOptions: {
        project: [tsconfigPath],
        rootDir: path.resolve(__dirname),
      },
      sourceType: 'module',
    },

    rules: {
      'import/extensions': 0,
      'import/no-extraneous-dependencies': 0,
      'import/no-unresolved': [0],
      'no-empty-pattern': 0,
      'no-undef': 0,
      'no-use-before-define': 0,
    },
  },
);

export default config;
