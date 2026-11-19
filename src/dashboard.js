// previewAdapter.mount(host, asset, { signal }) may return a cleanup function or a Promise of one.
import { assetTypeNames, animationCategoryNames } from '../data/asset-types.mjs';

const statusNames = { draft: '草稿', candidate: '候选', review: '待审核', accepted: '已验收', rejected: '已退回', deprecated: '已弃用' };
const viewNames = { front: '正面', 'three-quarter': '四分之三侧面', side: '侧面', back: '背面', clay: '白模' };
const styleName = value => value === 'sanger-rounded-toy' ? 'Sanger Rounded Toy' : value;
const paths = {
  cube: '<path d="m12 2 9 5v10l-9 5-9-5V7zM3 7l9 5 9-5M12 12v10M7.5 4.5l9 5"/>',
  layers: '<path d="m12 3 9 5-9 5-9-5zM3 12l9 5 9-5M3 16l9 5 9-5"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9" r="1.5"/><path d="m4 18 5-5 3 3 4-6 5 7"/>',
  search: '<circle cx="10" cy="10" r="6"/><path d="m15 15 5 5"/>',
  arrow: '<path d="m9 6 6 6-6 6"/>',
  open: '<path d="M14 4h6v6m0-6-9 9M10 5H5v14h14v-5"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>'
};
function icon(id) {
  const box = document.createElement('span');
  box.className = 'assetlib-icon';
  box.setAttribute('aria-hidden', 'true');
  box.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round">' + paths[id] + '</svg>';
  return box;
}
function el(tag, cls, ...children) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  node.append(...children);
  return node;
}
function statusTag(value) {
  return el('span', 'assetlib-status', el('i'), statusNames[value] || value);
}
function safeImageURL(value) {
  try {
    const url = new URL(value, document.baseURI);
    return ['http:', 'https:', 'blob:'].includes(url.protocol) ? url.href : '';
  } catch { return ''; }
}
function photo(shot, alt, cls) {
  const frame = el('span', cls || 'assetlib-photo', icon('image'));
  const url = shot?.url && safeImageURL(shot.url);
  if (url) {
    const image = el('img');
    image.alt = alt;
    image.onerror = () => { image.remove(); frame.title = '截图载入失败'; };
    image.src = url;
    frame.append(image);
  }
  return frame;
}
function action(label, cls, fn) {
  const button = el('button', cls, label);
  button.type = 'button';
  button.onclick = fn;
  return button;
}
function renderFilterOptions(group, name, allLabel, values, format) {
  group.replaceChildren(...['', ...values].map(value => {
    const input = el('input');
    input.type = 'radio';
    input.name = name;
    input.value = value;
    input.checked = value === '';
    return el('label', 'assetlib-filter-option', input, el('span', '', value ? format(value) : allLabel));
  }));
}

const assetNames = { 'worker-sanger': '小工匠（Sanger）', 'chef-sanger': '自由厨师（Sanger）' };
const checkNames = { pass: '通过', fail: '失败', unvalidated: '未验证', review_required: '待人工验收' };
const valueOr = (value, empty = '未提供') => value === undefined || value === null || value === '' ? empty : String(value);
const arrayText = values => Array.isArray(values) && values.length ? values.join('、') : '未提供';
const safeLink = (label, value) => {
  const url = safeImageURL(value);
  if (!url) return el('span', 'assetlib-missing', '未提供');
  const node = el('a', 'assetlib-original', icon('open'), label);
  node.href = url;
  node.target = '_blank';
  node.rel = 'noopener noreferrer';
  return node;
};
function metadataList(items, cls = 'assetlib-meta-list') {
  const list = el('dl', cls);
  for (const [label, value] of items) list.append(el('div', '', el('dt', '', label), el('dd', '', value)));
  return list;
}

