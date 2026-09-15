# Discover 页 UI 重构设计方案

**日期**：2026-08-06
**范围**：`apps/desktop/src/renderer/features/discover/`
**目的**：为实现 worker 提供文件级、组件级、class 级、i18n key 级的落地规格。
**状态**：设计方案，未修改任何产品代码。

---

## 0. 先读这一节：三条与任务书不符的代码事实

在动手前必须知道，否则会写出编译通过但行为错误的代码。

### 0.1 `sourceType` 的值是 `"well-known"`（连字符），i18n key 是 `well_known`（下划线）

`apps/desktop/src/core/catalog/catalog-types.ts:18`：

```ts
sourceType: "github" | "well-known";
```

`resources.ts:59` / `:586`：

```ts
sourceType: { github: "GitHub", well_known: "Well-known" }
```

**两者拼写不一致**。所以**不能**写 `t(\`discover.sourceType.${skill.sourceType}\`)` —— 会生成不存在的 key `discover.sourceType.well-known`，i18next 静默回退成把 key 原样渲染出来。

必须保留现有三元式（`discover-page-main.tsx:289-291` 的写法），或抽一个显式映射：

```ts
// skill-card.tsx / skill-detail-dialog.tsx 共用
const sourceTypeLabelKey = (t: TFunction, sourceType: CatalogSkill["sourceType"]) =>
  sourceType === "github" ? t("discover.sourceType.github") : t("discover.sourceType.well_known");
```

建议放进 `discover-utils.ts`（已有 `formatCompact`，同一个工具模块），避免卡片和弹窗各写一遍——符合 AGENTS.md「能抽成共通函数的逻辑必须抽成共通函数」。

### 0.2 `CatalogSkill` 比任务书列的多 3 个字段

`catalog-types.ts:12-28` 完整定义：

| 字段 | 类型 | 任务书是否提到 | 本轮怎么用 |
|------|------|--------------|-----------|
| `id` | `string` | ✅ | 仅作 React key |
| `slug` | `string` | ❌ **漏了** | 不展示（内部标识） |
| `name` | `string` | ✅ | 卡片标题 / 弹窗标题 |
| `source` | `string` | ✅ | 卡片次行 / 弹窗副标题 |
| `installs` | `number` | ✅ | 卡片右上 / 弹窗字段 |
| `sourceType` | `"github" \| "well-known"` | ✅（值拼错） | Badge |
| `installUrl` | `string \| null` | ❌ **漏了** | **不展示**，见 §4.3 |
| `url` | `string` | ✅ | 弹窗「在浏览器打开」 |
| `isDuplicate` | `boolean \| undefined` | ❌ **漏了** | 本轮不展示，见 §4.4 |

### 0.3 桌面端**没有**技能详情 IPC 通道

`renderer/global.d.ts` 只暴露两个 catalog 方法（`:129-130`）：`getCatalogPage`、`searchCatalog`。没有 `getSkillDetail`。

虽然 cache-manager 侧已有 `apps/cache-manager/src/details/skill-detail.ts`（`buildSkillsShDetailUrl`、`projectSkillDetailBody`），但**没有接到 desktop 的 IPC 上**。

**结论**：详情弹窗只能渲染 `CatalogSkill` 已有字段，不能指望拿到真实描述。这也反向印证了要求 3（去掉假描述）是对的——真描述的正确解法是补 `catalog:getSkillDetail` 通道，属于另一个需求，本轮不做。

---

## 1. 决策 A：布局怎么「对齐 providers 但无 sider」

### 推荐：Discover 自建单列容器，**不改** `PageLayout`

**理由（按权重排序）**：

1. **改动面严重不对称**。`PageLayout` 被 4 个页面 + 1 个测试直接依赖：
   - `features/repositories/repositories-page.tsx:19`
   - `features/targets/targets-page.tsx:21`
   - `features/skills/skills-page.tsx:17`
   - `features/providers/providers-page.tsx:15`
   - `features/skills/skills-page.test.tsx:350`（直接渲染 `PageLayout`）

   为一个**不需要** sider 的页面，去改 4 个**需要** sider 的页面共用的布局组件，风险/收益倒挂。

2. **语义不匹配**。`PageLayout` 的定义就是「主从双栏」：`grid-cols-[minmax(620px,1fr)_360px]` + `<aside className="border-l border-border bg-card">`。Discover 是单列浏览页，不属于这个语义族。把 `Sider` 改成可选会让这个组件退化成「有时双栏有时单栏」的万能容器，命名和类型都失真。

