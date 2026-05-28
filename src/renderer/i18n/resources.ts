import type { SupportedLocale } from "../../core/i18n/locale";

export const resources = {
  "zh-CN": {
    translation: {
      shell: {
        navigation: {
          workspace: "工作区",
          system: "系统",
          providers: "Provider",
          repositories: "Repositories",
          skills: "Skills",
          targets: "Targets",
          distribution: "Distribution",
          settings: "Settings",
          syncHistory: "Sync history",
          diagnostics: "Diagnostics",
          mainNavigation: "主导航"
        },
        guidance: {
          title: "计划优先",
          description: "安装前先生成计划预览，确认同步目标和策略后再执行。"
        }
      },
      skills: {
        pageLabel: "Skills",
        heading: "浏览 skill unit 并预览分发计划",
        description: "每个技能来自仓库扫描结果，可选择同步目标并查看计划预览。",
        actions: {
          sync: "同步",
          addSkill: "新增技能",
          editSkill: "编辑技能",
          addSyncTarget: "新增同步目标",
          preview: "预览"
        },
        filters: {
          ariaLabel: "技能筛选",
          search: "搜索技能",
          searchPlaceholder: "搜索名称、ID、仓库、标签或入口路径",
          sort: "排序",
          sortRecommended: "按推荐优先级",
          sortName: "按名称",
          sortRepository: "按仓库",
          repository: "仓库",
          allRepositories: "全部仓库",
          status: "状态",
          allStatuses: "全部状态"
        },
        summary: {
          ariaLabel: "技能摘要",
          skillUnit: "skill unit",
          indexed: "来自当前本地索引",
          needsReview: "需要复核",
          ambiguous: "入口或 manifest 有歧义"
        },
        table: {
          selectAll: "选择全部可见技能",
          skill: "技能",
          repository: "仓库",
          version: "版本",
          status: "状态",
          targets: "目标",
          enabled: "启用",
          actions: "操作",
          selectSkill: "选择 {{name}}"
        },
        detail: {
          ariaLabel: "技能详情",
          syncTargets: "同步目标",
          syncTargetsDescription: "选择默认同步范围；安装前仍会先生成计划预览。",
          chooseTarget: "选择 {{name}}",
          planPreview: "计划预览",
          planPreviewDescription: "计划预览会把每个目标分类为 install、update、skip 或 conflict。",
          planPreviewEmpty: "尚未预览。选择目标后点击“预览计划”。",
          details: "详情",
          skillId: "Skill ID",
          repository: "仓库",
          entryFile: "入口文件",
          version: "版本",
          tags: "标签"
        },
        targets: {
          customDirectory: "Custom directory"
        }
      }
    }
  },
  "en-US": {
    translation: {
      shell: {
        navigation: {
          workspace: "Workspace",
          system: "System",
          providers: "Provider",
          repositories: "Repositories",
          skills: "Skills",
          targets: "Targets",
          distribution: "Distribution",
          settings: "Settings",
          syncHistory: "Sync history",
          diagnostics: "Diagnostics",
          mainNavigation: "Main navigation"
        },
        guidance: {
          title: "Plan first",
          description: "Preview the plan before installing, then confirm targets and strategy."
        }
      },
      skills: {
        pageLabel: "Skills",
        heading: "Browse skill units and preview distribution plans",
        description:
          "Each skill comes from repository scan results. Choose sync targets and review the plan before execution.",
        actions: {
          sync: "Sync",
          addSkill: "Add skill",
          editSkill: "Edit skill",
          addSyncTarget: "Add sync target",
          preview: "Preview"
        },
        filters: {
          ariaLabel: "Skill filters",
          search: "Search skills",
          searchPlaceholder: "Search name, ID, repository, tags, or entry path",
          sort: "Sort",
          sortRecommended: "Recommended first",
          sortName: "Name",
          sortRepository: "Repository",
          repository: "Repository",
          allRepositories: "All repositories",
          status: "Status",
          allStatuses: "All statuses"
        },
        summary: {
          ariaLabel: "Skill summary",
          skillUnit: "skill unit",
          indexed: "From the current local index",
          needsReview: "Need review",
          ambiguous: "Entry or manifest is ambiguous"
        },
        table: {
          selectAll: "Select all visible skills",
          skill: "Skill",
          repository: "Repository",
          version: "Version",
          status: "Status",
          targets: "Targets",
          enabled: "Enabled",
          actions: "Actions",
          selectSkill: "Select {{name}}"
        },
        detail: {
          ariaLabel: "Skill details",
          syncTargets: "Sync targets",
          syncTargetsDescription:
            "Choose the default sync scope. Installation still starts with a plan preview.",
          chooseTarget: "Choose {{name}}",
          planPreview: "Plan preview",
          planPreviewDescription:
            "The preview classifies each target as install, update, skip, or conflict.",
          planPreviewEmpty: "No preview yet. Choose targets, then click Preview.",
          details: "Details",
          skillId: "Skill ID",
          repository: "Repository",
          entryFile: "Entry file",
          version: "Version",
          tags: "Tags"
        },
        targets: {
          customDirectory: "Custom directory"
        }
      }
    }
  }
} satisfies Record<SupportedLocale, { translation: object }>;
