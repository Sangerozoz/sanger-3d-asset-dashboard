import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { animationCategoryNames, validateAnimation } from '../data/asset-types.mjs';
import { inspectAnimationGlb } from './animation-rig-evidence.mjs';

const dashboard = fileURLToPath(new URL('../', import.meta.url));
const factory = path.resolve(dashboard, '../asset-factory');
const output = path.join(dashboard, 'public/assets');
const fixedViews = ['front', 'three-quarter', 'side', 'back', 'clay'];
const animationRoot = path.join(output, 'animation-rigs', 'kaykit');
const checkOnly = process.argv.includes('--check');
assert(process.argv.slice(2).every(arg => arg === '--check'), 'Usage: node build-asset-index.mjs [--check]');

async function readOptional(file) {
  try {
    return await fs.readFile(file);
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

async function readJson(file) {
  return JSON.parse(await fs.readFile(file, 'utf8'));
}

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

async function readAnimationRigs() {
  const manifestFile = path.join(animationRoot, 'manifest.json');
  const manifestBytes = await readOptional(manifestFile);
  if (manifestBytes === null) return [];
  const manifest = JSON.parse(manifestBytes);
  assert(manifest.schemaVersion === 1 && manifest.packageId === 'kaykit-character-animations',
    'animation-rigs/kaykit: invalid package manifest');
  assert(manifest.license?.spdx === 'CC0-1.0', 'animation-rigs/kaykit: expected CC0-1.0');
  assert(manifest.license?.zipMember && manifest.license.sha256, 'animation-rigs/kaykit: invalid license evidence');
  const license = await fs.readFile(path.join(animationRoot, 'License.txt'));
  assert.equal(sha256(license), manifest.license.sha256, 'animation-rigs/kaykit: License.txt hash mismatch');
  assert(manifest.assets?.length === 8, 'animation-rigs/kaykit: expected eight GLBs');
  const files = new Set();
  const keys = new Set();
  const records = [];
  for (const item of manifest.assets) {
    assert(typeof item.file === 'string' && path.basename(item.file) === item.file && item.file.toLowerCase().endsWith('.glb'),
      'animation-rigs/kaykit: invalid GLB filename');
    assert(!files.has(item.file), 'animation-rigs/kaykit: duplicate GLB filename: ' + item.file);
    files.add(item.file);
    assert(Object.hasOwn(animationCategoryNames, item.category), 'animation-rigs/kaykit: unknown category: ' + item.category);
    assert(Array.isArray(item.clips) && item.clips.length > 0,
      'animation-rigs/kaykit: invalid asset entry');
    const fileBytes = await fs.readFile(path.join(animationRoot, item.file));
    assert.equal(sha256(fileBytes), item.sha256, 'animation-rigs/kaykit: GLB hash mismatch: ' + item.file);
    const inspected = inspectAnimationGlb(fileBytes);
    assert.deepEqual(inspected.clips, item.clips, 'animation-rigs/kaykit: clip mismatch: ' + item.file);
    assert.deepEqual(inspected.compatibility, ['Rig_Medium'], 'animation-rigs/kaykit: skin mismatch: ' + item.file);
    assert.equal(inspected.skins.length, 1, 'animation-rigs/kaykit: skin count mismatch: ' + item.file);
    const assetId = item.file.replace(/\.glb$/i, '').toLowerCase();
    const key = 'candidates/kaykit-character-animations/animation-rig/' + assetId;
    assert(!keys.has(key), 'animation-rigs/kaykit: duplicate record key: ' + key);
    keys.add(key);
    const animation = {
      provider: manifest.provider, sourceName: manifest.sourceName, sourceUrl: manifest.sourceUrl,
      license: manifest.license.spdx, licenseUrl: 'animation-rigs/kaykit/License.txt',
      compatibility: inspected.compatibility, category: item.category, tags: ['kaykit', 'rig-medium'],
      format: 'glb', fileUrl: 'animation-rigs/kaykit/' + item.file, clips: inspected.clips,
    };
    assert.deepEqual(validateAnimation(animation), [], 'animation-rigs/kaykit: invalid animation metadata: ' + item.file);
    const displayName = (animationCategoryNames[item.category] ?? item.category) + '动作';
    records.push({
      key,
      assetId, displayName,
      styleId: 'kaykit-character-animations', styleLabel: 'KayKit 卡通动作',
      assetType: 'animation-rig', assetTypeLabel: '动作骨骼', version: '1.1.0',
      status: 'candidate', isActive: false,
      screenshots: Object.fromEntries(fixedViews.map(view => [view, null])),
      declaredViews: [], sourceFiles: ['manifest.json', item.file], references: [], generatedAt: null,
      animation,
      validation: {
        status: 'review_required', generatedAt: null,
        checks: { manifest: true, license: true, glb: true, clips: true, skin: true, zipMember: item.matchesZipMember === true },
        scores: null, errors: [], warnings: ['Playback and retargeting are not tested; static file validation only.'],
      },
    });
  }
  assert.equal(records.reduce((count, asset) => count + asset.animation.clips.length, 0), 139,
    'animation-rigs/kaykit: expected 139 clips');
  records.sort((left, right) => Buffer.compare(Buffer.from(left.key), Buffer.from(right.key)));
  return records;
}

async function readOpenSourceAssets() {
  const root = path.join(output, 'open-source');
  const packages = ['kaykit-adventurers', 'quaternius-sushi', 'kenney-platformer-kit'];
  const records = [];
  for (const packageId of packages) {
    const dir = path.join(root, packageId);
    const manifestFile = path.join(dir, 'manifest.json');
    const manifestBytes = await readOptional(manifestFile);
    if (manifestBytes === null) continue;
    const manifest = JSON.parse(manifestBytes);
    assert(manifest.schemaVersion === 1 && manifest.packageId && manifest.provider && manifest.sourceName && manifest.sourceUrl,
      'open-source/' + packageId + ': invalid package manifest');
    assert(manifest.license?.spdx === 'CC0-1.0' && manifest.license?.url && manifest.license?.evidenceFile,
      'open-source/' + packageId + ': invalid CC0 license metadata');
    assert(Array.isArray(manifest.assets) && manifest.assets.length > 0,
      'open-source/' + packageId + ': missing asset entries');
    const licenseFile = 'open-source/' + packageId + '/' + manifest.license.evidenceFile;
    const licenseBytes = await readOptional(path.join(dir, manifest.license.evidenceFile));
    assert(licenseBytes !== null && licenseBytes.length > 0, 'open-source/' + packageId + ': missing license evidence');
    assert(manifest.license.sha256 && Number.isInteger(manifest.license.size),
      'open-source/' + packageId + ': missing license hash evidence');
    assert.equal(sha256(licenseBytes), manifest.license.sha256,
      'open-source/' + packageId + ': license hash mismatch');
    assert.equal(licenseBytes.length, manifest.license.size,
      'open-source/' + packageId + ': license size mismatch');
    const packageManifestFile = 'open-source/' + packageId + '/manifest.json';
    const assetTypeLabels = { character: '角色', building: '建筑', prop: '道具' };
    for (const item of manifest.assets) {
      assert(typeof item.file === 'string' && path.basename(item.file) === item.file && !item.file.includes('\\'),
        'open-source/' + packageId + ': invalid asset path');
      assert(item.assetId && item.name && item.category && item.style && assetTypeLabels[item.category],
        'open-source/' + packageId + ': invalid asset entry');
      assert(item.sha256 && Number.isInteger(item.size),
        'open-source/' + packageId + ': missing file hash evidence: ' + item.file);
      const fileBytes = await readOptional(path.join(dir, item.file));
      assert(fileBytes !== null && fileBytes.length > 0, 'open-source/' + packageId + ': missing asset file ' + item.file);
      assert.equal(sha256(fileBytes), item.sha256,
        'open-source/' + packageId + ': asset hash mismatch: ' + item.file);
      assert.equal(fileBytes.length, item.size,
        'open-source/' + packageId + ': asset size mismatch: ' + item.file);
      const fileUrl = 'open-source/' + packageId + '/' + item.file;
      const key = 'candidates/' + packageId + '/' + item.category + '/' + item.assetId;
      records.push({
        key, assetId: item.assetId, displayName: item.name, styleId: packageId, styleLabel: item.style,
        assetType: item.category, assetTypeLabel: assetTypeLabels[item.category],
        version: manifest.version ?? manifest.archive?.version ?? '1.0.0', status: 'candidate', isActive: false,
        screenshots: Object.fromEntries(fixedViews.map(view => [view, null])), declaredViews: [],
        sourceFiles: [packageManifestFile, licenseFile, fileUrl],
        references: [], generatedAt: null,
        tags: [item.style, ...(item.tags ?? []), manifest.provider],
        source: {
          provider: manifest.provider, sourceName: manifest.sourceName, sourceUrl: manifest.sourceUrl,
          packageId: manifest.packageId, packageVersion: manifest.version ?? manifest.archive?.version ?? null,
          retrievedAt: manifest.retrievedAt ?? null, archive: manifest.archive ?? null,
          license: manifest.license.spdx, licenseUrl: licenseFile, licenseSourceUrl: manifest.license.url, licenseFile,
          licenseSha256: manifest.license.sha256, licenseSize: manifest.license.size,
          fileUrl, fileSha256: item.sha256, fileSize: item.size, sourceMember: item.sourceMember ?? null,
        },
        validation: {
          status: 'pass', generatedAt: null,
          checks: { manifest: true, license: true, licenseHash: true, licenseSize: true, file: true, fileHash: true, fileSize: true }, scores: null, errors: [],
          warnings: ['模型文件已做静态文件校验，未接入当前内置角色播放器。'],
        },
      });
    }
  }
  return records;
}

async function* manifests(directory, { optional = false } = {}) {
  let entries;
  try {
    entries = await fs.readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (optional && error.code === 'ENOENT') return;
    throw error;
  }
  for (const entry of entries) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) yield* manifests(file);
    if (entry.isFile() && entry.name === 'manifest.json') yield file;
  }
}

