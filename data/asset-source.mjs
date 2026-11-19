import { resolveAnimationUrls } from './asset-types.mjs';

const animationRigDisplayNames = Object.freeze({
  rig_medium_combatmelee: '近战动作',
  rig_medium_combatranged: '远程战斗动作',
  rig_medium_general: '通用动作',
  rig_medium_movementadvanced: '进阶移动动作',
  rig_medium_movementbasic: '基础移动动作',
  rig_medium_simulation: '模拟动作',
  rig_medium_special: '特殊动作',
  rig_medium_tools: '工具使用动作',
});

// All media paths in the raw catalog are relative to the catalog file itself.
export async function loadAssetIndex(indexUrl = new URL('assets/asset-index.json', document.baseURI)) {
  const response = await fetch(indexUrl);
  if (!response.ok) throw new Error('Asset catalog request failed (' + response.status + ')');
  const index = await response.json();
  if (index.schemaVersion !== 1) throw new Error('Unsupported asset catalog schema: ' + index.schemaVersion);
  const resolveMedia = url => url === null ? null : new URL(url, response.url).href;
  return {
    ...index,
    assets: index.assets.map(revision => ({
      ...revision,
      screenshots: Object.fromEntries(Object.entries(revision.screenshots).map(([view, url]) => [view, resolveMedia(url)])),
      references: revision.references.map(reference => ({ ...reference, url: resolveMedia(reference.url) })),
      ...(revision.animation ? { animation: resolveAnimationUrls(revision.animation, response.url) } : {}),
      ...(!revision.displayName && revision.assetType === 'animation-rig'
        && Object.hasOwn(animationRigDisplayNames, revision.assetId)
        ? { displayName: animationRigDisplayNames[revision.assetId] }
        : {}),
    })),
  };
}

export function listAssets(index, filters = {}) {
  return index.assets.filter(asset =>
    ['styleId', 'assetType', 'assetId', 'status', 'version', 'isActive'].every(field =>
      filters[field] === undefined || asset[field] === filters[field]));
}

export function getAssetDetail(index, key) {
  const revision = index.assets.find(asset => asset.key === key);
  if (!revision) return null;
  const { styleId, assetType, assetId } = revision;
  const versions = listAssets(index, { styleId, assetType, assetId });
  return { revision, versions, active: versions.find(asset => asset.isActive) ?? null };
}
