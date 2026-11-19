# 资产索引与静态发布

从项目根目录执行，使用 Node.js 22，无需安装依赖。

```sh
node dashboard/scripts/build-asset-index.mjs
node dashboard/scripts/build-asset-index.mjs --check
node --test dashboard/scripts/asset-source.test.mjs
```

第一条命令扫描 `asset-factory/baselines` 和 `asset-factory/candidates` 中的 manifest，读取每个版本相邻的 validation，以及工厂根目录的 active-baseline。生成器先写入按内容哈希命名的媒体，再原子替换 JSON。相同输入得到相同输出。`--check` 逐字节核对 JSON 和每个被引用的媒体，并检查活动指针。它对登记为 fail 的资产仍可成功，因为数据层需要如实显示失败记录。

## GitHub Pages 发布目录

将 `dashboard/public/assets/` 原样复制到 UI 静态站点根目录的 `assets/`。如果 UI 构建已将 `dashboard/public/` 的内容复制到站点根目录，可直接使用该构建产物。发布产物的数据部分如下。

```text
assets/
  asset-index.json
  catalog-media/
    <sha256>.jpg
    <sha256>.png
```

在新建的发布产物中仅需保留本次索引引用的媒体。生成器保留已存在的哈希文件，使尚在使用旧索引的页面仍可加载原图。CI 可在打包 UI 前运行上述 `--check` 和测试，直接发布已经核对的静态文件。整个过程仅需要本地工作树。GitHub Pages 的仓库名可以变化，原始 JSON 中的媒体 URL 均以索引文件所在目录为基准。

## UI 接入

从 `dashboard/src/` 下一级模块调用，页面入口假定在站点根目录。直接以 dashboard 源目录作为普通静态站点时，显式传入 `new URL('public/assets/asset-index.json', document.baseURI)`。

```js
import { loadAssetIndex, listAssets, getAssetDetail } from '../data/asset-source.mjs';

const index = await loadAssetIndex();
const activeCharacters = listAssets(index, { assetType: 'character', isActive: true });
const detail = activeCharacters.length ? getAssetDetail(index, activeCharacters[0].key) : null;
```

| 字段 | 用法 |
| --- | --- |
| schemaVersion | 当前为 1。读取器会报告未知版本。 |
| filters | styleIds、assetTypes、statuses 是索引中实际出现的值。listAssets 支持组合筛选和精确版本匹配。 |
| assets[].key | 工厂内相对目录，唯一标识一条修订。候选与已晋升副本可同时具有相同版本号。 |
| assets[].status / validation.status | 前者来自 manifest 的工作流状态，后者来自最近一次 validation。缺少验证文件时为 unvalidated。验证详情包括 checks、scores、errors、warnings 及生成时间。 |
| fixedViews / screenshots | 视角顺序为 front、three-quarter、side、back、clay。生成器按工厂约定读取 screenshots 下同名 JPG，有图才生成 URL。declaredViews 记录 manifest 声明，缺失图片保留 null。 |
| activeBaseline / isActive | 前者保留各风格的版本及活动指针，后者按指针路径精确匹配。悬空指针、身份不符或指向未接受版本会使构建失败。 |
| sourceFiles / references | 源文件列出 manifest 中的文件名。参考图记录原文件名及预览 URL，暂缺或不支持预览时为 null。 |

`getAssetDetail` 返回所选修订、相同风格/类型/资产 ID 的所有修订及其中的活动版本。未登记的 key 返回 null。列表顺序是稳定的路径顺序，版本号原样保留。

## 将来接入 GitHub API

数据源边界为异步的 `loadAssetIndex() → Promise<IndexV1>`。当前实现只获取指定的静态 JSON 并将媒体路径解析为可直接用作 img.src 的 URL。未来可在应用初始化时注入另一个同签名函数，由它读取 GitHub 数据并转换为上表结构，给出可访问的媒体 URL。筛选和详情函数只消费 IndexV1，可直接复用。