3. **复制成本 = 1 行**。Discover 真正需要 `PageLayout` 的部分只有 `<main className="min-h-0 min-w-0 overflow-y-auto p-7">`。抽象成本却是改 5 个文件 + 回归 4 个页面。

4. **AGENTS.md 明确约束**：「优先遵循现有项目约定，不要引入不必要的新结构」「避免无关重构、命名 churn 和纯风格性改写」。

5. **已有先例**：`repositories-page-main.tsx:13` 证明了 Main 内部可以自带 `flex h-full min-h-0 flex-col` 来管理自己的纵向布局。Discover 照这个模式即可。

### 具体落地

`discover-page.tsx`（当前 17 行的外层 div）改为：

```tsx
// 对齐 PageLayout 的 <main>：p-7 + 独立滚动
<main className="h-full min-h-0 min-w-0 overflow-y-auto bg-background p-7">
  <DiscoverPageMain ... />
</main>
```

`discover-page-main.tsx` 根容器（当前第 92 行 `grid h-full min-h-0 content-start gap-6 p-7`）改为：

```tsx
// p-7 已上移到 discover-page.tsx，这里不再重复；
// gap-6 改为显式的 mb-6 / mt-5，与 providers 的节奏对齐
<div className="flex min-h-0 flex-col">
```

**间距节奏对齐表**（来源：`providers-page-main.tsx` + `repositories-page-main.tsx`）：

| 层 | providers 的值 | Discover 采用 |
|----|--------------|--------------|
| 外框 padding | `p-7`（在 PageLayout 的 main 上） | `p-7`（在 discover-page.tsx 的 main 上） |
| header 下边距 | `mb-6` | `mb-6` |
| 筛选卡 | `rounded-xl border border-border bg-card p-4` | 同左 |
| 筛选卡 → 内容区 | `mt-5` | `mt-5` |
| 卡片/表格内部 | `gap-3` | `gap-3` |

---

## 2. 决策 B：标题区与搜索栏

### 2.1 标题左对齐，启用已存在但未使用的 `discover.description`

当前 `discover-page-main.tsx:94-98` 是 `<header className="text-center">` + `text-2xl font-bold`。改成 providers 同款：

```tsx
<header className="mb-6">
  <h1 className="text-[28px] font-semibold leading-tight">{t("discover.heading")}</h1>
  <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
    {t("discover.description")}
  </p>
</header>
```

注意：
- `text-2xl font-bold` → `text-[28px] font-semibold leading-tight`（与 `providers-page-main.tsx:17` 逐字一致）
- **不要**外层 `flex items-center justify-between`。providers 之所以有那层 flex，是因为右侧有「运行诊断」按钮；Discover 没有页级操作按钮，套一个只有单子元素的 flex 是空壳。
- `discover.description`（zh `resources.ts:30` / en `:557`）**已经定义好了但从来没被引用过**，正好这次用上，不需要新增 key。
- `max-w-3xl` 要保留：这是**文本行长**约束（中文约 60-70 字换行），与 §5 的网格宽度是两回事。

### 2.2 搜索栏：从「居中浮条」改为 providers/repositories 同款筛选卡

**居中搜索栏 + 左对齐标题确实打架**——两个不同的对齐轴，视觉上会让人觉得标题是"歪"的。更重要的是，`mx-auto max-w-2xl` + `h-11` 的大居中搜索框是**搜索引擎首页 / 营销站**的语汇，直接违反 AGENTS.md「构建桌面工具界面，而不是营销页面」。

改成与 `repository-filters.tsx:77` 完全同构的卡片：

```tsx
<section
  className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3 rounded-xl border border-border bg-card p-4"
  aria-label={t("discover.filters.ariaLabel")}
>
  <div className="relative min-w-0">
    <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
      <Search className="size-4" aria-hidden="true" />
    </span>
    <Input
      type="search"
      value={searchInput}
      onValueChange={onSearchInputChange}
      onKeyDown={/* 保持现有 Enter 逻辑不变 */}
      placeholder={t("discover.searchPlaceholder", { total: formattedTotal })}
      className="pl-9"
      aria-label={t("discover.searchAriaLabel")}
    />
  </div>
  {isSearchMode ? (
    <Button type="button" variant="outline" onClick={onSearchClear}>
      {t("discover.searchResults.clear")}
    </Button>
  ) : null}
</section>
```

