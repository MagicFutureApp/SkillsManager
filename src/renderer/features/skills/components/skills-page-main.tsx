import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import React from "react";
import { useTranslation } from "react-i18next";

import { Field, Select, statusClassName, Toggle } from "./skills-page-controls";
import { selectedSkill, skills } from "./skills-page-data";

const tableGridColumnsClassName =
  "grid-cols-[32px_minmax(0,1.7fr)_minmax(0,0.9fr)_minmax(0,0.65fr)_minmax(0,0.75fr)_minmax(0,0.55fr)_minmax(44px,0.45fr)_minmax(56px,0.5fr)]";

export const SkillsPageMain = () => {
  const { t } = useTranslation();
  const reviewCount = skills.filter((skill) => skill.status === "review").length;

  return (
    <>
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
        className="grid grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))] items-end gap-3 rounded-xl border border-border bg-card p-4 max-[1180px]:grid-cols-2"
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
            <option>Team skills repository-----------------------</option>
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
        <div
          className={cn(
            "grid items-center gap-2 border-b border-border px-4 py-3 text-xs font-semibold text-muted-foreground",
            tableGridColumnsClassName
          )}
        >
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
              "grid items-center gap-2 border-b border-border px-4 py-3 last:border-b-0",
              tableGridColumnsClassName,
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
    </>
  );
};