const media = new Map();
function registerImage(bytes, ext) {
  const digest = createHash('sha256').update(bytes).digest('hex');
  const url = 'catalog-media/' + digest + ext;
  media.set(url, bytes);
  return url;
}

async function readRevision(manifestFile, active) {
  const dir = path.dirname(manifestFile);
  const key = path.relative(factory, dir).split(path.sep).join('/');
  const manifest = await readJson(manifestFile);
  const { assetId, styleId, assetType, version, status } = manifest;
  for (const field of ['assetId', 'styleId', 'assetType', 'version', 'status']) {
    assert(typeof manifest[field] === 'string' && manifest[field].trim(), key + ': missing ' + field);
  }
  assert(Array.isArray(manifest.views) && Array.isArray(manifest.sourceFiles), key + ': invalid manifest');
  const screenshots = {};
  for (const view of fixedViews) {
    const bytes = await readOptional(path.join(dir, 'screenshots', view + '.jpg'));
    screenshots[view] = bytes ? registerImage(bytes, '.jpg') : null;
  }

  const references = [];
  for (const file of manifest.referenceFiles ?? []) {
    assert(!path.isAbsolute(file) && !file.split(/[\\/]/).includes('..'), key + ': invalid reference path');
    const ext = path.extname(file).toLowerCase();
    const bytes = ['.png', '.jpg', '.jpeg', '.webp'].includes(ext) ? await readOptional(path.join(dir, file)) : null;
    references.push({ file, url: bytes ? registerImage(bytes, ext) : null });
  }

  const validationBytes = await readOptional(path.join(dir, 'validation.json'));
  const validation = validationBytes === null ? { status: 'unvalidated' } : JSON.parse(validationBytes);
  assert(typeof validation.status === 'string', key + ': invalid validation status');

  return {
    key, assetId, styleId, assetType, version, status,
    isActive: active.styles[styleId]?.assets?.[assetId] === key,
    screenshots, declaredViews: manifest.views, sourceFiles: manifest.sourceFiles, references,
    generatedAt: manifest.generatedAt ?? null,
    validation: {
      status: validation.status, generatedAt: validation.generatedAt ?? null,
      checks: validation.checks ?? {}, scores: validation.scores ?? null,
      errors: validation.errors ?? [], warnings: validation.warnings ?? [],
    },
  };
}

