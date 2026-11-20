# 模块化角色资产

资产类型使用 `modular-character`，用于把一个可复用的 3D 角色基座、计划接入或已验证的骨架、骨骼动画和可替换组件登记在同一条资产记录中。

## 记录结构

索引记录使用 `modularCharacter` 对象保存组合关系。

| 字段 | 用途 |
| --- | --- |
| `baseAssetId` / `baseAssetKey` | 角色基座资产及其索引键 |
| `animationRigAssetId` / `animationRigKey` | 拟用骨骼动画资产及其索引键 |
| `plannedSkeleton` | 拟接入的骨架标识 |
| `skeletonCompatibility` | 由静态检查或实际接入确认的骨架标识 |
| `slots` | 可挂接组件的稳定槽位 |
| `components` | 组件 ID、显示名称、槽位和当前状态 |
| `integrationStatus` | 当前接入阶段，不代表播放或视觉验收已通过 |

组件状态使用 `planned`、`candidate`、`integrated`、`accepted` 和 `rejected`。只有组件文件、挂点、骨骼兼容性和实际动画播放都完成验证后，模块化角色资产才可以进入 `accepted`。

## 首条记录

`chef-modular-kit-sanger` 以 `chef-sanger` 为角色基座，计划接入 `rig_medium_general` 动作资源，预留厨师帽、围裙、餐盘和菜刀四个组件。当前记录为 `candidate`，厨师基座与 Rig_Medium 的兼容性、组件模型、挂点和播放仍待验证。

模块化角色适合复用同一套移动、取放、切菜和装配动画，再通过替换服装、工具和餐具表达不同角色或主题。记录新增组件时保持 Asset ID、槽位、骨骼和版本关系稳定。

两种目录构建方式均读取 `data/chef-modular-kit.json`。`sourceFiles` 路径相对于看板仓库根目录。存在 `data/chef-production-notes.json` 时，构建器将其中的 `productionNotes` 和 `references` 原样写入记录。运行 `npm run catalog:build` 更新索引，运行 `npm run catalog:check` 检查索引是否过期。
