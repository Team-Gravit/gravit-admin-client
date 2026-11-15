const { readdirSync } = require('node:fs');

const features = readdirSync(`${__dirname}/src/features`, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);
const testFiles = ['src/**/*.test.{ts,tsx}', 'src/test/**', 'src/mocks/**'];
const commonRestrictions = [
  { group: ['./**', '../**'], message: '내부 import는 @/ 절대경로를 사용하세요.' },
  {
    group: ['@/test', '@/test/**', '@/mocks', '@/mocks/**'],
    message: '제품 코드에서 테스트 전용 모듈을 참조할 수 없습니다.',
  },
];
const restrict = (...groups) => [
  'error',
  {
    patterns: [
      ...commonRestrictions,
      ...groups.map((group) => ({ group, message: '레이어와 feature 의존 방향을 유지하세요.' })),
    ],
  },
];

module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
    'plugin:@tanstack/query/recommended',
  ],
  ignorePatterns: [
    'dist',
    'node_modules',
    '.eslintrc.cjs',
    'vite.config.ts',
    'tailwind.config.ts',
    'postcss.config.js',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
  plugins: ['react-refresh', '@typescript-eslint', '@tanstack/query'],
  rules: {
    'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    // 04 §3-4 / antipatterns: any 금지
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
  },
  overrides: [
    {
      files: ['src/**/*.{ts,tsx}'],
      excludedFiles: testFiles,
      rules: { 'no-restricted-imports': restrict() },
    },
    {
      files: ['src/shared/**/*.{ts,tsx}'],
      excludedFiles: testFiles,
      rules: {
        'no-restricted-imports': restrict([
          '@/features',
          '@/features/**',
          '@/pages',
          '@/pages/**',
          '@/app',
          '@/app/**',
        ]),
      },
    },
    {
      files: ['src/pages/**/*.{ts,tsx}'],
      excludedFiles: testFiles,
      rules: { 'no-restricted-imports': restrict(['@/app', '@/app/**']) },
    },
    ...features.map((feature) => ({
      files: [`src/features/${feature}/**/*.{ts,tsx}`],
      excludedFiles: testFiles,
      rules: {
        'no-restricted-imports': restrict([
          '@/app',
          '@/app/**',
          '@/pages',
          '@/pages/**',
          ...features
            .filter((name) => name !== feature)
            .flatMap((name) => [`@/features/${name}`, `@/features/${name}/**`]),
        ]),
      },
    })),
  ],
};
