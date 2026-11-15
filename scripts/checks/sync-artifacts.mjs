import { readdirSync } from 'node:fs';
import { resolve, relative, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const EXCLUDED_DIRECTORIES = new Set([
  '.git',
  'node_modules',
  'dist',
  'coverage',
  'playwright-report',
  'test-results',
]);

export function findSyncArtifacts(root) {
  const matches = [];
  function visit(directory) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (entry.isDirectory() && EXCLUDED_DIRECTORIES.has(entry.name)) continue;
      const path = join(directory, entry.name);
      if (/ 2(?:\.[^/]+)?$/.test(entry.name)) matches.push(relative(root, path));
      if (entry.isDirectory()) visit(path);
    }
  }
  visit(root);
  return matches.sort();
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const artifacts = findSyncArtifacts(process.cwd());
  if (artifacts.length > 0) {
    console.error(
      `동기화 복제 후보 ${artifacts.length}개를 확인해 정리해주세요:\n${artifacts.join('\n')}`,
    );
    process.exitCode = 1;
  } else {
    console.log('sync-artifacts OK (파일·디렉터리 후보 0개)');
  }
}
