import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import React from "react";
import { useTranslation } from "react-i18next";

type SkillStatus = "ready" | "review" | "installed";

type Skill = {
  id: string;
  skillId: string;
  name: string;
  repository: string;
  version: string;
  entry: string;
  description: string;
  status: SkillStatus;
  enabled: boolean;
  targets: string[];
  tags: string[];
};

type TargetOption = {
  id: string;
  name: string;
  path: string;
};

const targetOptions: TargetOption[] = [
  { id: "codex", name: "Codex", path: "~/.codex/skills" },
  { id: "claude", name: "Claude Code", path: "~/.claude/skills" },
  { id: "gemini", name: "Gemini CLI", path: "~/.gemini/skills" },
  { id: "custom", name: "skills.targets.customDirectory", path: "D:/Agents/shared-skills" }
];

const skills: Skill[] = [
  {
    id: "prompt-engineering-basic",
    skillId: "prompt-engineering/basic",
    name: "Prompt Engineering Basic",
    repository: "Team skills repository",
    version: "0.1.0",
    entry: "skills/prompt-engineering/basic/SKILL.md",
    description: "基础提示词工程模式，适合写作、评审和结构化任务拆解。",
    status: "installed",
    enabled: true,
    targets: ["codex", "claude"],
    tags: ["prompt", "writing"]
  },
  {
    id: "browser-qa",
    skillId: "testing/browser-qa",
    name: "Browser QA checklist",
    repository: "Team skills repository",
    version: "0.3.2",
    entry: "skills/testing/browser-qa/SKILL.md",
    description: "用于本地预览、截图验证、键盘路径和可访问性烟测。",
    status: "ready",
    enabled: true,
    targets: ["codex"],
    tags: ["testing", "browser"]
  },
  {
    id: "wireframe-review",
    skillId: "design/wireframe-review",
    name: "详情",
    repository: "Design lab prompts",
    version: "0.2.0",
    entry: "skills/design/wireframe-review/SKILL.md",
    description: "对低保真产品界面做层级、密度、术语和流程检查。",
    status: "review",
    enabled: true,
    targets: ["codex", "custom"],
    tags: ["design", "review"]
  },
  {
    id: "local-refactor-notes",
    skillId: "engineering/refactor-notes",
    name: "Refactor notes",
    repository: "Local development skills",
    version: "local",
    entry: "agents/skills/refactor-notes/SKILL.md",
    description: "整理代码重构前后的行为边界、验证步骤和残留风险。",
    status: "ready",
    enabled: false,
    targets: ["gemini"],
    tags: ["engineering", "notes"]
  }
];

const selectedSkill = skills[0];

const statusClassName: Record<SkillStatus, string> = {
  installed: "border-emerald-200 bg-emerald-50 text-emerald-700",
  ready: "border-border bg-background text-muted-foreground",
  review: "border-amber-200 bg-amber-50 text-amber-700"
};

const Field = ({
  label,
  children
}: React.PropsWithChildren<{
  label: string;
}>) => {
  return (
    <label className="grid gap-1.5 text-xs font-semibold text-muted-foreground">
      {label}
      {children}
    </label>
  );
};

const Select = ({ children }: React.PropsWithChildren) => {
  return (
    <select className="h-10 rounded-lg border border-input bg-background px-3 text-sm font-normal text-foreground outline-none focus:border-ring">
      {children}
    </select>
  );
};

const Toggle = ({ enabled }: { enabled: boolean }) => {
  return (
    <span
      className={cn(
        "inline-flex h-[22px] w-9 items-center rounded-full border p-0.5",
        enabled ? "border-primary bg-primary" : "border-border bg-muted"
      )}
      role="switch"
      aria-checked={enabled}
    >
      <span
        className={cn(
          "size-4 rounded-full border bg-background transition-transform",
          enabled ? "translate-x-3.5 border-primary-foreground" : "translate-x-0 border-border"
        )}
      />
    </span>
  );
};