async function outputFile(relative, bytes) {
  const file = path.join(output, relative);
  const existing = await readOptional(file);
  if (existing?.equals(bytes)) return;
  assert(!checkOnly, 'Missing or outdated generated file: ' + relative);
  await fs.mkdir(path.dirname(file), { recursive: true });
  const temporary = file + '.' + randomUUID() + '.tmp';
  try {
    await fs.writeFile(temporary, bytes);
    await fs.rename(temporary, file);
  } finally {
    await fs.rm(temporary, { force: true });
  }
}

const factoryBaseline = path.join(factory, 'active-baseline.json');
if (await readOptional(factoryBaseline) === null) {
  const checkedIndex = await readJson(path.join(output, 'asset-index.json'));
  assert(checkedIndex.schemaVersion === 1 && Array.isArray(checkedIndex.assets), 'Invalid checked-in asset index');
  const animationRigs = await readAnimationRigs();
  const indexedAnimationRigs = checkedIndex.assets.filter(asset => asset.assetType === 'animation-rig')
    .sort((left, right) => Buffer.compare(Buffer.from(left.key), Buffer.from(right.key)));
  assert.deepEqual(indexedAnimationRigs, animationRigs, 'Checked-in animation index is outdated');
  let mediaCount = 0;
  for (const asset of checkedIndex.assets) {
    for (const url of Object.values(asset.screenshots ?? {})) {
      if (url) {
        assert(await readOptional(path.join(output, url)) !== null, 'Missing indexed media: ' + url);
        mediaCount += 1;
      }
    }
    for (const reference of asset.references ?? []) {
      if (reference.url) {
        assert(await readOptional(path.join(output, reference.url)) !== null, 'Missing indexed media: ' + reference.url);
        mediaCount += 1;
      }
    }
  }
  console.log('Verified checked-in asset-index.json with ' + checkedIndex.assets.length + ' revisions and ' + mediaCount + ' media references.');
  process.exit(0);
}

