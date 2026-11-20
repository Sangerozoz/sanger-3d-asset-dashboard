import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { getAssetDetail, listAssets, loadAssetIndex } from '../data/asset-source.mjs';

const catalogFile = new URL('../public/assets/asset-index.json', import.meta.url);

test('all deployed media resolve beneath a Pages project prefix', async t => {
  const projectUrl = new URL('https://pages.invalid/example-project/assets/asset-index.json');
  const catalog = JSON.parse(await readFile(catalogFile, 'utf8'));
  t.mock.method(globalThis, 'fetch', async url => {
    assert.equal(url.href, projectUrl.href);
    return { ok: true, url: url.href, json: async () => catalog };
  });
  const index = await loadAssetIndex(projectUrl);
  assert.deepEqual(index.activeBaseline, catalog.activeBaseline);
  for (const revision of index.assets) {
    const urls = [...Object.values(revision.screenshots), ...revision.references.map(ref => ref.url)];
    for (const url of urls.filter(value => value !== null && !/^https?:\/\//i.test(value))) {
      const prefix = new URL('catalog-media/', projectUrl).href;
      assert(url.startsWith(prefix));
      assert((await readFile(new URL('catalog-media/' + url.slice(prefix.length), catalogFile))).length > 0);
    }
    const pointer = index.activeBaseline.styles[revision.styleId]?.assets?.[revision.assetId];
    assert.equal(revision.isActive, pointer === revision.key);
  }
});

test('filters and detail preserve competing revisions and their statuses', () => {
  const active = { key: 'baselines/a', assetId: 'a', assetType: 'prop', styleId: 'toy', version: '1.0.0',
    status: 'accepted', isActive: true, validation: { status: 'fail' }, screenshots: { side: null } };
  const candidate = { ...active, key: 'candidates/a', isActive: false, status: 'candidate' };
  const alternate = { ...active, key: 'baselines/other', styleId: 'other', assetType: 'vehicle' };
  const index = { assets: [active, candidate, alternate] };
  assert.deepEqual(listAssets(index, { styleId: 'toy', assetType: 'prop' }), [active, candidate]);
  assert.deepEqual(listAssets(index, { styleId: 'other', assetType: 'prop' }), []);
  assert.deepEqual(listAssets(index, { version: '1.0.0', status: 'candidate', isActive: false }), [candidate]);
  assert.deepEqual(getAssetDetail(index, candidate.key), { revision: candidate, versions: [active, candidate], active });
  assert.equal(getAssetDetail(index, 'absent'), null);
});


test('generated modular record persists source paths and imported production notes', async () => {
  const catalog = JSON.parse(await readFile(catalogFile, 'utf8'));
  const modular = catalog.assets.find(asset => asset.assetType === 'modular-character');
  assert.equal(modular.key, 'candidates/sanger-modular-character/modular-character/chef-modular-kit-sanger');
  assert.deepEqual(modular.sourceFiles, [
    'src/models/chef.js',
    'public/assets/animation-rigs/kaykit/Rig_Medium_General.glb',
  ]);
  assert.equal(modular.productionNotes.length, 4);
  assert.equal(modular.references.length, 3);
  assert.equal(modular.modularCharacter.plannedSkeleton, 'Rig_Medium');
});
