import { loadAssetIndex } from '../data/asset-source.mjs';
import { mountAssetDashboard } from './dashboard.js';
import { previewAdapter } from './preview/index.js';

const root = document.querySelector('#app');

async function start() {
  root.textContent = '正在读取资产目录…';
  try {
    const index = await loadAssetIndex(root.dataset.indexUrl || undefined);
    mountAssetDashboard(root, { index, previewAdapter });
  } catch (error) {
    root.textContent = '无法载入资产目录。' + error.message + ' ';
    const retry = document.createElement('button');
    retry.textContent = '重新加载';
    retry.onclick = start;
    root.append(retry);
  }
}
start();
