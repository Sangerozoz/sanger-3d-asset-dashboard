import assert from 'node:assert/strict';
import test from 'node:test';
import { displayAssetName, filterAssetRecords } from '../src/dashboard.js';

test('maps the two character assets to clean display names', () => {
  assert.equal(displayAssetName({ assetId: 'chef-sanger', displayName: '' }), '自由厨师（Sanger）');
  assert.equal(displayAssetName({ assetId: 'worker-sanger', displayName: '' }), '小工匠（Sanger）');
  assert.equal(displayAssetName({ assetId: 'other', displayName: '其他资产' }), '其他资产');
});

test('filters assets by search text and selected fields without changing asset ids', () => {
  const records = [
    { assetId: 'chef-sanger', name: '自由厨师', assetType: 'character', styleId: 'sanger-rounded-toy' },
    { assetId: 'worker-sanger', name: '小工匠', assetType: 'character', styleId: 'sanger-rounded-toy' },
    { assetId: 'rig_medium_tools', name: '工具动作', assetType: 'animation-rig', styleId: 'kaykit-character-animations' },
  ];
  assert.deepEqual(filterAssetRecords(records, '厨师', [['assetType', 'character']]).map(asset => asset.assetId), ['chef-sanger']);
  assert.deepEqual(filterAssetRecords(records, 'rig_', [['styleId', 'kaykit-character-animations']]).map(asset => asset.assetId), ['rig_medium_tools']);
  assert.deepEqual(filterAssetRecords(records, '', [['assetType', 'missing']]), []);
});


test('keeps filter controls as accessible text buttons without radio inputs', async () => {
  const source = await import('node:fs/promises').then(fs => fs.readFile(new URL('../src/dashboard.js', import.meta.url), 'utf8'));
  assert.doesNotMatch(source, /input\.type\s*=\s*['"]radio['"]/);
  assert.match(source, /aria-pressed/);
});
