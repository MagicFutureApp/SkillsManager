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
          repositories: "管理技能来源和本地索引入口。",
          skills: "浏览 skill unit，选择目标并预览分发计划。",
          targets: "维护 Codex、Claude Code、Gemini CLI 和自定义目录目标。",
          distribution: "查看技能同步和分发执行记录。",
          syncHistory: "查看 source sync 运行记录、扫描摘要和失败日志。",
          versionLabel: "版本: {{version}}"
        }
      },
      skills: {
        pageLabel: "Skills",
        heading: "技能分发",
        description: "浏览和分发 SKills。",
        empty: "暂无已索引技能。",
        actions: {
          sync: "分发",
          syncSelected: "分发 ({{count}})",
          syncSelectedAria: "分发选中的技能",
          syncSelectedSkillUnavailable: "分发当前技能（暂未实现）",
          syncSkillUnavailable: "分发 {{name}}（暂未实现）",
          syncUnavailable: "分发暂未实现",
          editSkill: "编辑",
          addSyncTarget: "新增分发目标",
          preview: "预览"
        },
        filters: {
          ariaLabel: "技能筛选",
          search: "搜索技能",
          searchPlaceholder: "搜索名称、仓库或描述",
          sort: "排序",
          sortName: "名称",
          sortRepository: "仓库",
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
          actions: "操作",
          selectSkill: "选择 {{name}}"
        },
        detail: {
          ariaLabel: "技能详情",
          emptyDescription: "从来源分发并扫描后，这里会显示技能详情。",
          emptyTitle: "选择一个技能",
          syncTargets: "分发目标",
          syncTargetsDescription: "选择默认分发范围；安装前仍会先生成计划预览。",
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
      targets: {
        pageLabel: "Targets",
        heading: "目标管理",
        description: "扫描本机 agent 目录，并汇总 Skills 页面已选择的本地目标。",
        empty: "没有匹配的目标。调整搜索条件。",
        actions: {
          addTarget: "新增目标",
          addTargetUnavailable: "新增目标暂未实现",
          rescan: "重新扫描"
        },
        filters: {
          ariaLabel: "目标筛选",
          search: "搜索目标",
          searchPlaceholder: "搜索名称、类型、路径或已选择技能",
          sort: "排序",
          sortName: "名称",
          sortSkills: "技能数"
        },
        table: {
          headerAriaLabel: "目标列表表头",
          path: "路径",
          skillCount: "{{count}} 个技能",
          skills: "技能",
          target: "目标"
        },
        status: {
          detected: "已检测",
          disabled: "已停用",
          missing: "未发现",
          registered: "已登记"
        },
        detail: {
          ariaLabel: "目标详情",
          emptyDescription: "选择左侧目标后查看检测状态、安装路径和已选择的技能。",
          emptyTitle: "选择一个目标",
          executablePath: "CLI 路径",
          installPath: "安装目录",
          noSelectedSkills: "没有 Skills 页面选择到这个目标。",
          normalizedPath: "规范化路径",
          noValue: "无",
          paths: "路径",
          selectedSkills: "已选择技能",
          skillPath: "技能目录"
        }
      },
      providers: {
        pageLabel: "Provider",
        heading: "管理 Provider 与连接诊断",
        description:
          "Provider 是系统预定义的连接入口。用户只负责连接、取消连接和验证访问能力；来源屏幕只负责具体缓存、同步与扫描结果。",
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
          sortName: "名称",
          sortPriority: "优先",
          sortProvider: "类型",
          sortStatus: "状态",
          status: "状态"
        },
        table: {
          auth: "认证",
          connection: "连接",
          provider: "Provider",
          status: "状态"
        },
        detail: {
          ariaLabel: "Provider 详情",
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
        pageLabel: "Sources",
        heading: "来源管理",
        description: "管理 Git 和其他来源的 Skills。",
        empty: "没有匹配的来源。调整搜索或筛选条件。",
        actions: {
          addRepository: "新增",
          copyCachePath: "复制缓存路径",
          deleteRepository: "删除",
          editRepository: "编辑",
          syncSelected: "同步"
        },
        filters: {
          allProviders: "全部来源",
          allStatuses: "全部状态",
          ariaLabel: "来源筛选",
          provider: "类型",
          search: "搜索",
          searchPlaceholder: "搜索名称、URL 或备注",
          sort: "排序",
          sortName: "来源",
          sortPriority: "优先",
          sortProvider: "类型",
          sortSkills: "技能",
          sortStatus: "状态",
          status: "状态"
        },
        summary: {
          enabledRepositories: "启用来源",
          indexedSkills: "已索引技能",
          needsReview: "需要复核",
          registered: "注册来源",
          scanAttention: "扫描状态需处理",
          skillUnit: "skill unit"
        },
        table: {
          actions: "启用",
          branch: "分支",
          provider: "类型",
          repository: "来源",
          selectAll: "选择全部可见来源",
          selectRepository: "选择 {{name}}",
          skills: "技能",
          status: "状态",
          toggleEnabled: "启用 {{name}}"
        },
        status: {
          failed: "失败",
          ready: "就绪",
          review: "需复核"
        },
        detail: {
          ariaLabel: "来源详情",
          branch: "分支",
          cachePath: "缓存目录",
          emptyDescription: "右侧会显示最后扫描 commit、发现入口和同步影响。",
          emptyTitle: "选择一个来源",
          enabled: "启用",
          enabledNo: "否",
          enabledYes: "是",
          lastCommit: "最后 commit",
          lastScan: "最后扫描",
          openLocation: "打开 {{location}}",
          patterns: "发现入口",
          provider: "来源类型",
          remoteUrl: "URL / 路径",
          scanAdded: "新增技能",
          scanChanged: "元数据变更",
          scanHeading: "同步影响",
          scanRemoved: "移除技能",
          scanWarnings: "扫描警告"
        },
        deleteDialog: {
          cachePath: "来源本地缓存",
          cancel: "取消",
          confirm: "确认删除",
          description:
            "会删除此来源对应的 Skills 记录和来源同步到本地的缓存文件。不会删除已经同步到 Codex、Claude Code、Gemini CLI 或自定义目标目录的文件。",
          emptySkills: "此来源当前没有已索引的 Skills 记录。",
          loading: "正在读取需要删除的 Skills...",
          skillsHeading: "将删除的 Skills",
          title: "删除来源"
        },
        localSyncDialog: {
          cancel: "取消",
          confirm: "确定",
          description:
            "本地路径同步会复制文件到 Skills Manager 的统一本地缓存目录。旧地址的文件需要用户手动删除。是否继续？",
          title: "本地路径同步确认"
        },
        modal: {
          branch: "分支",
          browseLocalPath: "浏览",
          cachePath: "缓存目录",
          cancel: "取消",
          close: "关闭",
          editDescription: "修改来源注册信息。保存不会立即同步或写入目标目录。",
          editTitle: "编辑来源",
          name: "名称",
          newDescription: "保存后只进入本地来源注册表。同步或扫描需要用户手动触发。",
          newTitle: "新增来源",
          note: "备注",
          patterns: "发现入口",
          patternsPlaceholder: "例: **/SKILL.md、skills/*/SKILL.md 或 SKILL.md",
          provider: "来源类型",
          remoteUrl: "URL / 本机路径",
          requiredError: "名称和 URL / 本机路径是必填项。",
          save: "保存来源",
          sourceInspectionError: "未能自动解析来源信息，可继续手动填写。",
          sourceInspectionLoading: "正在解析来源信息..."
        },
        scan: {
          justForceScanned: "刚刚强制扫描",
          justSynced: "刚刚同步"
        }
      },
      syncHistory: {
        pageLabel: "Sync history",
        heading: "同步历史",
        description: "查看 source sync 写入的运行记录和失败日志。",
        empty: "暂无同步历史。",
        loading: "正在读取同步历史...",
        error: "读取同步历史失败。",
        filters: {
          allStatuses: "全部状态",
          ariaLabel: "同步历史筛选",
          search: "搜索",
          searchPlaceholder: "搜索仓库、URL、commit、错误或日志路径",
          sort: "排序",
          sortNewest: "最新优先",
          sortRepository: "仓库",
          sortStatus: "状态",
          status: "状态"
        },
        list: {
          ariaLabel: "同步运行列表",
          scanSummary: "新增 {{added}} / 更新 {{changed}} / 移除 {{removed}} / 警告 {{warnings}}",
          selectRun: "{{repository}} {{status}}"
        },
        table: {
          log: "日志",
          repository: "仓库",
          scan: "Scan summary",
          startedAt: "开始时间",
          status: "状态"
        },
        status: {
          failed: "失败",
          interrupted: "中断",
          running: "运行中",
          success: "成功"
        },
        detail: {
          ariaLabel: "同步运行详情",
          duration: "耗时",
          emptyTitle: "选择一次同步",
          emptyDescription: "选择左侧记录后查看仓库、时间、状态、扫描摘要和失败日志。",
          endCommit: "结束 commit",
          errorMessage: "错误信息",
          finishedAt: "结束时间",
          logPath: "日志路径",
          noValue: "无",
          repository: "仓库",
          remoteUrl: "URL / 路径",
          scanAdded: "新增技能",
          scanChanged: "元数据变更",
          scanHeading: "Scan summary",
          scanRemoved: "移除技能",
          scanWarnings: "扫描警告",
          startCommit: "开始 commit",
          startedAt: "开始时间",
          status: "状态",
          summaryJson: "原始 summary"
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
          repositories: "Sources",
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
          repositories: "Manage skill sources and local index entry points.",
          skills: "Browse skill units, choose targets, and preview distribution plans.",
          targets: "Maintain Codex, Claude Code, Gemini CLI, and custom directory targets.",
          distribution: "Review skill sync and distribution execution records.",
          syncHistory: "Review source sync runs, scan summaries, and failure logs.",
          versionLabel: "Version: {{version}}"
        }
      },
      skills: {
        pageLabel: "Skills",
        heading: "Browse skill units and preview distribution plans",
        description:
          "Each skill comes from repository scan results. Choose distribution targets and review the plan before execution.",
        empty: "No indexed skills yet.",
        actions: {
          sync: "Distribute",
          syncSelected: "Distribute ({{count}})",
          syncSelectedAria: "Distribute selected skills",
          syncSelectedSkillUnavailable: "Distribute current skill (not implemented yet)",
          syncSkillUnavailable: "Distribute {{name}} (not implemented yet)",
          syncUnavailable: "Distribution is not implemented yet",
          editSkill: "Edit skill",
          addSyncTarget: "Add distribution target",
          preview: "Preview"
        },
        filters: {
          ariaLabel: "Skill filters",
          search: "Search skills",
          searchPlaceholder: "Search name, repository, or description",
          sort: "Sort",
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
          actions: "Actions",
          selectSkill: "Select {{name}}"
        },
        detail: {
          ariaLabel: "Skill details",
          emptyDescription: "Skill details appear here after sources are distributed and scanned.",
          emptyTitle: "Choose a skill",
          syncTargets: "Distribution targets",
          syncTargetsDescription:
            "Choose the default distribution scope. Installation still starts with a plan preview.",
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
      targets: {
        pageLabel: "Targets",
        heading: "Manage targets",
        description:
          "Scan local agent directories and summarize local targets selected from the Skills page.",
        empty: "No matching targets. Adjust the search.",
        actions: {
          addTarget: "Add target",
          addTargetUnavailable: "Adding targets is not implemented yet",
          rescan: "Rescan"
        },
        filters: {
          ariaLabel: "Target filters",
          search: "Search targets",
          searchPlaceholder: "Search name, type, path, or selected skill",
          sort: "Sort",
          sortName: "Name",
          sortSkills: "Skill count"
        },
        table: {
          headerAriaLabel: "Target list header",
          path: "Path",
          skillCount: "{{count}} skills",
          skills: "Skills",
          target: "Target"
        },
        status: {
          detected: "Detected",
          disabled: "Disabled",
          missing: "Missing",
          registered: "Registered"
        },
        detail: {
          ariaLabel: "Target details",
          emptyDescription:
            "Choose a target to inspect detection status, paths, and selected skills.",
          emptyTitle: "Choose a target",
          executablePath: "CLI path",
          installPath: "Install path",
          noSelectedSkills: "No skills select this target from the Skills page.",
          normalizedPath: "Normalized path",
          noValue: "None",
          paths: "Paths",
          selectedSkills: "Selected skills",
          skillPath: "Skill directory"
        }
      },
      providers: {
        pageLabel: "Provider",
        heading: "Manage providers and connection diagnostics",
        description:
          "Providers are predefined connection entry points. Users connect, disconnect, and validate access here; source sync and scan results stay on the source screen.",
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
          ariaLabel: "Provider details",
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
        pageLabel: "Sources",
        heading: "Manage sources and scan results",
        description:
          "After registering Git or marketplace sources, the app records branches and commits, and writes scanned skill units into the local index.",
        empty: "No matching sources. Adjust the search or filters.",
        actions: {
          addRepository: "Add",
          copyCachePath: "Copy cache path",
          deleteRepository: "Delete",
          editRepository: "Edit",
          syncSelected: "Sync"
        },
        filters: {
          allProviders: "All providers",
          allStatuses: "All statuses",
          ariaLabel: "Source filters",
          provider: "Type",
          search: "Search",
          searchPlaceholder: "Search name, URL, or note",
          sort: "Sort",
          sortName: "Source",
          sortPriority: "Sync priority",
          sortProvider: "Type",
          sortSkills: "Skills",
          sortStatus: "Scan status",
          status: "Status"
        },
        summary: {
          enabledRepositories: "Enabled sources",
          indexedSkills: "Indexed skills",
          needsReview: "Need review",
          registered: "Registered sources",
          scanAttention: "Scan status needs attention",
          skillUnit: "skill unit"
        },
        table: {
          actions: "Enabled",
          branch: "Branch",
          provider: "Type",
          repository: "Source",
          selectAll: "Select all visible sources",
          selectRepository: "Select {{name}}",
          skills: "Skills",
          status: "Status",
          toggleEnabled: "Enable {{name}}"
        },
        status: {
          failed: "Failed",
          ready: "Ready",
          review: "Needs review"
        },
        detail: {
          ariaLabel: "Source details",
          branch: "Branch",
          cachePath: "Cache path",
          emptyDescription: "Last scanned commit, discovery entries, and sync impact appear here.",
          emptyTitle: "Choose a source",
          enabled: "Enabled",
          enabledNo: "No",
          enabledYes: "Yes",
          lastCommit: "Last commit",
          lastScan: "Last scan",
          openLocation: "Open {{location}}",
          patterns: "Discovery entries",
          provider: "Provider",
          remoteUrl: "URL / path",
          scanAdded: "Added skill units",
          scanChanged: "Metadata changes",
          scanHeading: "Sync impact",
          scanRemoved: "Removed skill units",
          scanWarnings: "Scan warnings"
        },
        deleteDialog: {
          cachePath: "Source cache",
          cancel: "Cancel",
          confirm: "Delete",
          description:
            "This deletes the source's Skills records and locally synced source cache. It does not delete files already synced to Codex, Claude Code, Gemini CLI, or custom target folders.",
          emptySkills: "This source has no indexed Skills records.",
          loading: "Loading Skills to delete...",
          skillsHeading: "Skills to delete",
          title: "Delete source"
        },
        localSyncDialog: {
          cancel: "Cancel",
          confirm: "OK",
          description:
            "Local path sync copies files into Skills Manager's unified local cache. Files at the old path must be removed manually. Continue?",
          title: "Local path sync confirmation"
        },
        modal: {
          branch: "Branch",
          browseLocalPath: "Browse",
          cachePath: "Cache path",
          cancel: "Cancel",
          close: "Close",
          editDescription: "Update source registration. Saving does not sync or write targets.",
          editTitle: "Edit source",
          name: "Name",
          newDescription:
            "Saving only adds the source to the local registry. Sync and scan stay manual.",
          newTitle: "Add source",
          note: "Note",
          patterns: "Discovery entries",
          patternsPlaceholder: "**/SKILL.md, skills/*/SKILL.md, or SKILL.md",
          provider: "Provider",
          remoteUrl: "URL / local path",
          requiredError: "Name and URL / local path are required.",
          save: "Save source",
          sourceInspectionError:
            "Source metadata could not be inspected. You can continue manually.",
          sourceInspectionLoading: "Inspecting source metadata..."
        },
        scan: {
          justForceScanned: "Just force scanned",
          justSynced: "Just synced"
        }
      },
      syncHistory: {
        pageLabel: "Sync history",
        heading: "Sync history",
        description: "Review run records and failure logs written by source sync.",
        empty: "No sync history yet.",
        loading: "Loading sync history...",
        error: "Failed to load sync history.",
        filters: {
          allStatuses: "All statuses",
          ariaLabel: "Sync history filters",
          search: "Search",
          searchPlaceholder: "Search repository, URL, commit, error, or log path",
          sort: "Sort",
          sortNewest: "Newest first",
          sortRepository: "Repository",
          sortStatus: "Status",
          status: "Status"
        },
        list: {
          ariaLabel: "Sync run list",
          scanSummary:
            "Added {{added}} / changed {{changed}} / removed {{removed}} / warnings {{warnings}}",
          selectRun: "{{repository}} {{status}}"
        },
        table: {
          log: "Log",
          repository: "Repository",
          scan: "Scan summary",
          startedAt: "Started at",
          status: "Status"
        },
        status: {
          failed: "Failed",
          interrupted: "Interrupted",
          running: "Running",
          success: "Success"
        },
        detail: {
          ariaLabel: "Sync run details",
          duration: "Duration",
          emptyTitle: "Choose a sync run",
          emptyDescription:
            "Select a run on the left to inspect repository, time, status, scan summary, and failure logs.",
          endCommit: "End commit",
          errorMessage: "Error message",
          finishedAt: "Finished at",
          logPath: "Log path",
          noValue: "None",
          repository: "Repository",
          remoteUrl: "URL / path",
          scanAdded: "Added skill units",
          scanChanged: "Metadata changes",
          scanHeading: "Scan summary",
          scanRemoved: "Removed skill units",
          scanWarnings: "Scan warnings",
          startCommit: "Start commit",
          startedAt: "Started at",
          status: "Status",
          summaryJson: "Raw summary"
        }
      }
    }
  }
} satisfies Record<SupportedLocale, { translation: object }>;