要点：
- **要求 1 落地点**：`import { Search } from "lucide-react"`，替换 104-117 行内联 svg。图标容器的定位 span 原样保留（`pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3`），只换里面的图形。原 svg 的 `strokeWidth="2"` 等属性不用手动补，lucide 默认就是这套。
- **去掉 `h-11`**，用 `Input` 默认的 `h-10`（`input.tsx:8`），与 `repository-filters.tsx:81` 的搜索框一致。同时去掉 `text-sm`（`inputClassName` 已含）。
- **`pl-9` 必须保留**，否则文字压在图标上。
- **删掉第 143 行的 `<hr className="border-border" />`**：卡片自带 border，再加一条分隔线是双重分隔。

> ⚠️ **不要给这个 Input 加可见的 `<FieldLabel>`**。
> repositories/providers 的筛选卡用 `Field`+`FieldLabel` 是因为它们有 3-4 个并列字段需要区分；Discover 只有一个主输入，placeholder 已经承载了说明。
> 更关键的是：现有 8 个测试用 `screen.findByLabelText("搜索技能")` 定位输入框（`discover-page.test.tsx:97, 227, 245, 265` 等）。虽然 `aria-label` 在可访问名计算中优先级高于 `<label>`，加 FieldLabel **理论上**不会破坏这些测试，但这是不必要的风险。保持现状最稳。

### 2.3 提示区改左对齐

第 146-172 行的陈旧提示 / 搜索摘要 / 截断警告，当前是 `text-center`。改为左对齐，挂在筛选卡下方：

```tsx
{/* 陈旧提示：browse 独有 */}
{isStale ? <p className="mt-3 text-xs text-muted-foreground">{t("discover.staleNotice")}</p> : null}

{/* 搜索摘要 */}
{isSearchMode && status === "success" ? (
  <div className="mt-3 grid gap-1">
    <p className="text-sm text-muted-foreground">
      {t("discover.searchResults.summary", { query: searchResultQuery, count: searchCount })}
      <span className="ml-2 text-xs">
        {t(searchType === "fuzzy" ? "discover.searchType.fuzzy" : "discover.searchType.semantic")}
      </span>
    </p>
    {searchTruncated ? (
      <p className="text-xs text-amber-600 dark:text-amber-400">
        {t("discover.searchResults.truncated", { count: searchCount })}
      </p>
    ) : null}
  </div>
) : null}
```

`text-amber-600 dark:text-amber-400` 不是语义 token，但它是**已有代码**（第 167 行），本轮不在范围内，保留原样避免无关改动。

---

## 3. 决策 E：卡片网格与密度

### 3.1 不加 `max-w-*` 包裹层

一个容易犯的错：给内容区套 `mx-auto max-w-6xl`。**不要这么做**。

- 行长约束只适用于**连续文本**（已由 header 的 `max-w-3xl` 处理）。卡片网格不是文本，卡片自身宽度由 grid 列数决定，不会因容器变宽而变得难读。
- AGENTS.md 第一优先级是「信息密度」。宽屏下人为留白 = 每屏少看 4-8 张卡片，是净损失。
- Discover 本来就没有 sider，加 max-width 反而是**新增**约束，不是「对齐 providers」。

### 3.2 列数与间距

```tsx
<div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
```

变化：
- `gap-4` → `gap-3`（对齐 providers/repositories 筛选卡的 `gap-3` 节奏）
- `xl:grid-cols-3` → `lg:grid-cols-3`：删掉 3 行描述后卡片高度从约 150px 降到约 92px，宽高比变扁，可以更早进入 3 列
- 新增 `2xl:grid-cols-4`：补偿卡片变矮带来的纵向空旷感

### 3.3 卡片变矮后如何「不显空洞」

核心原则：**收紧节奏，而不是补内容**。删掉描述后如果保持原来的 `p-4` + `gap-3`，卡片会变成「三行小字漂在一大片留白里」。

- `p-4` → `p-3.5`
- `gap-3` → `gap-2`
- 标题 `text-base` → `text-sm`（工具应用的卡片标题不需要 16px）
- 把 `sourceType` 从灰色小字**升格为 `Badge`**，补回删掉描述后失去的视觉重量

---

## 4. 决策 C + D：SkillCard 与详情弹窗

