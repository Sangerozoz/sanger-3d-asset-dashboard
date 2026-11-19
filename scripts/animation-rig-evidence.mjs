import { animationCategoryNames } from '../data/asset-types.mjs';

export { animationCategoryNames };

// Keep this package's inventory independent of categories added by future providers.
const packageCategories = {
  CombatMelee: 'combat-melee', CombatRanged: 'combat-ranged', General: 'general',
  MovementAdvanced: 'movement-advanced', MovementBasic: 'movement-basic',
  Simulation: 'simulation', Special: 'special', Tools: 'tools',
};

const archiveFile = 'KayKit-Character-Animations-1-1.zip';
const archiveSha256 = '65882f31f905ad2e953819648a59287cdeab8f623908d5ef701971d3758be20f';
const packageDir = 'KayKit_Character_Animations_1.1/';
const rigDir = packageDir + 'Animations/gltf/Rig_Medium/';
const licenseMember = packageDir + 'License.txt';

function requireGlb(condition, message) {
  if (!condition) throw new Error(message);
}

// Parses the JSON + embedded BIN layout of these GLBs. This inspects track
// bindings and the named joint hierarchy without running animation playback.
export function inspectAnimationGlb(bytes) {
  requireGlb(bytes.length >= 28 && bytes.toString('latin1', 0, 4) === 'glTF', 'Invalid GLB header');
  requireGlb(bytes.readUInt32LE(4) === 2, 'Unsupported GLB version');
  requireGlb(bytes.readUInt32LE(8) === bytes.length, 'Invalid GLB length');
  requireGlb(bytes.readUInt32LE(16) === 0x4e4f534a, 'Missing GLB JSON chunk');
  const jsonSize = bytes.readUInt32LE(12);
  const bin = 20 + jsonSize;
  requireGlb(jsonSize % 4 === 0 && bin + 8 <= bytes.length, 'Invalid GLB JSON chunk length');
  requireGlb(bytes.readUInt32LE(bin + 4) === 0x004e4942, 'Missing GLB BIN chunk');
  requireGlb(bin + 8 + bytes.readUInt32LE(bin) === bytes.length, 'Invalid GLB BIN chunk length');
  const gltf = JSON.parse(bytes.toString('utf8', 20, bin));
  requireGlb(gltf.asset?.version === '2.0', 'Unsupported glTF version');
  const { nodes, animations } = gltf;
  requireGlb(Array.isArray(nodes) && gltf.skins?.length && animations?.length, 'Missing rig or clips');
  const parents = new Map();
  for (const [index, node] of nodes.entries()) {
    for (const child of node.children ?? []) {
      requireGlb(Number.isInteger(child) && nodes[child] && !parents.has(child), 'Invalid GLB node hierarchy');
      parents.set(child, index);
    }
  }
  const boundJoints = new Set();
  const skins = gltf.skins.map(skin => {
    requireGlb(typeof skin.name === 'string' && skin.name.trim() && skin.joints?.length, 'Missing named skin or joints');
    const joints = skin.joints.map(node => {
      requireGlb(Number.isInteger(node) && typeof nodes[node]?.name === 'string', 'Invalid joint');
      boundJoints.add(node);
      return { node, name: nodes[node].name, parent: nodes[parents.get(node)]?.name ?? null };
    });
    return { name: skin.name, joints };
  });
  const clips = animations.map(animation => {
    requireGlb(typeof animation.name === 'string' && animation.name.trim() && animation.channels?.length,
      'Missing clip name or channels');
    for (const channel of animation.channels) {
      requireGlb(boundJoints.has(channel.target.node), 'Clip target outside skin: ' + animation.name);
      const sampler = animation.samplers[channel.sampler];
      requireGlb(sampler && gltf.accessors[sampler.input] && gltf.accessors[sampler.output],
        'Invalid clip sampler: ' + animation.name);
    }
    return animation.name;
  });
  return { clips, skins, compatibility: skins.map(skin => skin.name) };
}

function zipChecksumCommand(member) {
  // Both operands are controlled by the pinned package and category inventory.
  return `unzip -p '${archiveFile}' '${member}' | shasum -a 256`;
}

// Local intake only. CI can use inspectAnimationGlb directly on a deployed GLB.
export async function collectAnimationRigEvidence(sourceDir, { verifyZip = false } = {}) {
  const { default: assert } = await import('node:assert/strict');
  const { execFileSync } = await import('node:child_process');
  const { createHash } = await import('node:crypto');
  const { readFile, readdir } = await import('node:fs/promises');
  const path = await import('node:path');
  const { fileURLToPath } = await import('node:url');
  sourceDir ??= path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../sunny-kitchen/assets/source');
  const fingerprint = bytes => ({ size: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') });
  const zip = path.resolve(sourceDir, archiveFile);
  const archive = { file: archiveFile, ...fingerprint(await readFile(zip)) };
  assert.equal(archive.sha256, archiveSha256, 'Source ZIP differs from the audited 1.1 archive');
  const extract = member => execFileSync('unzip', ['-p', zip, member], { maxBuffer: 4 * 1024 * 1024 });
  const licenseBytes = extract(licenseMember);
  const licenseText = licenseBytes.toString('utf8');
  assert(licenseText.includes('License: (Creative Commons Zero, CC0)')
    && licenseText.includes('http://creativecommons.org/publicdomain/zero/1.0/'), 'Missing CC0 1.0 declaration');
  const license = {
    zipMember: licenseMember, spdx: 'CC0-1.0', ...fingerprint(licenseBytes),
    zipChecksumCommand: zipChecksumCommand(licenseMember),
  };
  const localDir = path.join(sourceDir, 'kaykit/animations');
  const files = (await readdir(localDir)).filter(file => /\.glb$/i.test(file)).sort();
  const categoriesByFile = new Map(Object.entries(packageCategories)
    .map(([suffix, category]) => ['Rig_Medium_' + suffix + '.glb', category]));
  assert.deepEqual(files, [...categoriesByFile.keys()].sort(), 'Local GLBs differ from the audited Rig_Medium inventory');
  const assets = [];
  for (const file of files) {
    const zipMember = rigDir + file;
    const bytes = await readFile(path.join(localDir, file));
    if (verifyZip) assert(bytes.equals(extract(zipMember)), 'Local GLB differs from ZIP member: ' + file);
    assets.push({
      file, category: categoriesByFile.get(file), zipMember, zipChecksumCommand: zipChecksumCommand(zipMember),
      matchesZipMember: verifyZip ? true : null, ...fingerprint(bytes), ...inspectAnimationGlb(bytes),
    });
  }
  return {
    evidence: {
      archive, license, assets, checksumWorkingDirectory: 'directory containing the source ZIP',
      verification: {
        skeleton: 'file-metadata-only', playback: 'unverified', retargeting: 'unverified', humanReview: 'unverified',
      },
    },
    licenseBytes,
  };
}

async function runCli() {
  const { parseArgs } = await import('node:util');
  const { values, positionals } = parseArgs({
    allowPositionals: true, options: { license: { type: 'boolean' }, 'verify-zip': { type: 'boolean' } },
  });
  if (positionals.length > 1) throw new Error('Usage: node animation-rig-evidence.mjs [--verify-zip] [--license] [source-dir]');
  const { evidence, licenseBytes } = await collectAnimationRigEvidence(positionals[0], { verifyZip: values['verify-zip'] });
  process.stdout.write(values.license ? licenseBytes : JSON.stringify(evidence, null, 2) + '\n');
}

if (import.meta.main) runCli();
