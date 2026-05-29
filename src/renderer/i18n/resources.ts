import type { SupportedLocale } from "../../core/i18n/locale";

export const resources = {
  "zh-CN": {
    translation: {
      shell: {
        navigation: {
          workspace: "工作区",
          system: "系统",
          providers: "Providers",
          repositories: "来源",
          skills: "技能",
          targets: "目标",
          distribution: "同步记录",
          settings: "设置",
          syncHistory: "同步历史",
          diagnostics: "Diagnostics",
          mainNavigation: "主导航"
        },
        guidance: {
          title: "计划优先",
          description: "安装前先生成计划预览，确认同步目标和策略后再执行。"
        },
        navigationDescriptions: {
          providers: "管理 Provider 连接入口和访问诊断。",
          repositories: "管理技能来源仓库和本地索引入口。",
          skills: "浏览 skill unit，选择目标并预览分发计划。",
          targets: "维护 Codex、Claude Code、Gemini CLI 和自定义目录目标。",
          distribution: "查看技能同步和分发执行记录。",
          versionLabel: "版本: {{version}}"
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
      },
      providers: {
        pageLabel: "Provider",
        heading: "管理 Provider 与连接诊断",
        description:
          "Provider 是系统预定义的连接入口。用户只负责连接、取消连接和验证访问能力；仓库屏幕只负责具体缓存、同步与扫描结果。",
        empty: "没有匹配的 Provider。调整筛选条件。",
        actions: {
          connect: "连接",
          disconnect: "取消连接",
          runDiagnostics: "运行诊断",
          testAccess: "测试访问"
        },
        filters: {
          ariaLabel: "筛选 Provider",
          provider: "Provider",
          sort: "排序",
          sortName: "按名称",
          sortPriority: "按优先级",
          sortProvider: "按 provider",
          sortStatus: "按状态",
          status: "状态"
        },
        table: {
          auth: "认证",
          connection: "连接",
          provider: "Provider",
          status: "状态"
        },
        detail: {
          authMode: "认证方式",
          connected: "connected",
          connection: "连接",
          connectionConfig: "连接配置",
          defaultRules: "默认发现规则",
          discoveryStrategy: "发现策略",
          emptyDescription: "右侧会显示认证方式、默认发现规则和访问诊断。",
          emptyTitle: "选择一个 Provider",
          enabled: "启用",
          notConnected: "not connected",
          provider: "Provider",
          recentDiagnostics: "最近诊断",
          status: "状态"
        }
      },
      repositories: {
        pageLabel: "Repositories",
        heading: "管理仓库缓存与扫描结果",
        description:
          "注册 Git 或市场来源后，系统在本机缓存仓库、记录分支与 commit，并把扫描到的 skill unit 写入本地索引。",
        empty: "没有匹配的仓库。调整搜索或筛选条件。",
        actions: {
          addRepository: "新增仓库",
          copyCachePath: "复制缓存路径",
          editRepository: "编辑仓库",
          forceRescan: "强制重新扫描",
          syncSelected: "同步选中"
        },
        filters: {
          allProviders: "全部来源",
          allStatuses: "全部状态",
          ariaLabel: "仓库筛选",
          provider: "来源类型",
          search: "搜索仓库",
          searchPlaceholder: "搜索名称、URL、缓存路径或入口模式",
          sort: "排序",
          sortName: "按名称",
          sortPriority: "按同步优先级",
          sortProvider: "按来源类型",
          sortSkills: "按技能数量",
          sortStatus: "按扫描状态",
          status: "扫描状态"
        },
        summary: {
          enabledRepositories: "启用仓库",
          indexedSkills: "已索引技能",
          needsReview: "需要复核",
          registered: "注册仓库",
          scanAttention: "扫描状态需处理",
          skillUnit: "skill unit"
        },
        table: {
          actions: "启用",
          branch: "分支",
          provider: "来源",
          repository: "仓库",
          selectAll: "选择全部可见仓库",
          selectRepository: "选择 {{name}}",
          skills: "技能",
          status: "状态",
          toggleEnabled: "启用 {{name}}"
        },
        detail: {
          branch: "分支",
          cachePath: "缓存目录",
          emptyDescription: "右侧会显示本地缓存、最后扫描 commit、发现模式和同步影响。",
          emptyTitle: "选择一个仓库",
          enabled: "启用",
          lastCommit: "最后 commit",
          lastScan: "最后扫描",
          patterns: "发现入口",
          provider: "来源类型",
          remoteUrl: "URL / 路径",
          scanAdded: "新增 skill unit",
          scanChanged: "元数据变更",
          scanHeading: "同步影响",
          scanRemoved: "移除 skill unit",
          scanWarnings: "扫描警告"
        },
        modal: {
          branch: "分支",
          cachePath: "缓存目录",
          cancel: "取消",
          close: "关闭",
          editDescription: "修改仓库注册信息。保存不会立即同步或写入目标目录。",
          editTitle: "编辑仓库",
          name: "名称",
          newDescription: "保存后只进入本地仓库注册表。同步或扫描需要用户手动触发。",
          newTitle: "新增仓库",
          note: "备注",
          patterns: "发现入口",
          provider: "来源类型",
          remoteUrl: "URL / 本机路径",
          requiredError: "名称和 URL / 本机路径是必填项。",
          save: "保存仓库"
        },
        scan: {
          justForceScanned: "刚刚强制扫描",
          justSynced: "刚刚同步"
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
          providers: "Providers",
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
        },
        navigationDescriptions: {
          providers: "Manage provider connection entry points and diagnostics.",
          repositories: "Manage skill source repositories and local index entry points.",
          skills: "Browse skill units, choose targets, and preview distribution plans.",
          targets: "Maintain Codex, Claude Code, Gemini CLI, and custom directory targets.",
          distribution: "Review skill sync and distribution execution records.",
          versionLabel: "Version: {{version}}"
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
      },
      providers: {
        pageLabel: "Provider",
        heading: "Manage providers and connection diagnostics",
        description:
          "Providers are predefined connection entry points. Users connect, disconnect, and validate access here; repository caching, sync, and scan results stay on the repository screen.",
        empty: "No matching providers. Adjust the filters.",
        actions: {
          connect: "Connect",
          disconnect: "Disconnect",
          runDiagnostics: "Run diagnostics",
          testAccess: "Test access"
        },
        filters: {
          ariaLabel: "Provider filters",
          provider: "Provider",
          sort: "Sort",
          sortName: "Name",
          sortPriority: "Priority",
          sortProvider: "Provider",
          sortStatus: "Status",
          status: "Status"
        },
        table: {
          auth: "Auth",
          connection: "Connection",
          provider: "Provider",
          status: "Status"
        },
        detail: {
          authMode: "Auth mode",
          connected: "connected",
          connection: "Connection",
          connectionConfig: "Connection config",
          defaultRules: "Default discovery rules",
          discoveryStrategy: "Discovery strategy",
          emptyDescription:
            "Auth mode, default discovery rules, and access diagnostics appear here.",
          emptyTitle: "Choose a provider",
          enabled: "Enabled",
          notConnected: "not connected",
          provider: "Provider",
          recentDiagnostics: "Recent diagnostics",
          status: "Status"
        }
      },
      repositories: {
        pageLabel: "Repositories",
        heading: "Manage repository cache and scan results",
        description:
          "After registering Git or marketplace sources, the app caches repositories locally, records branches and commits, and writes scanned skill units into the local index.",
        empty: "No matching repositories. Adjust the search or filters.",
        actions: {
          addRepository: "Add repository",
          copyCachePath: "Copy cache path",
          editRepository: "Edit repository",
          forceRescan: "Force rescan",
          syncSelected: "Sync selected"
        },
        filters: {
          allProviders: "All providers",
          allStatuses: "All statuses",
          ariaLabel: "Repository filters",
          provider: "Provider",
          search: "Search repositories",
          searchPlaceholder: "Search name, URL, cache path, or entry pattern",
          sort: "Sort",
          sortName: "Name",
          sortPriority: "Sync priority",
          sortProvider: "Provider",
          sortSkills: "Skill count",
          sortStatus: "Scan status",
          status: "Scan status"
        },
        summary: {
          enabledRepositories: "Enabled repositories",
          indexedSkills: "Indexed skills",
          needsReview: "Need review",
          registered: "Registered repositories",
          scanAttention: "Scan status needs attention",
          skillUnit: "skill unit"
        },
        table: {
          actions: "Enabled",
          branch: "Branch",
          provider: "Provider",
          repository: "Repository",
          selectAll: "Select all visible repositories",
          selectRepository: "Select {{name}}",
          skills: "Skills",
          status: "Status",
          toggleEnabled: "Enable {{name}}"
        },
        detail: {
          branch: "Branch",
          cachePath: "Cache path",
          emptyDescription:
            "Local cache, last scanned commit, discovery patterns, and sync impact appear here.",
          emptyTitle: "Choose a repository",
          enabled: "Enabled",
          lastCommit: "Last commit",
          lastScan: "Last scan",
          patterns: "Discovery entries",
          provider: "Provider",
          remoteUrl: "URL / path",
          scanAdded: "Added skill units",
          scanChanged: "Metadata changes",
          scanHeading: "Sync impact",
          scanRemoved: "Removed skill units",
          scanWarnings: "Scan warnings"
        },
        modal: {
          branch: "Branch",
          cachePath: "Cache path",
          cancel: "Cancel",
          close: "Close",
          editDescription: "Update repository registration. Saving does not sync or write targets.",
          editTitle: "Edit repository",
          name: "Name",
          newDescription:
            "Saving only adds the repository to the local registry. Sync and scan stay manual.",
          newTitle: "Add repository",
          note: "Note",
          patterns: "Discovery entries",
          provider: "Provider",
          remoteUrl: "URL / local path",
          requiredError: "Name and URL / local path are required.",
          save: "Save repository"
        },
        scan: {
          justForceScanned: "Just force scanned",
          justSynced: "Just synced"
        }
      }
    }
  }
} satisfies Record<SupportedLocale, { translation: object }>;