// index is the resolved IndexV1 returned by loadAssetIndex().
export function mountAssetDashboard(root, { index, previewAdapter }) {
  const assets = index.assets.map(record => ({
    ...record,
    name: record.displayName || assetNames[record.assetId] || record.assetId,
    shots: index.fixedViews.filter(view => record.screenshots[view])
      .map(view => ({ view, url: record.screenshots[view] })),
    benchmarkFraming: record.styleId === 'sanger-rounded-toy' && record.assetId in assetNames,
    typeLabel: assetTypeNames[record.assetType] || record.assetType,
  }));
  let selected = null;
  let displayed;
  let mode = 'image';
  let shotIndex = 0;
  let stopPreview = () => {};
  let showingAnimations;
  let sectionAssets;
  const shell = el('div', 'assetlib-dashboard');
  const search = el('input');
  search.type = 'search';
  search.placeholder = '搜索资产名称或 ID';
  search.setAttribute('aria-label', search.placeholder);
  search.setAttribute('enterkeyhint', 'search');
  search.spellcheck = false;
  const searchClear = el('button', 'assetlib-search-clear', icon('close'));
  searchClear.type = 'button';
  searchClear.setAttribute('aria-label', '清除搜索');
  searchClear.hidden = true;
  searchClear.onclick = () => {
    search.value = '';
    updateList();
    search.focus();
  };
  search.oninput = updateList;
  const typeValues = [...new Set([...assets.map(asset => asset.assetType), ...Object.keys(assetTypeNames)].filter(Boolean))];
  const categoryOptions = el('div', 'assetlib-filter-options');
  const styleOptions = el('div', 'assetlib-filter-options');
  const filterForm = el('form', 'assetlib-tools',
    el('fieldset', 'assetlib-filter-group', el('legend', '', '分类'), categoryOptions),
    el('fieldset', 'assetlib-filter-group', el('legend', '', '风格类型'), styleOptions));
  filterForm.onchange = updateList;
  const list = el('div', 'assetlib-list');
  const backdrop = el('div', 'assetlib-drawer-backdrop');
  const detail = el('aside', 'assetlib-panel assetlib-detail');
  detail.setAttribute('aria-label', '资产详情');
  const close = action('', 'assetlib-drawer-close', () => closeDrawer());
  close.setAttribute('aria-label', '关闭资产详情');
  close.append(icon('close'));
  detail.append(close);
  const pageTitle = el('h1', '');
  const library = el('section', 'assetlib-library',
    el('div', 'assetlib-panel-title', pageTitle, el('div', 'assetlib-search', icon('search'), search, searchClear)),
    filterForm, list);
  const modelsTab = action('3D 资产', '', () => switchSection(false));
  const animationsTab = action('骨骼动画', '', () => switchSection(true));
  const nav = el('nav', 'assetlib-nav', modelsTab, animationsTab);
  nav.setAttribute('aria-label', '资产导航');
  const brandName = '游戏资产';
  shell.append(
    el('header', 'assetlib-header', el('div', 'assetlib-brand', el('span', 'assetlib-brand-mark', icon('cube')), brandName), nav),
    el('main', 'assetlib-content', library), backdrop, detail);
  document.title = brandName;
  root.setAttribute('aria-label', brandName);
  root.replaceChildren(shell);
  backdrop.onclick = closeDrawer;
  document.addEventListener('keydown', onKeydown);
  switchSection(false);

  function switchSection(animations) {
    if (showingAnimations === animations) return;
    closeDrawer();
    showingAnimations = animations;
    sectionAssets = assets.filter(asset => (asset.assetType === 'animation-rig') === animations);
    pageTitle.textContent = animations ? animationsTab.textContent : modelsTab.textContent;
    modelsTab.setAttribute('aria-pressed', String(!animations));
    animationsTab.setAttribute('aria-pressed', String(animations));
    const sectionTypes = typeValues.filter(value => (value === 'animation-rig') === animations);
    const sectionStyles = [...new Set(sectionAssets.map(asset => asset.styleId))].sort();
    renderFilterOptions(categoryOptions, 'assetType', '全部分类', sectionTypes.sort(), value => assetTypeNames[value] || value);
    renderFilterOptions(styleOptions, 'styleId', '全部风格类型', sectionStyles, styleName);
    search.value = '';
    updateList();
  }

  function onKeydown(event) {
    if (event.key === 'Escape' && shell.classList.contains('assetlib-drawer-open')) closeDrawer();
  }
  function choose(asset) {
    selected = asset;
    shotIndex = 0;
    mode = 'image';
  }
  function openDrawer(asset) {
    choose(asset);
    shell.classList.add('assetlib-drawer-open');
    renderDetail();
    close.focus();
  }
  function closeDrawer() {
    if (!shell.classList.contains('assetlib-drawer-open')) return;
    shell.classList.remove('assetlib-drawer-open');
    stopPreview();
    stopPreview = () => {};
    detail.replaceChildren(close);
  }
  function updateSearchState() {
    searchClear.hidden = !search.value;
  }
  function updateList() {
    updateSearchState();
    const query = search.value.trim().toLowerCase();
    const activeFilters = [...new FormData(filterForm)];
    const visible = sectionAssets.filter(a => [a.name, a.assetId].some(v => v?.toLowerCase().includes(query)) &&
      activeFilters.every(([field, value]) => !value || a[field] === value));
    if (selected && !visible.includes(selected)) closeDrawer();
    list.replaceChildren(...visible.map(a => {
      const card = action('', 'assetlib-card', () => openDrawer(a));
      card.setAttribute('aria-label', '查看 ' + (a.name || a.assetId) + ' 详情');
      card.append(photo(a.shots[0], a.name || a.assetId, 'assetlib-card-photo' + (a.benchmarkFraming ? ' assetlib-crop' : '')),
        el('span', 'assetlib-card-body', el('strong', '', a.name || a.assetId), el('code', '', a.assetId),
          el('span', 'assetlib-card-meta', a.typeLabel, el('span', '', '·'), styleName(a.styleId)),
          statusTagFor(a)));
      return card;
    }));
    if (!visible.length) list.append(el('p', 'assetlib-empty', '没有匹配的资产'));
  }
  function statusTagFor(asset) {
    const tag = statusTag(asset.status);
    tag.dataset.status = asset.status;
    return tag;
  }

  function renderDetail() {
    stopPreview();
    stopPreview = () => {};
    detail.replaceChildren(close);
    const a = selected;
    displayed = selected;
    if (!a) return;
    const heading = el('div', 'assetlib-detail-head',
      el('div', '', el('div', 'assetlib-section-label', '资产详情'), el('h2', '', a.name || a.assetId), el('code', '', a.assetId)),
      el('div', 'assetlib-badges', statusTagFor(a)));
    const specs = el('dl', 'assetlib-specs');
    for (const [label, value] of [['风格', styleName(a.styleId)], ['类型', a.typeLabel], ['资产版本', 'v' + a.version], ['校验', checkNames[a.validation?.status] || a.validation?.status || '未验证']]) {
      specs.append(el('div', '', el('dt', '', label), el('dd', '', value)));
    }
    const switcher = el('div', 'assetlib-switch');
    switcher.setAttribute('role', 'group');
    switcher.setAttribute('aria-label', '预览模式');
    for (const [id, title] of [['image', '截图'], ['cube', '3D 预览']]) {
      const button = action('', '', () => { mode = id; renderDetail(); });
      button.append(icon(id), title);
      button.setAttribute('aria-pressed', String(mode === id));
      switcher.append(button);
    }
    const stage = el('div', 'assetlib-stage');
    detail.append(close, heading, specs, el('div', 'assetlib-view-head', el('h3', '', '资产预览'), switcher), stage);
    if (mode === 'cube') {
      if (a.animation) {
        stage.append(el('div', 'assetlib-placeholder', icon('cube'), '动作骨骼暂不提供播放器预览', el('small', '', a.animation.fileUrl ? '已登记文件，可从元数据链接打开。' : '尚未登记可用的文件。')));
        renderAnimationSections(a);
        return;
      }
      attachPreview(stage, a);
      return;
    }
    const shots = a.shots;
    const shot = shots[shotIndex];
    if (!shot) {
      stage.append(el('div', 'assetlib-placeholder', icon('image'), '暂无截图'));
      if (a.animation) renderAnimationSections(a);
      return;
    }
    const label = viewNames[shot.view] || shot.view;
    const original = el('a', 'assetlib-original', icon('open'), '查看原图');
    const url = safeImageURL(shot.url);
    original.target = '_blank';
    original.rel = 'noopener';
    if (url) original.href = url;
    stage.append(photo(shot, (a.name || a.assetId) + ' · ' + label, 'assetlib-stage-image' + (a.benchmarkFraming ? ' assetlib-crop' : '')),
      el('span', 'assetlib-view-caption', label), original);
    const strip = el('div', 'assetlib-filmstrip');
    for (const [index, item] of shots.entries()) {
      const thumb = action('', 'assetlib-thumb', () => { shotIndex = index; renderDetail(); });
      thumb.append(photo(item, '', 'assetlib-thumb-photo' + (a.benchmarkFraming ? ' assetlib-crop' : '')), viewNames[item.view] || item.view);
      thumb.setAttribute('aria-pressed', String(index === shotIndex));
      strip.append(thumb);
    }
    detail.append(el('div', 'assetlib-strip-label', el('h3', '', '截图视图'), el('code', '', String(shots.length))), strip);
    if (a.animation) renderAnimationSections(a);
  }

  function renderAnimationSections(asset) {
    const animation = asset.animation;
    detail.append(el('section', 'assetlib-detail-section', el('div', 'assetlib-section-label', '动画元数据'), metadataList([
      ['提供方', valueOr(animation.provider)],
      ['来源名称', valueOr(animation.sourceName)],
      ['来源链接', safeLink('打开来源', animation.sourceUrl)],
      ['许可', valueOr(animation.license, '未标注')],
      ['许可链接', safeLink('查看许可', animation.licenseUrl)],
      ['兼容性', arrayText(animation.compatibility)],
      ['分类', animationCategoryNames[animation.category] || animation.category || '未提供'],
      ['标签', arrayText(animation.tags)],
      ['文件格式', valueOr(animation.format)],
      ['资产文件', safeLink('打开文件', animation.fileUrl)],
      ['动作片段', arrayText(animation.clips)],
    ])));
    renderEvidence(asset);
  }

  function renderEvidence(asset) {
    const validation = asset.validation || {};
    detail.append(el('section', 'assetlib-detail-section', el('div', 'assetlib-section-label', '证据与预览可用性'), metadataList([
      ['截图证据', asset.shots.length ? `${asset.shots.length} 张可用截图` : '暂无截图'],
      ['校验状态', checkNames[validation.status] || valueOr(validation.status, '未验证')],
      ['校验错误', arrayText(validation.errors)],
      ['校验警告', arrayText(validation.warnings)],
      ['预览可用性', asset.animation ? (asset.animation.fileUrl ? '已登记文件，播放器未接入' : '缺少文件链接') : (previewAdapter?.mount ? '支持现有 3D 预览' : '未接入 3D 预览')],
    ])));
  }

  function attachPreview(stage, asset) {
    if (!previewAdapter?.mount) {
      stage.append(el('div', 'assetlib-placeholder', icon('cube'), '尚未接入 3D 预览'));
      return;
    }
    const host = el('div', 'assetlib-adapter-host');
    stage.append(host);
    const controller = new AbortController();
    let cleanup;
    stopPreview = () => { controller.abort(); cleanup?.(); };
    Promise.resolve().then(() => {
      if (!controller.signal.aborted) return previewAdapter.mount(host, asset, { signal: controller.signal });
    }).then(release => {
      if (typeof release !== 'function') return;
      if (controller.signal.aborted) release();
      else cleanup = release;
    }).catch(() => {
      if (!controller.signal.aborted) host.replaceChildren(el('div', 'assetlib-placeholder', icon('cube'), '3D 预览加载失败'));
    });
  }

  return { destroy() { document.removeEventListener('keydown', onKeydown); stopPreview(); stopPreview = () => {}; shell.remove(); } };
}