const activeBaseline = await readJson(factoryBaseline);
const assets = [];
for (const area of ['baselines', 'candidates']) {
  const dir = path.join(factory, area);
  // An empty candidates directory may be absent in a Git checkout.
  for await (const manifest of manifests(dir, { optional: area === 'candidates' })) {
    assets.push(await readRevision(manifest, activeBaseline));
  }
}
assets.push(...await readAnimationRigs());
assets.push(...await readOpenSourceAssets());
assets.sort((left, right) => Buffer.compare(Buffer.from(left.key), Buffer.from(right.key)));
const byKey = new Map(assets.map(asset => [asset.key, asset]));
for (const [styleId, style] of Object.entries(activeBaseline.styles)) {
  for (const [assetId, key] of Object.entries(style.assets ?? {})) {
    const revision = byKey.get(key);
    assert(key.startsWith('baselines/') && revision?.status === 'accepted'
      && revision.isActive && revision.styleId === styleId && revision.assetId === assetId,
    'Invalid active baseline: ' + [styleId, assetId, key].join(' / '));
  }
}
const distinct = field => [...new Set(assets.map(asset => asset[field]))].sort();
const index = {
  schemaVersion: 1, activeBaseline, fixedViews,
  filters: { styleIds: distinct('styleId'), assetTypes: distinct('assetType'), statuses: distinct('status') },
  assets,
};
for (const [file, bytes] of media) await outputFile(file, bytes);
await outputFile('asset-index.json', Buffer.from(JSON.stringify(index, null, 2) + '\n'));
console.log((checkOnly ? 'Verified' : 'Generated') + ' asset-index.json with ' + assets.length + ' revisions, '
  + assets.filter(asset => asset.isActive).length + ' active baselines and ' + media.size + ' media files.');
