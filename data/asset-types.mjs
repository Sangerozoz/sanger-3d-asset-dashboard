/** Shared display labels. Unknown types can still fall back to their machine value. */
export const assetTypeNames = Object.freeze({
  character: '角色',
  vehicle: '载具',
  building: '建筑',
  prop: '道具',
  'animation-rig': '动作骨骼',
});

/** Machine values used by the first audited KayKit animation package. */
export const animationCategoryNames = Object.freeze({
  'combat-melee': '近战',
  'combat-ranged': '远程战斗',
  general: '通用',
  'movement-advanced': '进阶移动',
  'movement-basic': '基础移动',
  simulation: '模拟',
  special: '特殊',
  tools: '工具',
});

/**
 * Optional metadata on an existing asset record; absence leaves legacy records valid.
 * This contract does not change root status, validation, or the evidence protocol.
 *
 * @typedef {Object} Animation
 * @property {string} provider Provider display name.
 * @property {string} sourceName Original package/source name.
 * @property {string} sourceUrl HTTP(S) provenance URL or catalog-relative local evidence path.
 * @property {string} license Single SPDX identifier (e.g. CC0-1.0), not a display label.
 * @property {string} licenseUrl Catalog-relative deployed file preserving the original license.
 * @property {string[]} compatibility Nonempty skeleton identifiers; not proof of retargeting.
 * @property {string} category Maintained lowercase kebab-case machine value, e.g. locomotion.
 * @property {string[]} tags Free-form nonempty strings; the array itself may be empty.
 * @property {string} format Lowercase machine value, e.g. glb or gltf.
 * @property {string} fileUrl Catalog-relative deployed asset path; one GLB per record.
 * @property {string[]} clips Nonempty exact embedded clip names, in file order; duplicates allowed.
 *
 * File existence, license provenance, actual clips, skeleton compatibility, playback,
 * and human acceptance require separate evidence. Shape validation proves none of them.
 * Extra fields are tolerated for additive evolution and preserved by URL resolution.
 */

const isText = value => typeof value === 'string' && value.trim().length > 0;
const machineValue = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const urlFields = ['sourceUrl', 'licenseUrl', 'fileUrl'];

// Local paths stay inside the catalog directory, including under a Pages prefix.
// Decode before checking segments so percent-encoded traversal is rejected too.
function isLocalPath(value) {
  try {
    const decoded = decodeURIComponent(value);
    return value === value.trim() && !/[\s\\\u0000-\u001f\u007f]/.test(value)
      && !/[\\\u0000-\u001f\u007f]/.test(decoded)
      && !/^[/?#]/.test(decoded) && !/^[a-z][a-z0-9+.-]*:/i.test(decoded)
      && !decoded.split(/[/?#]/).includes('..');
  } catch {
    return false;
  }
}

function isSourceUrl(value) {
  if (isLocalPath(value)) return true;
  try {
    const url = new URL(value);
    return value === value.trim() && !/[\s\\\u0000-\u001f\u007f]/.test(value)
      && ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password;
  } catch {
    return false;
  }
}

/**
 * Pure, non-throwing shape check. Returns field-prefixed error strings, or [].
 * `undefined` is the only absent value; null is malformed metadata.
 * SPDX syntax is checked, not membership in a registry or legal validity.
 * @param {Animation|undefined} animation
 * @returns {string[]}
 */
export function validateAnimation(animation) {
  if (animation === undefined) return [];
  if (animation === null || typeof animation !== 'object' || Array.isArray(animation)) {
    return ['animation: expected an object or undefined'];
  }
  const errors = [];
  for (const field of ['provider', 'sourceName', 'sourceUrl', 'license', 'licenseUrl', 'category', 'format', 'fileUrl']) {
    if (!isText(animation[field])) errors.push(field + ': expected a nonempty string');
  }
  for (const field of ['compatibility', 'tags', 'clips']) {
    const values = animation[field];
    if (!Array.isArray(values) || Array.from(values).some(value => !isText(value))
      || (field !== 'tags' && values.length === 0)) {
      errors.push(field + ': expected an array of nonempty strings' + (field === 'tags' ? '' : ' with at least one entry'));
    }
  }
  for (const field of ['category', 'format']) {
    if (isText(animation[field]) && !machineValue.test(animation[field])) {
      errors.push(field + ': expected a lowercase kebab-case machine value');
    }
  }
  if (isText(animation.license) && !/^[A-Za-z0-9][A-Za-z0-9.+-]*$/.test(animation.license)) {
    errors.push('license: expected a single SPDX identifier');
  }
  for (const field of urlFields) {
    if (isText(animation[field]) && !(field === 'sourceUrl' ? isSourceUrl(animation[field]) : isLocalPath(animation[field]))) {
      errors.push(field + ': expected ' + (field === 'sourceUrl' ? 'an HTTP(S) URL or ' : '') + 'a catalog-relative local path');
    }
  }
  return errors;
}

/**
 * Resolve all three URLs against the catalog file URL (prefer response.url after
 * redirects). Returns a shallow copy; never mutates input or adds verification.
 * This is an explicit consumer step; raw catalog records retain relative URLs.
 * @param {Animation|undefined} animation
 * @param {string|URL} catalogUrl Absolute catalog file URL.
 * @returns {Animation|undefined}
 * @throws {TypeError} Invalid metadata or base URL.
 */
export function resolveAnimationUrls(animation, catalogUrl) {
  const errors = validateAnimation(animation);
  if (errors.length) throw new TypeError(errors.join('; '));
  if (animation === undefined) return undefined;
  const base = new URL(catalogUrl);
  return {
    ...animation,
    ...Object.fromEntries(urlFields.map(field => [field, new URL(animation[field], base).href])),
  };
}