### 4.1 决策 D：整卡点击 —— 推荐「拉伸覆盖按钮」，并把外链移出卡片

**推荐方案：卡片内放一个绝对定位覆盖全卡的 `<button>`，同时把「在浏览器打开」外链移进弹窗，卡片上不再保留任何其他可交互元素。**

理由：

1. **从根上消除嵌套点击冲突**，不需要 `stopPropagation`。`stopPropagation` 是治标：它能挡住鼠标冒泡，但挡不住键盘——嵌套的两个 button 会产生两个 tab stop，用户 Tab 过去搞不清哪个是哪个。
2. **避免无效 HTML**。如果整卡用 `<button>` 包裹，里面就不能放 `<h3>`（`<button>` 只允许 phrasing content）。如果用 `<article role="button" tabIndex={0}>`，则要手写 Enter/Space 键盘处理，且 `role="button"` 会让读屏把整个卡片朗读成一个按钮名，标题的语义丢失。覆盖按钮方案两个问题都没有：标题还是标题，按钮还是按钮，原生键盘支持。
3. **单一 tab stop**，符合「重复操作效率」——用户 Tab 遍历 24 张卡片是 24 次，不是 48 次。

```tsx
<article className="group relative grid content-start gap-2 rounded-xl border border-border bg-card p-3.5 transition-colors hover:border-primary/40 hover:bg-muted/40 focus-within:border-ring">
  {/* ...内容见 4.2... */}

  {/* 拉伸触发器：唯一的可交互元素 */}
  <button
    type="button"
    onClick={() => onOpenDetail(skill)}
    aria-label={t("discover.card.openDetailAria", { name: skill.name })}
    className="absolute inset-0 cursor-pointer rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
  />
</article>
```

**已有替代模式（本轮不用，但要知道）**：项目里已有 `@/lib/row-selection` 的 `shouldIgnoreRowSelection(event)`，配合 `provider-list.tsx:61-67` 的「可点击行 + 行内按钮」模式。**如果未来**要在卡片上加回一个内联操作（比如快捷安装按钮），就该切换到那个模式（去掉覆盖按钮，改在 `<article onClick>` 里用 `shouldIgnoreRowSelection` 提前 return），而不是给覆盖按钮调 z-index。本轮因为卡片上只有一个动作，覆盖按钮更简单。

### 4.2 SkillCard 完整规格（`components/skill-card.tsx`）

```tsx
import { ChevronRight, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { CatalogSkill } from "@/global";
import { formatCompact, sourceTypeLabel } from "../discover-utils";

type SkillCardProps = {
  skill: CatalogSkill;
  onOpenDetail: (skill: CatalogSkill) => void;
};

export const SkillCard = ({ skill, onOpenDetail }: SkillCardProps) => {
  const { t } = useTranslation();

  return (
    <article className="group relative grid content-start gap-2 rounded-xl border border-border bg-card p-3.5 transition-colors hover:border-primary/40 hover:bg-muted/40 focus-within:border-ring">
      {/* 主行：名称 + 安装量 */}
      <div className="flex items-start justify-between gap-2">
        <h3 className="min-w-0 truncate text-sm font-semibold text-foreground" title={skill.name}>
          {skill.name}
        </h3>
        <span
          className="inline-flex shrink-0 items-center gap-1 text-xs tabular-nums text-muted-foreground"
          title={`${skill.installs.toLocaleString()} installs`}
        >
          <Download className="size-3" aria-hidden="true" />
          {formatCompact(skill.installs)}
        </span>
      </div>

      {/* 次行：来源 */}
      <p className="min-w-0 truncate font-mono text-xs text-muted-foreground" title={skill.source}>
        {skill.source}
      </p>

      {/* 尾行：类型 Badge + 详情提示 */}
      <div className="flex items-center justify-between gap-2">
        <Badge variant="outline" className="font-normal">
          {sourceTypeLabel(t, skill.sourceType)}
        </Badge>
        <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground transition-colors group-hover:text-primary">
          {t("discover.card.openDetail")}
          <ChevronRight className="size-3" aria-hidden="true" />
        </span>
      </div>

      <button
        type="button"
        onClick={() => onOpenDetail(skill)}
        aria-label={t("discover.card.openDetailAria", { name: skill.name })}
        className="absolute inset-0 cursor-pointer rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      />
    </article>
  );
};
```

相对现状（243-306 行）的逐项变更与理由：

