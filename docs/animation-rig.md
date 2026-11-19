# 动画骨骼资产规则

## 入库与来源

- 使用资产类型 `animation-rig`。KayKit 这一批采用包级 `public/assets/animation-rigs/kaykit/manifest.json`，其中每个独立 GLB 对应一条资产条目和索引记录。同一文件内的所有 clip 放在该条目中，保留 GLB 的名称、拼写、大小写与顺序。重复的源文件、发布文件或记录标识需在入库校验时发现。
- 以实际文件及其原包成员为准。记录提供者、包名和版本、来源页、原包文件名、包内成员路径、原包与 GLB 的 SHA-256，以及取证方法。只有本地证据确立的文件才入库。当前 KayKit 批次只使用本地素材清单、ZIP 和已提取的 8 个 GLB，来源页仅作为溯源信息。
- 从原包逐字节保留 `License.txt`，包括原始换行。证据记录许可成员路径和 SHA-256，并在静态发布目录提供原文。KayKit Character Animations 1.1 的包内许可声明对应 SPDX `CC0-1.0`。多个记录可以共用经确认来自同一版本包的许可文件。

## Manifest 与索引约定

沿用工厂 manifest 的必填字段 `assetId`、`styleId`、`assetType`、`version`、`status`、`sourceFiles` 和 `views`。动画记录由包级清单生成，使用稳定的候选修订 `key`，`sourceFiles` 为 `manifest.json` 与对应 GLB 文件名。没有视图证据时使用空 `views`，索引的固定截图字段保留缺失值。两条既有角色记录及其验证证据逐字段保留。

索引版本 1 支持可选的 `animation` 对象。动画骨骼记录使用下列字段，其他类型可以省略整个对象。UI 和数据代码使用 `dashboard/data/asset-types.mjs` 导出的 `assetTypeNames`。标签为 `character` 角色、`vehicle` 载具、`building` 建筑、`prop` 道具及 `animation-rig` 动作骨骼。

| 字段 | 约定 |
| --- | --- |
| `provider`、`sourceName` | 提供者和可追溯的源包名称或版本，均为字符串。 |
| `sourceUrl` | 来源页 URL 字符串，用于溯源。 |
| `license`、`licenseUrl` | SPDX 字符串和可部署的本地许可原文 URL。 |
| `compatibility` | 已有证据支持的骨架标识字符串数组。保留源包中可核对的标识，例如 `Rig_Medium`。 |
| `category`、`tags` | 类别为稳定机器值，按下节共享映射显示。标签为字符串数组。 |
| `format`、`fileUrl` | 格式为小写机器值，例如 `glb`。文件 URL 指向实际发布的 GLB。 |
| `clips` | 从 GLB `animations[].name` 读取的动作名字符串数组。 |

## 动作分类与 UI

`dashboard/data/asset-types.mjs` 集中导出 `animationCategoryNames`，供入库校验和 UI 共用。manifest 和索引中的 `animation.category` 保存小写 kebab-case 机器值。首批 KayKit 文件采用下表映射。

| GLB 文件（`Rig_Medium_` 后缀） | `animation.category` | UI 文案 |
| --- | --- | --- |
| `CombatMelee.glb` | `combat-melee` | 近战 |
| `CombatRanged.glb` | `combat-ranged` | 远程战斗 |
| `General.glb` | `general` | 通用 |
| `MovementAdvanced.glb` | `movement-advanced` | 进阶移动 |
| `MovementBasic.glb` | `movement-basic` | 基础移动 |
| `Simulation.glb` | `simulation` | 模拟 |
| `Special.glb` | `special` | 特殊 |
| `Tools.glb` | `tools` | 工具 |

UI 的资产大类继续用 `assetTypeNames[assetType]` 显示，动作分类用 `animationCategoryNames[animation.category]` 显示。遇到旧索引中的未知分类时可显示原机器值。详情及后续动作分类筛选共用此映射，筛选和索引仍使用机器值。新增分类时同步更新共享导出、入库映射及测试。

## 文件验证与播放验收

- **文件验证**记录包成员与入库文件的字节比对、许可原文哈希、GLB 头和版本、JSON 与动画数据可解析性、skin 数量、关节名及父子关系、动画通道目标、真实 clip 名单和发布文件的存在性。通过检查才填写对应成功证据。骨架标识只表达源包声明或静态检查支持的兼容范围，跨模型重定向需要单独实测。
- **播放或人工验证**记录目标角色和版本、使用的 clip、运行环境、观察结果及证据位置。实际确认播放后才能登记播放通过，实际在目标模型上完成重定向并检查动作结果后才能登记重定向通过。未执行时在检查详情或 warnings 中明确写为未执行，保留未知的评分。
- 根级 `status` 来自 manifest 的工厂流程状态，`validation.status` 来自相邻的 `validation.json`。沿用 `checks`、`scores`、`errors`、`warnings` 和 `generatedAt` 证据字段。没有验证文件时由索引登记 `unvalidated`。已做文件检查、待必要人工验收时使用 `review_required`，并保留文件检查的各项实际结果。校验失败记录原因，待人工确认后才可按工厂流程晋升并更新活动基线。
- 工厂当前通用验证器检查角色固定截图和灰模。动画骨骼的文件校验通过动画数据检查取证，播放验收提供运行证据。不要为了套用角色校验而补造截图、评分或通过结果。

## 目录、URL 与 CI

