# Sanger 3D Asset Dashboard

这是资产工厂的静态查看与管理入口，适合发布到 GitHub Pages。页面从 `public/assets/asset-index.json` 读取版本、风格、校验状态和截图，并对已注册的 `(Sanger)` 模型提供 Three.js 预览。

## 本地运行

```sh
cd dashboard
npm install
npm run dev
```

打开 Vite 输出的本地地址即可查看资产列表。切换到“3D 预览”后可以拖动旋转、滚轮缩放、切换正面/四分之三/侧面/背面和灰模。

## 构建

```sh
npm run check:data
npm run build
npm run preview
```

`dist/` 是可直接发布的静态目录。Vite 使用相对资源路径，因此既可以放在自定义域名根目录，也可以放在 GitHub Pages 的项目子路径下。

## GitHub Pages 发布约定

- 发布 `dist/` 的内容。
- 资产索引位于 `assets/asset-index.json`。
- 截图和参考图位于 `assets/catalog-media/`。
- 自定义域名接入时，把域名提供给发布配置，再在 GitHub Pages 设置中添加同一个域名。

页面本身不会修改 baseline；候选、验收、晋升和回退仍由 `asset-factory/tools/` 中的命令负责。