| 变更 | 理由 |
|------|------|
| `Star` + `text-amber-600 dark:text-amber-400` → `Download` + `text-muted-foreground` | 字段语义是 installs（安装量）不是收藏，星标是错误隐喻；且 amber 不是语义 token，在密网格里过度抢眼。任务书要求配色用语义 token |
| 删掉首字母圆形 avatar（267-273 行 `size-6 rounded-full bg-muted`） | 纯装饰，无信息量；`provider-list.tsx:78-84` 的同类信息用的是纯文本两行，去掉后风格更统一 |
| `source` 加 `font-mono` | 与 `provider-list.tsx:80,87` 的 mono 处理一致（source 是机器标识符，不是自然语言） |
| **删掉 279-284 行整段假描述** | **要求 3**。cache-manager 不返回 description，拼出来的是伪信息 |
| sourceType 从 `<span className="text-xs text-muted-foreground">` → `<Badge variant="outline">` | 补回删描述后的视觉重量；且它是卡片上唯一可扫描的分类维度，值得提权 |
| 外链 button（293-302 行）→ 移进弹窗，替换为非交互的「查看详情 + ChevronRight」提示 | 见 §4.1 与 §4.3 |
| `installs.toLocaleString()` 保留在 `title` | 悬停可看精确值，`formatCompact` 只是显示层压缩，信息不丢失 |
| 加 `tabular-nums` | 等宽数字，多张卡片的安装量右对齐时不会跳动 |

### 4.3 详情弹窗规格（`components/skill-detail-dialog.tsx`）

**弹窗展示什么**：只展示 `name` / `source` / `sourceType` / `installs` / `url` 五项。

明确**不展示**：
- `id`、`slug` —— 内部标识符，对用户无意义
- `installUrl` —— 这是给未来「安装」功能用的机器字段。展示它会让用户产生「这里有个安装地址，那我是不是能装」的预期，而安装本轮恰恰是占位的，属于自相矛盾的信号
- `isDuplicate` —— `catalog-types.ts:21-26` 明确写了「carried through for future filtering but is not acted on yet」。本轮展示它就得解释「疑似重复是什么意思、我该怎么办」，超出范围

```tsx
import { Download, ExternalLink } from "lucide-react";
import {
  Dialog, DialogBackdrop, DialogClose, DialogDescription,
  DialogPopup, DialogPortal, DialogTitle
} from "@/components/ui/dialog";

type SkillDetailDialogProps = {
  skill: CatalogSkill | null;
  onClose: () => void;
  onOpenExternal: (url: string) => void;
};

export const SkillDetailDialog = ({ skill, onClose, onOpenExternal }: SkillDetailDialogProps) => {
  const { t } = useTranslation();
  if (!skill) return null;

  return (
    <Dialog open={skill !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogPortal>
        <DialogBackdrop />
        <DialogPopup className="max-w-md">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <DialogTitle className="truncate text-lg">{skill.name}</DialogTitle>
              <DialogDescription className="truncate font-mono text-xs" title={skill.source}>
                {skill.source}
              </DialogDescription>
            </div>
            <Badge variant="outline" className="mt-1 shrink-0 font-normal">
              {sourceTypeLabel(t, skill.sourceType)}
            </Badge>
          </div>

          <dl className="grid grid-cols-[5rem_minmax(0,1fr)] gap-x-3 gap-y-2 border-t border-border pt-4 text-sm">
            <dt className="text-muted-foreground">{t("discover.detail.installs")}</dt>
            <dd className="tabular-nums">{skill.installs.toLocaleString()}</dd>
            {skill.url ? (
              <>
                <dt className="text-muted-foreground">{t("discover.detail.url")}</dt>
                <dd className="min-w-0 truncate font-mono text-xs" title={skill.url}>{skill.url}</dd>
              </>
            ) : null}
          </dl>

          <p className="mt-4 text-xs leading-5 text-muted-foreground">
            {t("discover.detail.installHint")}
          </p>

          <div className="mt-4 flex items-center justify-end gap-2">
            <DialogClose render={<Button type="button" variant="outline" />}>
              {t("discover.detail.close")}
            </DialogClose>
            {skill.url ? (
              <Button type="button" variant="outline" onClick={() => onOpenExternal(skill.url)}>
                <ExternalLink data-icon="inline-start" />
                {t("discover.detail.openExternal")}
              </Button>
            ) : null}
            {/* 安装占位，见 §4.4 */}
            <Button type="button" disabled aria-disabled="true">
              <Download data-icon="inline-start" />
              {t("discover.detail.install")}
              <Badge variant="secondary" className="ml-1 h-4 px-1.5 text-[10px] font-normal">
                {t("discover.detail.installComingSoon")}
              </Badge>
            </Button>
          </div>
        </DialogPopup>
      </DialogPortal>
    </Dialog>
  );
};
```

