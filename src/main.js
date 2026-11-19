import { describeBootError, retryUrl } from './boot.js';

const root = document.querySelector('#app');
let renderingError = false;

function currentResourceUrl() {
  return document.currentScript?.src || new URL('./main.js', document.baseURI).href;
}

function showBootError(error, context = {}) {
  if (renderingError && context.stage !== 'runtime') return;
  renderingError = true;
  const details = describeBootError(error, { ...context, url: context.url || currentResourceUrl() });
  root.replaceChildren();
  const panel = document.createElement('section');
  panel.className = 'assetlib-boot-error';
  panel.setAttribute('role', 'alert');
  const title = document.createElement('h1');
  title.textContent = '页面加载失败';
  const message = document.createElement('p');
  message.textContent = details.message;
  const meta = document.createElement('p');
  meta.className = 'assetlib-boot-error-meta';
  meta.textContent = `阶段：${details.stage} · 资源：${details.url}`;
  const retry = document.createElement('button');
  retry.type = 'button';
  retry.textContent = '重新加载';
  retry.onclick = () => { window.location.replace(retryUrl(window.location.href)); };
  panel.append(title, message, meta, retry);
  root.append(panel);
}

window.addEventListener('error', event => {
  if (event.error || event.message) showBootError(event.error || event.message, { stage: 'runtime', url: event.filename || currentResourceUrl() });
});
window.addEventListener('unhandledrejection', event => showBootError(event.reason, { stage: 'runtime' }));

async function start() {
  renderingError = false;
  root.textContent = '正在读取资产…';
  try {
    const [{ loadAssetIndex }, { mountAssetDashboard }, { previewAdapter }] = await Promise.all([
      import('../data/asset-source.mjs'),
      import('./dashboard.js'),
      import('./preview/index.js'),
    ]);
    const index = await loadAssetIndex(root.dataset.indexUrl || undefined);
    mountAssetDashboard(root, { index, previewAdapter });
  } catch (error) {
    showBootError(error, { stage: 'bootstrap' });
  }
}

start().catch(error => showBootError(error, { stage: 'bootstrap' }));
