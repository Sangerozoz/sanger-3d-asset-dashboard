import assert from 'node:assert/strict';
import test from 'node:test';
import { describeBootError, retryUrl } from '../src/boot.js';

test('boot errors preserve the stage, message, and resource URL', () => {
  assert.deepEqual(describeBootError(new Error('Failed to fetch'), {
    stage: 'bootstrap', url: 'https://pages.invalid/project/assets/app.js',
  }), {
    stage: 'bootstrap', message: 'Failed to fetch', url: 'https://pages.invalid/project/assets/app.js',
  });
});

test('retry URL keeps a GitHub Pages prefix and adds a cache-busting query', () => {
  const result = new URL(retryUrl('https://pages.invalid/project/', 'https://pages.invalid/project/'));
  assert.equal(result.pathname, '/project/');
  assert.match(result.searchParams.get('reload'), /^[a-z0-9]+$/);
});

test('retry URL resolves relative URLs against the current page', () => {
  assert.equal(new URL(retryUrl('./index.html', 'https://pages.invalid/project/')).pathname, '/project/index.html');
});