**尺寸与响应式**：
- `DialogPopup` 默认 `max-w-[680px]`（`dialog.tsx:31`），对 2 个字段太宽 → 覆盖为 `max-w-md`（448px）
- `w-[calc(100vw-48px)]` 和 `max-h-[calc(100svh-92px)]` 已内建在 `DialogPopup`，**窄窗口自动收缩，不需要额外写响应式**
- `DialogTitle` 默认 `text-2xl`（`dialog.tsx:43`）偏营销 → 覆盖为 `text-lg`
- 按钮区不加 `flex-wrap`：三个按钮在 448px 内放得下

**`skill.url` 为空的处理**：`<dl>` 里的 url 行和「在浏览器打开」按钮都条件渲染。此时弹窗只剩「关闭」+「安装（禁用）」，仍然是合理状态，不会出现空按钮区。

**按钮排序（从左到右）**：`[关闭] [在浏览器打开] [安装(禁用)]`。最右 = 视觉主位。即使安装是禁用的也占住主位，是在向用户交代「这才是未来的主路径，外链只是过渡」。

### 4.4 决策 C 补充：安装占位态 —— `disabled` + 内联 Badge + 常驻说明，**不用 Tooltip**

```tsx
<Button type="button" disabled aria-disabled="true">
  <Download data-icon="inline-start" />
  {t("discover.detail.install")}
  <Badge variant="secondary" className="ml-1 h-4 px-1.5 text-[10px] font-normal">
    {t("discover.detail.installComingSoon")}
  </Badge>
</Button>
```

四条理由：

1. **`disabled` 是唯一无歧义的「点了不会发生事」信号**。`button.tsx:8` 的 base class 已含 `disabled:pointer-events-none disabled:opacity-50`，从根上杜绝「以为点了就真装上了」——这正是任务书要求避免的。

2. **但光有 `disabled` 会被误读成「是我的前置条件没满足」**（比如「是不是我没配分发目标」）。所以必须把原因写死在界面上：按钮内联「即将支持」Badge，不依赖任何悬停就能读到。

3. **不能用 Tooltip —— 这是硬技术约束，不是偏好**。base-ui `Button` 在 `disabled` 时是 `pointer-events-none`（`button.tsx:8`），`TooltipTrigger` 根本收不到 `mouseenter`，tooltip 永远不会弹出。要绕过就得额外包一层 `<span tabIndex={0}>` 把 disabled 换成 `aria-disabled` + 手动拦截 onClick，代码变复杂、可访问性反而更差。改用弹窗底部那行常驻的 `text-xs text-muted-foreground` 说明（`discover.detail.installHint`），鼠标、键盘、读屏用户**一视同仁**都能读到。

4. **不能用「可点击 + 点后提示即将支持」**。那要求用户先点一次才知道结果，是欺骗性 affordance；而且项目里没有 toast/sonner 组件，实现这个提示还得先引入新组件，违反「安装任何新包前先确认确实需要」。
   同理**不要**用 `variant="default"` 实心高对比 + 点击无反应——高对比主按钮配空动作是最差组合。这里用 `variant="default"`（实心）但 `disabled`（自动 50% 透明）是对的：形态上它是主按钮，状态上它明确不可用。

---

## 5. 决策 G：文件结构

```
features/discover/
├── discover-page.tsx                    # 改：外层 div → <main ... p-7>；新增 detailSkill 状态与 3 个 prop
├── discover-utils.ts                    # 改：新增 sourceTypeLabel(t, sourceType) 映射（见 §0.1）
├── discover-utils.test.ts               # 改：补 sourceTypeLabel 的单测
├── components/
│   ├── discover-page-main.tsx           # 瘦身：306 → 约 180 行。只留 header / 搜索卡 / 状态分支 / 网格 / 分页
│   ├── skill-card.tsx                   # 新增（要求 2）
│   └── skill-detail-dialog.tsx          # 新增（要求 5）
├── hooks/use-discover-page-state.ts     # 不动（见下）
├── discover-page.test.tsx               # 改：1 个用例必须重写，见 §7
└── catalog-ipc-contract.test-d.ts       # 不动
```

