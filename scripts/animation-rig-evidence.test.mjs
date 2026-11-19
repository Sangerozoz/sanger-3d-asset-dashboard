import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, rm, stat, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { animationCategoryNames, collectAnimationRigEvidence, inspectAnimationGlb } from './animation-rig-evidence.mjs';

const sourceDir = process.env.KAYKIT_SOURCE_DIR ?? fileURLToPath(new URL('../../sunny-kitchen/assets/source/', import.meta.url));
const archiveFile = 'KayKit-Character-Animations-1-1.zip';
const packageDir = 'KayKit_Character_Animations_1.1/';
const script = fileURLToPath(new URL('./animation-rig-evidence.mjs', import.meta.url));
const counts = {
  CombatMelee: 22, CombatRanged: 20, General: 15, MovementAdvanced: 13,
  MovementBasic: 11, Simulation: 14, Special: 15, Tools: 29,
};
const files = Object.keys(counts).map(category => 'Rig_Medium_' + category + '.glb');

// A dashboard-only checkout omits the source project. Explicitly requested
// source directories, incomplete source packs and mismatches must fail.
let skip = false;
try {
  await stat(sourceDir);
} catch (error) {
  if (error.code !== 'ENOENT' || process.env.KAYKIT_SOURCE_DIR !== undefined) throw error;
  skip = 'Local sunny-kitchen source package absent in this checkout';
}

test('audits the eight original ZIP members, their clip names and joint hierarchy', { skip }, async () => {
  const { evidence } = await collectAnimationRigEvidence(sourceDir, { verifyZip: true });
  assert.equal(evidence.archive.file, archiveFile);
  assert.deepEqual(evidence.assets.map(asset => asset.file), files);
  assert.equal(evidence.assets.reduce((sum, asset) => sum + asset.clips.length, 0), 139);
  const hierarchy = skin => new Map(skin.joints.map(joint => [joint.name, joint.parent]));
  for (const [index, asset] of evidence.assets.entries()) {
    assert.equal(asset.zipMember, packageDir + 'Animations/gltf/Rig_Medium/' + asset.file);
    assert.equal(asset.matchesZipMember, true);
    assert.equal(asset.zipChecksumCommand, `unzip -p '${archiveFile}' '${asset.zipMember}' | shasum -a 256`);
    assert(Object.hasOwn(animationCategoryNames, asset.category));
    const bytes = await readFile(path.join(sourceDir, 'kaykit/animations', asset.file));
    assert.equal(asset.size, bytes.length);
    assert.equal(asset.sha256, createHash('sha256').update(bytes).digest('hex'));
    const json = JSON.parse(bytes.toString('utf8', 20, 20 + bytes.readUInt32LE(12)));
    assert.deepEqual(asset.clips, json.animations.map(clip => clip.name));
    assert.equal(asset.clips.length, Object.values(counts)[index]);
    assert.deepEqual(asset.compatibility, ['Rig_Medium']);
    assert.equal(asset.skins.length, 1);
    const [skin] = asset.skins;
    assert.equal(skin.name, 'Rig_Medium');
    assert.equal(skin.joints.length, 23);
    assert.deepEqual(skin.joints.map(joint => joint.name), json.skins[0].joints.map(i => json.nodes[i].name));
    assert.equal(skin.joints.find(j => j.name === 'hips').parent, 'root');
    assert.deepEqual(skin.joints.map(joint => joint.node), json.skins[0].joints);
    assert.deepEqual(hierarchy(skin), hierarchy(evidence.assets[0].skins[0]));
  }
  assert.deepEqual(evidence.verification, {
    skeleton: 'file-metadata-only', playback: 'unverified', retargeting: 'unverified', humanReview: 'unverified',
  });
});

test('reproduces the evidence and emits the original CC0 license bytes', { skip }, async () => {
  const { evidence, licenseBytes } = await collectAnimationRigEvidence(sourceDir);
  assert.deepEqual(evidence.license, {
    zipMember: packageDir + 'License.txt', spdx: 'CC0-1.0', size: 1548,
    zipChecksumCommand: `unzip -p '${archiveFile}' '${packageDir}License.txt' | shasum -a 256`,
    sha256: '373b159044d1a886ed15f57ca5a7673ba14e2623c460283452705f2056912ed9',
  });
  assert.equal(createHash('sha256').update(licenseBytes).digest('hex'), evidence.license.sha256);
  assert.equal(licenseBytes.length, evidence.license.size);
  assert(evidence.assets.every(asset => asset.matchesZipMember === null));
  assert.deepEqual(execFileSync(process.execPath, [script, '--license', sourceDir]), licenseBytes);
  assert.equal(execFileSync(process.execPath, [script, sourceDir], { encoding: 'utf8' }),
    JSON.stringify(evidence, null, 2) + '\n');
});

test('rejects a missing GLB and a different GLB under the expected filename', { skip }, async t => {
  const temp = await mkdtemp(path.join(tmpdir(), 'kaykit-evidence-'));
  t.after(() => rm(temp, { recursive: true, force: true }));
  const local = path.join(temp, 'kaykit/animations');
  await mkdir(local, { recursive: true });
  await symlink(path.join(path.resolve(sourceDir), archiveFile), path.join(temp, archiveFile));
  for (const file of files.slice(1)) {
    await symlink(path.resolve(sourceDir, 'kaykit/animations', file), path.join(local, file));
  }
  await assert.rejects(collectAnimationRigEvidence(temp), /differ from the audited Rig_Medium inventory/);
  await writeFile(path.join(local, files[0]), await readFile(path.join(local, files[1])));
  await assert.rejects(collectAnimationRigEvidence(temp, { verifyZip: true }), /Local GLB differs from ZIP member/);
});

test('exports the first batch of machine categories for the UI', () => {
  assert.deepEqual(Object.keys(animationCategoryNames).sort(), [
    'combat-melee', 'combat-ranged', 'general', 'movement-advanced', 'movement-basic', 'simulation', 'special', 'tools',
  ]);
  assert(Object.values(animationCategoryNames).every(label => typeof label === 'string' && label.trim()));
});

test('rejects bad GLB headers, JSON chunk types and chunk lengths', () => {
  assert.throws(() => inspectAnimationGlb(Buffer.alloc(28)), /Invalid GLB header/);
  const header = Buffer.alloc(28);
  header.write('glTF');
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(header.length, 8);
  assert.throws(() => inspectAnimationGlb(header), /Missing GLB JSON chunk/);
  header.writeUInt32LE(0x4e4f534a, 16);
  header.writeUInt32LE(4000, 12);
  assert.throws(() => inspectAnimationGlb(header), /Invalid GLB JSON chunk length/);
});
