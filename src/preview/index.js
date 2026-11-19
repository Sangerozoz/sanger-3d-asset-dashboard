// Each loader returns a factory so a superseded request never constructs a model.
const models = new Map([
  ['worker-sanger', () => import('../../../character-benchmark/src/models/worker.js').then(m => m.createWorker)],
  ['chef-sanger', () => import('../../../character-benchmark/src/models/chef.js').then(m => m.createChef)],
]);

export const PREVIEW_VIEWS = Object.freeze(['front', 'three-quarter', 'side', 'back']);

function builtinLoader(asset) {
  if (typeof asset === 'string') return models.get(asset);
  if (asset?.styleId && asset.styleId !== 'sanger-rounded-toy') return;
  if (asset?.assetType && asset.assetType !== 'character') return;
  if (asset?.version && asset.version !== '1.0.0') return;
  if (asset?.key && asset.key !== 'baselines/sanger-rounded-toy/character/' + asset.assetId) return;
  return models.get(asset?.assetId);
}

/**
 * container must have a CSS width and height. Only the child created here is owned.
 * loadFactory(asset) may return a factory, a promise of one, or null (use built-ins).
 * A factory creates a fresh +Y-up, +Z-front Object3D and transfers its resources.
 */
export function createAssetPreview(container, { loadFactory } = {}) {
  const element = document.createElement('div');
  Object.assign(element.style, { width: '100%', height: '100%', display: 'grid', placeItems: 'center', overflow: 'hidden' });
  const message = document.createElement('span');
  message.setAttribute('role', 'status');
  element.append(message);
  container.append(element);

  let stage;
  let generation = 0;
  let disposed = false;
  let view = 'three-quarter';
  let clay = false;

  function showMessage(status, description) {
    element.dataset.status = status;
    message.hidden = status === 'ready';
    message.textContent = description;
    if (stage) stage.canvas.hidden = status !== 'ready';
    return status;
  }
  showMessage('empty', '请选择要预览的资产。');

  async function setAsset(asset) {
    if (disposed) return 'disposed';
    const request = ++generation;
    stage?.clear();
    if (!asset) return showMessage('empty', '请选择要预览的资产。');
    const label = typeof asset === 'string' ? asset : asset.displayName || asset.name || asset.assetId || '该资产';
    showMessage('loading', '正在加载模型…');
    try {
      const customFactory = loadFactory && await loadFactory(asset);
      if (request !== generation) return 'superseded';
      const loader = builtinLoader(asset);
      if (!customFactory && !loader) return showMessage('unavailable', label + ' 暂无可执行的 3D 模型。');
      const [factory, { createStage }] = await Promise.all([
        customFactory ?? loader(), import('./stage.js'),
      ]);
      if (request !== generation) return 'superseded';
      stage ??= createStage(element);
      stage.mount(factory(), view, clay);
      return showMessage('ready', '');
    } catch (error) {
      if (request !== generation) return 'superseded';
      stage?.clear();
      return showMessage('error', label + ' 预览失败：' + (error?.message || String(error)));
    }
  }

  return {
    setAsset,
    setView(value) {
      if (value === 'threeQuarter') value = 'three-quarter';
      if (!PREVIEW_VIEWS.includes(value)) throw new RangeError('未知预览视角：' + value);
      view = value;
      stage?.setView(view);
    },
    setClay(enabled) {
      clay = Boolean(enabled);
      stage?.setClay(clay);
    },
    get status() { return element.dataset.status; },
    dispose() {
      if (disposed) return;
      disposed = true;
      ++generation;
      stage?.dispose();
      stage = undefined;
      showMessage('disposed', '');
      element.remove();
    },
  };
}

// Drop-in adapter for mountAssetDashboard. All controls belong to this host.
export const previewAdapter = {
  mount(host, asset, { signal } = {}) {
    if (signal?.aborted) return () => {};
    const frame = document.createElement('div');
    Object.assign(frame.style, { width: '100%', height: '100%', display: 'grid', gridTemplateRows: 'minmax(0, 1fr) auto' });
    const viewport = document.createElement('div');
    const toolbar = document.createElement('div');
    toolbar.setAttribute('role', 'group');
    toolbar.setAttribute('aria-label', '模型视角与材质');
    Object.assign(toolbar.style, { textAlign: 'center', padding: '4px' });
    frame.append(viewport, toolbar);
    host.append(frame);
    const preview = createAssetPreview(viewport);
    const labels = ['正面', '三分之四', '侧面', '背面'];
    function button(text, onClick) {
      const node = document.createElement('button');
      node.type = 'button';
      node.textContent = text;
      node.onclick = onClick;
      toolbar.append(node);
      return node;
    }
    PREVIEW_VIEWS.forEach((view, i) => button(labels[i], () => preview.setView(view)));
    let clay = false;
    const toggle = button('灰模', () => {
      clay = !clay;
      preview.setClay(clay);
      toggle.setAttribute('aria-pressed', String(clay));
    });
    toggle.setAttribute('aria-pressed', 'false');
    toolbar.hidden = true;
    preview.setAsset(asset).then(status => { toolbar.hidden = status !== 'ready'; });
    function release() {
      signal?.removeEventListener('abort', release);
      preview.dispose();
      frame.remove();
    }
    signal?.addEventListener('abort', release, { once: true });
    return release;
  },
};