**`detailSkill` 状态放哪**：推荐放在 `discover-page.tsx` 里就地 `useState<CatalogSkill | null>(null)`，**不要**放进 `use-discover-page-state.ts`。

理由：那个 hook 的注释（`:7-12`）明确写了它维护的是 browse/search **两套互斥的数据状态**，且 `:61-69` 有精心设计的竞态守卫。详情弹窗的开关是纯 UI 局部态，与数据获取无关，塞进去会污染这个已经很克制的状态机，也会让它的单测范围变大。

`discover-page.tsx` 新增传给 `DiscoverPageMain` 的 prop：把现有的 `onOpenExternal` 保留（弹窗要用），新增 `onOpenDetail`。或者更干净：`DiscoverPageMain` 只接 `onOpenDetail`，弹窗直接由 `discover-page.tsx` 渲染在 `<main>` 内、与 `DiscoverPageMain` 并列——这样 `DiscoverPageMain` 完全不需要知道弹窗存在。**推荐后者**，prop 数量从 20 个只 +1。

---

## 6. 决策 F：i18n 变更清单

文件：`apps/desktop/src/renderer/i18n/resources.ts`（zh 与 en **两处都要改**）

### 6.1 删除（4 个 key × 2 语言）

| key | zh 行号 | en 行号 | 删除理由 |
|-----|--------|--------|---------|
| `discover.card.githubDescription` | 64 | 591-592 | 要求 3：假描述，唯一引用点 `discover-page-main.tsx:282` 一并删除 |
| `discover.card.wellKnownDescription` | 65 | 593 | 同上，引用点 `:283` |
| `discover.card.viewSource` | 63 | 590 | **全仓 grep 零引用**，死 key，顺手清理 |
| `discover.installs` | 56 | 583 | 值就是 `"{{count}}"`，**全仓 grep 零引用**，死 key |

> 建议**删除**而非保留注释掉。这两个描述 key 的文案本身就是错的（凭 source 编造技能能力），留着会诱导后来者再用一次。真描述要等 `catalog:getSkillDetail` 通道（见 §0.3），届时 key 名和参数都会不同。

### 6.2 新增（`discover.detail.*` + 2 个）

zh：

```ts
// discover 块内，与 card 平级
card: {
  openDetail: "查看详情",                        // 保留，卡片尾行提示
  openDetailAria: "查看 {{name}} 的详情"          // 新增，覆盖按钮的可访问名
},
filters: {
  ariaLabel: "搜索技能"                          // 新增，搜索卡 section 的 aria-label
},
detail: {
  installs: "安装量",
  url: "来源地址",
  openExternal: "在浏览器中打开",
  close: "关闭",
  install: "安装",
  installComingSoon: "即将支持",
  installHint: "安装功能即将支持。当前可在浏览器中打开来源页面查看该技能。"
}
```

en：

```ts
card: {
  openDetail: "View details",
  openDetailAria: "View details for {{name}}"
},
filters: {
  ariaLabel: "Search skills"
},
detail: {
  installs: "Installs",
  url: "Source URL",
  openExternal: "Open in browser",
  close: "Close",
  install: "Install",
  installComingSoon: "Coming soon",
  installHint: "Installing from Discover is coming soon. For now, open the source page in your browser."
}
```

> ⚠️ `filters.ariaLabel` 与 `searchAriaLabel` 不要混用：前者是 `<section>` 的地标名，后者是 `<input>` 的可访问名。测试依赖后者（`findByLabelText("搜索技能")`），两者中文恰好都想叫「搜索技能」——为避免 `getByLabelText` 匹配到两个元素而报 "found multiple elements"，**建议把 section 的 `filters.ariaLabel` 中文改为「技能搜索」**，与 input 的「搜索技能」区分开。

### 6.3 保留不动

`discover.heading`、`discover.description`（**本轮首次启用**）、`discover.searchPlaceholder`、`discover.searchAriaLabel`、`discover.searchResults.*`、`discover.searchType.*`、`discover.sourceType.*`、`discover.errors.*`、`discover.empty`、`discover.error`、`discover.retry`、`discover.staleNotice`、`discover.loading`、`discover.pagination.pageInfo`

---

## 7. 测试影响

