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
