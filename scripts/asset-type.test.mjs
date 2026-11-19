import assert from 'node:assert/strict';
import test from 'node:test';
import { assetTypeNames, validateAnimation, resolveAnimationUrls } from '../data/asset-types.mjs';

const animation = () => ({
  provider: 'KayKit', sourceName: 'Character Animations 1.1',
  sourceUrl: 'animation-rigs/kaykit/SOURCES.md', license: 'CC0-1.0',
  licenseUrl: 'animation-rigs/kaykit/License.txt', compatibility: ['kaykit-humanoid'],
  category: 'locomotion', tags: ['walk', 'in-place'], format: 'glb',
  fileUrl: 'animation-rigs/kaykit/General.glb', clips: ['Idle', 'Walk'],
});
const base = 'https://pages.invalid/project/assets/asset-index.json';

test('labels retain every existing type and add animation-rig', () => {
  assert.deepEqual(assetTypeNames, {
    character: '角色', vehicle: '载具', building: '建筑', prop: '道具', 'animation-rig': '动作骨骼',
  });
  assert(Object.isFrozen(assetTypeNames));
});

test('animation is optional; existing character fields and validation stay untouched', () => {
  const character = Object.freeze({ assetType: 'character', status: 'accepted',
    validation: Object.freeze({ status: 'fail' }) });
  assert.deepEqual(validateAnimation(character.animation), []);
  assert.equal(resolveAnimationUrls(character.animation, base), undefined);
  assert.deepEqual(character, { assetType: 'character', status: 'accepted', validation: { status: 'fail' } });
  for (const value of [null, [], 'animation', 1]) assert(validateAnimation(value).length > 0);
});

test('valid contract does not infer verification or change clips and compatibility', () => {
  const input = animation();
  const before = structuredClone(input);
  assert.deepEqual(validateAnimation(input), []);
  assert.deepEqual(input, before);
  assert.equal(input.validation, undefined);
  assert.equal(input.status, undefined);
  assert.deepEqual(validateAnimation({ ...input, license: 'MIT', format: 'gltf', category: 'combat-melee' }), []);
});

test('every required string rejects missing, empty and non-string values', () => {
  for (const field of ['provider', 'sourceName', 'sourceUrl', 'license', 'licenseUrl', 'category', 'format', 'fileUrl']) {
    for (const value of [undefined, '', '   ', 7, null]) {
      assert(validateAnimation({ ...animation(), [field]: value }).some(error => error.startsWith(field + ':')), field);
    }
  }
});

test('array fields require strings, while clips retain exact names and allow duplicates', () => {
  for (const field of ['compatibility', 'tags', 'clips']) {
    for (const value of [undefined, null, 'Idle', [1], [''], ['   '], new Array(1)]) {
      assert(validateAnimation({ ...animation(), [field]: value }).some(error => error.startsWith(field + ':')), field);
    }
  }
  assert.deepEqual(validateAnimation({ ...animation(), tags: [] }), []);
  for (const field of ['clips', 'compatibility']) assert(validateAnimation({ ...animation(), [field]: [] }).length > 0);
  assert.deepEqual(validateAnimation({ ...animation(), clips: ['Armature|Idle', 'Walk Forward', 'Idle', 'Idle'] }), []);
});

test('machine values and SPDX identifier syntax reject display labels and expressions', () => {
  for (const [field, values] of Object.entries({ category: ['动作', 'Combat Melee', 'Combat'],
    format: ['GLB', '.glb'], license: ['Creative Commons Zero', 'MIT OR Apache-2.0'] })) {
    for (const value of values) assert(validateAnimation({ ...animation(), [field]: value }).length > 0);
  }
});

test('local deployment URLs reject external, root, traversal, query-only and unsafe references', () => {
  for (const field of ['licenseUrl', 'fileUrl']) {
    for (const value of ['https://other.invalid/a', '//other.invalid/a', '/assets/a', '../a',
      '%2e%2e/a', 'a/../../b', 'a\\b', 'data:text/plain,a', '#clip', '?raw', 'a\nb', 'a/%zz']) {
      assert(validateAnimation({ ...animation(), [field]: value }).some(error => error.startsWith(field + ':')), value);
    }
  }
  for (const value of ['javascript:alert(1)', 'file:///tmp/source', '//other.invalid/source']) {
    assert(validateAnimation({ ...animation(), sourceUrl: value }).length > 0);
  }
  assert.deepEqual(validateAnimation({ ...animation(), sourceUrl: 'https://provider.invalid/pack' }), []);
});

test('URL resolution uses the catalog URL and preserves Pages prefixes without mutation', () => {
  const input = animation();
  const before = structuredClone(input);
  const resolved = resolveAnimationUrls(input, new URL(base));
  for (const field of ['sourceUrl', 'licenseUrl', 'fileUrl']) {
    assert.equal(resolved[field], 'https://pages.invalid/project/assets/' + input[field]);
  }
  assert.deepEqual(input, before);
  assert.notEqual(resolved, input);
  const external = 'https://provider.invalid/pack';
  assert.equal(resolveAnimationUrls({ ...input, sourceUrl: external }, base).sourceUrl, external);
  assert.throws(() => resolveAnimationUrls({ ...input, clips: [] }, base), TypeError);
  assert.throws(() => resolveAnimationUrls(input, 'relative/catalog.json'), TypeError);
});
