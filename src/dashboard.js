// previewAdapter.mount(host, asset, { signal }) may return a cleanup function or a Promise of one.
const statusNames = { draft: '草稿', candidate: '候选', review: '待审核', accepted: '已验收', rejected: '已退回', deprecated: '已弃用' };
const typeNames = { character: '角色', vehicle: '载具', building: '建筑', prop: '道具' };
const viewNames = { front: '正面', 'three-quarter': '四分之三侧面', side: '侧面', back: '背面', clay: '白模' };
const styleName = value => value === 'sanger-rounded-toy' ? 'Sanger Rounded Toy' : value;
const paths = {
  cube: '<path d="m12 2 9 5v10l-9 5-9-5V7zM3 7l9 5 9-5M12 12v10M7.5 4.5l9 5"/>',
  layers: '<path d="m12 3 9 5-9 5-9-5zM3 12l9 5 9-5M3 16l9 5 9-5"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9" r="1.5"/><path d="m4 18 5-5 3 3 4-6 5 7"/>',
  search: '<circle cx="10" cy="10" r="6"/><path d="m15 15 5 5"/>',
  arrow: '<path d="m9 6 6 6-6 6"/>',
  open: '<path d="M14 4h6v6m0-6-9 9M10 5H5v14h14v-5"/>'
};
function icon(id) {
  const box = document.createElement('span');
  box.className = 'ad-icon';
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
  return el('span', 'ad-status', el('i'), statusNames[value] || value);
}
function safeImageURL(value) {
  try {
    const url = new URL(value, document.baseURI);
    return ['http:', 'https:', 'blob:'].includes(url.protocol) ? url.href : '';
  } catch { return ''; }
}
function photo(shot, alt, cls) {
  const frame = el('span', cls || 'ad-photo', icon('image'));
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
function uniqueOptions(assets, field, format) {
  return [...new Set(assets.map(asset => asset[field]))].sort().map(value => new Option(format(value), value));
}

const assetNames = { 'worker-sanger': '小工匠（Sanger）', 'chef-sanger': '自由厨师（Sanger）' };
const checkNames = { pass: '通过', fail: '失败', unvalidated: '未验证' };

// index is the resolved IndexV1 returned by loadAssetIndex().
export function mountAssetDashboard(root, { index, previewAdapter }) {
  const styles = index.activeBaseline.styles;
  const assets = index.assets.map(record => ({
    ...record,
    name: record.displayName || assetNames[record.assetId] || record.assetId,
    shots: index.fixedViews.filter(view => record.screenshots[view])
      .map(view => ({ view, url: record.screenshots[view] })),
    benchmarkFraming: record.styleId === 'sanger-rounded-toy' && record.assetId in assetNames
  }));
  let selected = assets.find(a => a.isActive) || assets[0];
  let displayed;
  let mode = 'image';
  let shotIndex = 0;
  let stopPreview = () => {};
  const shell = el('div', 'asset-dashboard');
  const list = el('div', 'ad-list');
  const detail = el('section', 'ad-panel ad-detail');
  detail.setAttribute('aria-label', '资产详情');
  const count = el('span', 'ad-count');
  count.setAttribute('aria-live', 'polite');
  const search = el('input');
  search.type = 'search';
  search.placeholder = '搜索名称或资产 ID';
  search.setAttribute('aria-label', search.placeholder);
  search.oninput = updateList;

  const filters = [['styleId', '风格', styleName], ['assetType', '类型', v => typeNames[v] || v], ['status', '状态', v => statusNames[v] || v]].map(([field, title, format]) => {
    const select = el('select');
    select.append(new Option('全部' + title, ''), ...uniqueOptions(assets, field, format));
    select.onchange = updateList;
    return { field, select, label: el('label', '', title, select) };
  });
  const reset = action('重置', 'ad-link', () => {
    search.value = '';
    for (const { select } of filters) select.value = '';
    updateList();
    search.focus();
  });
  const baseline = el('section', 'ad-baseline', el('div', 'ad-baseline-symbol', icon('layers')), el('h2', '', '当前基线'));
  const groups = Object.entries(styles);
  for (const [style, { version }] of groups) {
    baseline.append(el('span', 'ad-baseline-group', styleName(style), ...(version ? [el('code', '', 'v' + version)] : [])));
  }
  if (!groups.length) baseline.append(el('span', '', '尚未设置'));
  const library = el('section', 'ad-panel ad-library',
    el('div', 'ad-panel-title', el('h2', '', icon('grid'), '资产列表'), count),
    el('div', 'ad-tools', el('label', 'ad-search', icon('search'), search),
      el('div', 'ad-filters', ...filters.map(f => f.label)),
      el('div', 'ad-filter-foot', el('span', '', '筛选结果'), reset)), list);
  shell.append(el('header', 'ad-header', el('div', 'ad-brand', el('span', 'ad-brand-mark', icon('cube')), '三维资产管理'),
    el('span', 'ad-header-divider'), el('span', 'ad-header-path', '工作空间')),
    el('div', 'ad-content', el('div', 'ad-page-title', el('h1', '', '资产目录'),
      el('span', 'ad-total', String(assets.length), ' 个版本')), baseline,
      el('div', 'ad-layout', library, detail)));
  root.replaceChildren(shell);
  updateList();

  function choose(asset) {
    if (selected !== asset) {
      selected = asset;
      shotIndex = 0;
    }
  }
  function updateList() {
    const query = search.value.trim().toLowerCase();
    reset.disabled = !query && filters.every(f => !f.select.value);
    const visible = assets.filter(a => [a.name, a.assetId].some(v => v?.toLowerCase().includes(query)) &&
      filters.every(f => !f.select.value || a[f.field] === f.select.value));
    if (!visible.includes(selected)) choose(visible[0]);
    count.textContent = String(visible.length);
    list.replaceChildren(...visible.map(a => {
      const row = action('', 'ad-row', () => {
        choose(a);
        updateList();
        list.querySelector('[aria-pressed="true"]')?.focus({ preventScroll: true });
      });
      row.setAttribute('aria-pressed', String(a === selected));
      row.append(photo(a.shots[0], '', 'ad-avatar' + (a.benchmarkFraming ? ' ad-crop' : '')),
        el('span', 'ad-row-info', el('strong', '', a.name || a.assetId), el('code', '', a.assetId),
          el('span', 'ad-row-meta', typeNames[a.assetType] || a.assetType, el('span', '', '·'), 'v' + a.version, el('span', '', '·'), statusNames[a.status] || a.status)),
        icon('arrow'));
      return row;
    }));
    if (!visible.length) list.append(el('p', 'ad-empty', '没有匹配的资产'));
    if (displayed !== selected || !detail.hasChildNodes()) renderDetail();
  }

  function renderDetail() {
    stopPreview();
    stopPreview = () => {};
    detail.replaceChildren();
    const a = selected;
    displayed = selected;
    if (!a) {
      detail.append(el('div', 'ad-no-selection', icon('cube'), '暂无可查看的资产'));
      return;
    }
    const tag = statusTag(a.status);
    tag.dataset.status = a.status;
    const heading = el('div', 'ad-detail-head',
      el('div', '', el('div', 'ad-section-label', '资产详情'), el('h2', '', a.name || a.assetId), el('code', '', a.assetId)),
      el('div', 'ad-badges', tag, ...(a.isActive ? [el('span', 'ad-active', icon('layers'), '当前基线')] : [])));
    const specs = el('dl', 'ad-specs');
    for (const [label, value] of [['风格', styleName(a.styleId)], ['类型', typeNames[a.assetType] || a.assetType], ['资产版本', 'v' + a.version], ['校验', checkNames[a.validation?.status] || a.validation?.status || '未验证']]) {
      specs.append(el('div', '', el('dt', '', label), el('dd', '', value)));
    }
    const switcher = el('div', 'ad-switch');
    switcher.setAttribute('role', 'group');
    switcher.setAttribute('aria-label', '预览模式');
    for (const [id, title] of [['image', '截图'], ['cube', '3D 预览']]) {
      const button = action('', '', () => {
        mode = id;
        renderDetail();
        detail.querySelector('.ad-switch [aria-pressed="true"]').focus();
      });
      button.append(icon(id), title);
      button.setAttribute('aria-pressed', String(mode === id));
      switcher.append(button);
    }
    const stage = el('div', 'ad-stage');
    const headingTools = el('div', 'ad-view-head', el('h3', '', '资产预览'), switcher);
    detail.append(heading, specs, headingTools, stage);
    if (mode === 'cube') {
      attachPreview(stage, a);
      return;
    }
    const shots = a.shots;
    const shot = shots[shotIndex];
    if (!shot) {
      stage.append(el('div', 'ad-placeholder', icon('image'), '暂无截图'));
      return;
    }
    const label = viewNames[shot.view] || shot.view;
    const original = el('a', 'ad-original', icon('open'), '查看原图');
    const url = safeImageURL(shot.url);
    original.target = '_blank';
    original.rel = 'noopener';
    if (url) original.href = url;
    stage.append(photo(shot, (a.name || a.assetId) + ' · ' + label, 'ad-stage-image' + (a.benchmarkFraming ? ' ad-crop' : '')),
      el('span', 'ad-view-caption', label), original);
    const strip = el('div', 'ad-filmstrip');
    for (const [index, item] of shots.entries()) {
      const thumb = action('', 'ad-thumb', () => {
        shotIndex = index;
        renderDetail();
        detail.querySelector('.ad-thumb[aria-pressed="true"]').focus();
      });
      thumb.append(photo(item, '', 'ad-thumb-photo' + (a.benchmarkFraming ? ' ad-crop' : '')), viewNames[item.view] || item.view);
      thumb.setAttribute('aria-pressed', String(index === shotIndex));
      strip.append(thumb);
    }
    detail.append(el('div', 'ad-strip-label', el('h3', '', '截图视图'), el('code', '', String(shots.length))), strip);
  }

  function attachPreview(stage, asset) {
    if (!previewAdapter?.mount) {
      stage.append(el('div', 'ad-placeholder', icon('cube'), '尚未接入 3D 预览'));
      return;
    }
    const host = el('div', 'ad-adapter-host');
    stage.append(host);
    const controller = new AbortController();
    let cleanup;
    stopPreview = () => {
      controller.abort();
      cleanup?.();
    };
    Promise.resolve().then(() => {
      if (!controller.signal.aborted) return previewAdapter.mount(host, asset, { signal: controller.signal });
    }).then(release => {
      if (typeof release !== 'function') return;
      if (controller.signal.aborted) release();
      else cleanup = release;
    }).catch(() => {
      if (!controller.signal.aborted) host.replaceChildren(el('div', 'ad-placeholder', icon('cube'), '3D 预览加载失败'));
    });
  }

  return { destroy() { stopPreview(); stopPreview = () => {}; shell.remove(); } };
}