- KayKit 入库目录包含一个包级 `manifest.json`、8 个原始 GLB 和原始 `License.txt`；不提交 ZIP，也不要求 `validation.json`。构建器从仓库内 manifest、License 和 GLB 逐文件校验哈希、GLB JSON、skin、clip 与集中分类，再生成索引。清单和必要文件应能从 dashboard 独立检出并离线重建动画索引，且同一输入产生字节一致的索引。本机绝对路径、构建时钟和目录遍历顺序不得影响产物。
- 构建时支持工厂 `baselines/`、`candidates/` 及活动指针的既有流程，同时让 dashboard 单独检出时能使用入库目录核对动画记录。工厂候选与独立输入若同时可见，按同一修订身份处理，避免重复登记。独立构建和 CI 使用随仓库保存的入库材料。
- 原 ZIP 留在本地源素材处，入库和发布目录均不提交第二份 ZIP。仓库内每份原始 GLB 保留一份，构建产物复用该文件。长期保存 GLB、许可原文、包级 manifest 及必要的溯源信息。来源路径和哈希由清单、索引和本地 evidence 测试承载，无需再提交重复的 evidence JSON。
- 手头已有原 ZIP 时，可选用本地 `unzip` CLI 离线复验，例如用 `unzip -Z1` 列成员、用 `unzip -p` 按确切路径读取成员原字节后对比 SHA-256。ZIP 复验仅用于按需追溯，常规构建、测试和 CI 无需原 ZIP 或 `unzip`。可选复验使用现成工具，无需维护自写 ZIP parser。
- 生成的索引中，`animation.fileUrl` 与 `animation.licenseUrl` 均为相对于 `asset-index.json` 的部署路径。例如 `catalog-media/<hash>.glb` 从 `/repo/assets/asset-index.json` 解析到 `/repo/assets/catalog-media/<hash>.glb`。读取器用最终响应的 `response.url` 作为基准，兼容重定向及 GitHub Pages 仓库子路径。构建和校验应拒绝外部 URL、绝对路径、越界路径与缺失目标。`sourceUrl` 保留其溯源语义。
- 通过现有 `npm run check:data` 入口运行索引检查和测试。覆盖两种检出方式、重建一致性、唯一记录、部署文件与许可哈希、clip 清单、缺失或无效输入、站点子路径与索引重定向，以及旧索引缺少 `animation` 时的兼容性。对既有两条角色记录做逐字段回归比对。CI 成功说明索引与文件通过该次自动检查。

## 待确认事项

- 确定首批播放验收所用的目标角色及版本、需要覆盖的 clip 和验收人。发生跨模型复用时，单独登记目标模型、映射方式与实测结果。
- 后续增加类别或骨架标识时，确认受控机器值、证据来源以及是否需要兼容既有记录。动画条目如需晋升活动基线，由人工验收后另行决定。

## KayKit Character Animations 1.1 本地取证

来源说明见工作区的 `sunny-kitchen/assets/ASSET_SOURCES.md`。包名为 KayKit Character Animations 1.1，作者为 Kay Lousberg。来源页为 [KayKit Character Animations](https://kaylousberg.itch.io/kaykit-character-animations)。

- ZIP 为 `sunny-kitchen/assets/source/KayKit-Character-Animations-1-1.zip`，SHA-256 为 `65882f31f905ad2e953819648a59287cdeab8f623908d5ef701971d3758be20f`。
- 原版许可成员为 `KayKit_Character_Animations_1.1/License.txt`，SHA-256 为 `373b159044d1a886ed15f57ca5a7673ba14e2623c460283452705f2056912ed9`。
- 本地 GLB 目录为 `sunny-kitchen/assets/source/kaykit/animations/`。以下每个文件均与 ZIP 中 `KayKit_Character_Animations_1.1/Animations/gltf/Rig_Medium/` 下同名成员逐字节一致。

| GLB 文件 | Clip 数 | SHA-256 |
| --- | ---: | --- |
| `Rig_Medium_CombatMelee.glb` | 22 | `c55e6ec1c79e83ae21d46fe1cd921c1b64be8b9a524a24517e51c6ba99231459` |
| `Rig_Medium_CombatRanged.glb` | 20 | `7fef1fc0e7b0feafd34b8e12d23f514c8c1f9d068047a691b854b56f1774dff5` |
| `Rig_Medium_General.glb` | 15 | `5f725c0f745f36078c7238968cd5c04843cbc6260689eb6e7f5e2bbd7ffdd7ad` |
| `Rig_Medium_MovementAdvanced.glb` | 13 | `8b2317cf81e3f24149e4b791c27e1932bebd46cd378ed962e7d27d642fad8c56` |
| `Rig_Medium_MovementBasic.glb` | 11 | `11422afd50abf7e8c92ea107e2e0bc94abd38023d6d15f55ad580347efbfa29e` |
| `Rig_Medium_Simulation.glb` | 14 | `ab6ffeed40c8281dd0ce0506534eadf7385151f1c266643a10fa2a0f0a7ba3b1` |
| `Rig_Medium_Special.glb` | 15 | `74047dd2178fbed388656051664158e921b7bfc613abb119860aeb7b646bd640` |
| `Rig_Medium_Tools.glb` | 29 | `e3b62dc122c5073373376a846e354137add2088ddcce8731c389fc5c20734aad` |
| **合计** | **139** | |

本次静态取证读取 GLB v2 的 JSON 块。每份文件有一个 skin、23 个关节，按关节名归一化后的骨架父子关系一致，动画通道均指向该文件的蒙皮关节。每份文件中的 clip 名称非空且在文件内唯一。取证未执行播放、人工观感验收或跨模型重定向。