export const SkillsPage = () => {
  const { t } = useTranslation();
  const reviewCount = skills.filter((skill) => skill.status === "review").length;

  return (
    <div className="grid min-h-svh grid-cols-[minmax(620px,1fr)_360px] bg-background">
      <main className="min-w-0 p-7">
        <header className="mb-6">
          <p className="mb-1 text-sm">{t("skills.pageLabel")}</p>
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-[28px] font-semibold leading-tight">{t("skills.heading")}</h1>
            <div className="flex gap-2">
              <Button type="button" disabled>
                {t("skills.actions.sync")}
              </Button>
              <Button type="button">{t("skills.actions.addSkill")}</Button>
            </div>
          </div>
          <p className="mt-2 text-sm">{t("skills.description")}</p>
        </header>

        <section
          className="grid grid-cols-[minmax(240px,1fr)_168px_168px_168px] items-end gap-3 rounded-xl border border-border bg-card p-4"
          aria-label={t("skills.filters.ariaLabel")}
        >
          <Field label={t("skills.filters.search")}>
            <input
              className="h-10 rounded-lg border border-input bg-background px-3 text-sm font-normal outline-none placeholder:text-muted-foreground focus:border-ring"
              type="search"
              placeholder={t("skills.filters.searchPlaceholder")}
            />
          </Field>
          <Field label={t("skills.filters.sort")}>
            <Select>
              <option>{t("skills.filters.sortRecommended")}</option>
              <option>{t("skills.filters.sortName")}</option>
              <option>{t("skills.filters.sortRepository")}</option>
            </Select>
          </Field>
          <Field label={t("skills.filters.repository")}>
            <Select>
              <option>{t("skills.filters.allRepositories")}</option>
              <option>Team skills repository</option>
              <option>Design lab prompts</option>
            </Select>
          </Field>
          <Field label={t("skills.filters.status")}>
            <Select>
              <option>{t("skills.filters.allStatuses")}</option>
              <option>ready</option>
              <option>review</option>
              <option>installed</option>
            </Select>
          </Field>
        </section>

        <section className="mt-5 grid grid-cols-2 gap-3" aria-label={t("skills.summary.ariaLabel")}>
          <article className="rounded-xl border border-border bg-card px-4 py-3">
            <p className="inline text-xl font-semibold">{skills.length}</p>
            <p className="ml-2 inline text-sm font-semibold">{t("skills.summary.skillUnit")}</p>
            <p className="mt-1 text-xs text-muted-foreground">{t("skills.summary.indexed")}</p>
          </article>
          <article className="rounded-xl border border-border bg-card px-4 py-3">
            <p className="inline text-xl font-semibold">{reviewCount}</p>
            <p className="ml-2 inline text-sm font-semibold">{t("skills.summary.needsReview")}</p>
            <p className="mt-1 text-xs text-muted-foreground">{t("skills.summary.ambiguous")}</p>
          </article>
        </section>

        <section className="mt-5 overflow-hidden rounded-xl border border-border bg-card">
          <div className="grid grid-cols-[32px_minmax(190px,1.45fr)_132px_84px_84px_64px_56px_64px] items-center gap-2 border-b border-border px-4 py-3 text-xs font-semibold text-muted-foreground">
            <span className="grid place-items-center">
              <input
                className="size-[18px]"
                type="checkbox"
                aria-label={t("skills.table.selectAll")}
              />
            </span>
            <span>{t("skills.table.skill")}</span>
            <span>{t("skills.table.repository")}</span>
            <span>{t("skills.table.version")}</span>
            <span>{t("skills.table.status")}</span>
            <span>{t("skills.table.targets")}</span>
            <span>{t("skills.table.enabled")}</span>
            <span>{t("skills.table.actions")}</span>
          </div>

          {skills.map((skill) => (
            <div
              key={skill.id}
              className={cn(
                "grid grid-cols-[32px_minmax(190px,1.45fr)_132px_84px_84px_64px_56px_64px] items-center gap-2 border-b border-border px-4 py-3 last:border-b-0",
                skill.id === selectedSkill.id && "bg-primary/5"
              )}
            >
              <span className="grid place-items-center">
                <input
                  className="size-[18px]"
                  type="checkbox"
                  aria-label={t("skills.table.selectSkill", { name: skill.name })}
                />
              </span>
              <span className="min-w-0">
                <strong className="block truncate text-sm">{skill.name}</strong>
                <span className="block truncate font-mono text-xs text-muted-foreground">
                  {skill.skillId}
                </span>
              </span>
              <span className="text-sm">{skill.repository}</span>
              <span className="font-mono text-sm">{skill.version}</span>
              <span>
                <span
                  className={cn(
                    "inline-flex min-h-6 items-center rounded-full border px-2 text-xs",
                    statusClassName[skill.status]
                  )}
                >
                  {skill.status}
                </span>
              </span>
              <span className="font-mono text-sm">{skill.targets.length}</span>
              <Toggle enabled={skill.enabled} />
              <Button type="button" variant="outline" size="sm">
                {t("skills.actions.sync")}
              </Button>
            </div>
          ))}
        </section>
      </main>

      <aside
        className="grid content-start gap-3 border-l border-border bg-card px-5 py-6"
        aria-label={t("skills.detail.ariaLabel")}
      >
        <section className="rounded-xl border border-border bg-card p-4">
          <h2 className="text-xl font-semibold">{selectedSkill.name}</h2>
          <p className="mt-7 text-sm leading-6 text-muted-foreground">
            {selectedSkill.description}
          </p>
          <Button className="mt-3" type="button" variant="outline">
            {t("skills.actions.editSkill")}
          </Button>
        </section>

        <section className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-semibold">{t("skills.detail.syncTargets")}</h3>
              <p className="mt-4 text-sm leading-6 text-muted-foreground">
                {t("skills.detail.syncTargetsDescription")}
              </p>
            </div>
            <div className="grid justify-items-end gap-2">
              <span className="font-mono text-xs text-muted-foreground">
                {selectedSkill.targets.length} / {targetOptions.length}
              </span>
              <Button type="button" variant="outline" size="sm">
                {t("skills.actions.addSyncTarget")}
              </Button>
            </div>
          </div>

          <div className="mt-3 grid gap-2">
            {targetOptions.map((target) => {
              const checked = selectedSkill.targets.includes(target.id);

              return (
                <label
                  key={target.id}
                  className={cn(
                    "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg border p-3",
                    checked ? "border-primary/40 bg-primary/5" : "border-border bg-background"
                  )}
                >
                  <span className="min-w-0">
                    <strong className="block text-sm">
                      {target.name.startsWith("skills.") ? t(target.name) : target.name}
                    </strong>
                    <span className="block truncate font-mono text-xs text-muted-foreground">
                      {target.path}
                    </span>
                  </span>
                  <input
                    type="checkbox"
                    checked={checked}
                    readOnly
                    aria-label={t("skills.detail.chooseTarget", {
                      name: target.name.startsWith("skills.") ? t(target.name) : target.name
                    })}
                  />
                </label>
              );
            })}
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-4">
          <h3 className="font-semibold">{t("skills.detail.planPreview")}</h3>
          <p className="mt-7 text-sm leading-6 text-muted-foreground">
            {t("skills.detail.planPreviewDescription")}
          </p>
          <p className="mt-14 text-sm text-muted-foreground">
            {t("skills.detail.planPreviewEmpty")}
          </p>
        </section>

        <div className="grid grid-cols-2 gap-2">
          <Button type="button" variant="outline">
            {t("skills.actions.preview")}
          </Button>
          <Button type="button">{t("skills.actions.sync")}</Button>
        </div>

        <section className="rounded-xl border border-border bg-card p-4">
          <h3 className="font-semibold">{t("skills.detail.details")}</h3>
          <div className="mt-3 grid gap-2">
            {[
              [t("skills.detail.skillId"), selectedSkill.skillId],
              [t("skills.detail.repository"), selectedSkill.repository],
              [t("skills.detail.entryFile"), selectedSkill.entry],
              [t("skills.detail.version"), selectedSkill.version],
              [t("skills.detail.tags"), selectedSkill.tags.join(", ")]
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg border border-border bg-muted/40 p-2">
                <span className="text-xs font-semibold text-muted-foreground">{label}</span>
                <p className="mt-1 break-words text-sm">{value}</p>
              </div>
            ))}
          </div>
        </section>
      </aside>
    </div>
  );
};