`discover-page.test.tsx` 共 26 个用例。逐条核对后：**只有 1 个必须重写，其余 25 个应当原样通过**。

### 7.1 必须重写：`:189-198`

```ts
it("opens external links through openExternalUrl and never renders target=_blank", ...)
```

当前逻辑是「点『查看详情』→ 直接调 `openExternalUrl`」。改成弹窗后，「查看详情」只是提示文字，点击会打开弹窗而不是外链，此用例必然失败。

重写为：

```ts
it("opens external links from the detail dialog and never renders target=_blank", async () => {
  const { openExternalUrl } = setupWindow({});

  render(<DiscoverPage />);
  // 用覆盖按钮的可访问名定位，不要用 findByText("查看详情")
  fireEvent.click(await screen.findByRole("button", { name: "查看 Alpha 的详情" }));

  fireEvent.click(await screen.findByRole("button", { name: "在浏览器中打开" }));

  expect(openExternalUrl).toHaveBeenCalledWith("https://skills.sh/a");
  expect(document.querySelector('[target="_blank"]')).toBeNull();
});
```

> 关键：**不要**用 `fireEvent.click(screen.getByText("查看详情"))`。那个 span 是非交互的，jsdom 里点它只会冒泡到 `<article>`（没有 onClick），弹窗不会打开。必须点覆盖按钮。

### 7.2 建议新增（覆盖要求 5 的占位语义）

```ts
it("renders the install action as a disabled placeholder", async () => {
  setupWindow({});
  render(<DiscoverPage />);
  fireEvent.click(await screen.findByRole("button", { name: "查看 Alpha 的详情" }));

  const install = await screen.findByRole("button", { name: /安装/ });
  expect(install).toBeDisabled();
  expect(screen.getByText("即将支持")).toBeInTheDocument();
});
```

### 7.3 已核对为**不受影响**的用例

| 定位方式 | 用例行号 | 为何安全 |
|---------|---------|---------|
| `findByText("Alpha")` / `"React Hooks Helper"` / `"Fast Result"` | 122,136,138,150,213,217,220,287,292,300,336,343,352,358,449,480,492,493 | 卡片仍渲染 `skill.name`。弹窗默认关闭，不会造成重复匹配 |
| `findByLabelText("搜索技能")` | 97,227,245,265 | Input 的 `aria-label` 保持不变（前提：不加 FieldLabel，见 §2.2） |
| `getByRole("button", { name: "清除搜索" })` | 356 | 清除按钮文案与结构不变 |
| `getByRole("button", { name: "重试" })` | 135,452 | 错误块不改 |
| `getByText(/第 .* 页/)` | 123,293,301,306 | 分页块不改 |
| `getByText("模糊匹配")` / `/找到 1 个技能/` / `/仅展示前 50 个/` | 370,371,382,393 | 搜索摘要只改对齐 class，文案与结构不变 |
| `findByText(/可能稍旧/)` | 170,324,329 | 陈旧提示只改对齐 class |
| 各错误文案 `/未配置/`、`/正在准备中/`、`/请 7 秒后重试/` 等 | 178,186,204,406,417,428,439,506,520 | 错误分支不改 |

### 7.4 其他验证

- `pnpm run check`（新增文件跨 `CatalogSkill` 类型边界）
- `pnpm test apps/desktop/src/renderer/features/discover`
- **`catalog-ipc-contract.test-d.ts` 不要动**（零运行时类型守卫）
- ⚠️ 环境提醒：Git Bash 下跑 pnpm 会报 `Cannot find module ...pnpm.cjs`，**必须用 PowerShell 工具跑**

---

## 8. 落地顺序建议

1. `discover-utils.ts` 加 `sourceTypeLabel` + 单测（无依赖，先做）
2. `resources.ts` 增删 key（zh + en 同步）
3. 抽 `skill-card.tsx`（要求 2 + 3）
4. 建 `skill-detail-dialog.tsx`（要求 5）
5. 改 `discover-page-main.tsx` 骨架 + `Search` 图标（要求 1 + 4）
6. 改 `discover-page.tsx` 容器与 `detailSkill` 状态
7. 重写 `discover-page.test.tsx:189-198` + 新增占位态用例
8. PowerShell 跑 `pnpm run check` + discover 目录 Vitest

**不要碰**：`components/layout/page-layout.tsx`、`hooks/use-discover-page-state.ts`、`catalog-ipc-contract.test-d.ts`、其他四个 feature 页面。
