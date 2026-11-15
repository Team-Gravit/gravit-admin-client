import { mkdtempSync, mkdirSync, writeFileSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findSyncArtifacts } from './sync-artifacts.mjs';

function fixture(run) {
  const root = mkdtempSync(join(tmpdir(), 'gravit-sync-check-'));
  try {
    run(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test('복제 파일과 디렉터리 및 그 안의 복제 파일을 찾는다', () => {
  fixture((root) => {
    mkdirSync(join(root, 'src 2'));
    writeFileSync(join(root, 'src 2', 'api 2.ts'), '');
    writeFileSync(join(root, 'schema.test 2.tsx'), '');
    assert.deepEqual(findSyncArtifacts(root), ['schema.test 2.tsx', 'src 2', 'src 2/api 2.ts']);
  });
});

test('공백 없는 숫자와 중간의 숫자 및 일반 파일은 허용한다', () => {
  fixture((root) => {
    for (const name of ['api2.ts', 'phase 2 final.md', 'api.ts'])
      writeFileSync(join(root, name), '');
    assert.deepEqual(findSyncArtifacts(root), []);
  });
});

test('의존성과 생성 결과 및 git 내부는 제외한다', () => {
  fixture((root) => {
    for (const name of [
      '.git',
      'node_modules',
      'dist',
      'coverage',
      'playwright-report',
      'test-results',
    ]) {
      mkdirSync(join(root, name));
      writeFileSync(join(root, name, 'api 2.ts'), '');
    }
    assert.deepEqual(findSyncArtifacts(root), []);
  });
});

test('외부 디렉터리 심볼릭 링크는 따라가지 않는다', () => {
  fixture((root) => {
    symlinkSync(root, join(root, 'loop'));
    assert.deepEqual(findSyncArtifacts(root), []);
  });
});
