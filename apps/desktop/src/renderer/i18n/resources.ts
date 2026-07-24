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
          settings: "设置",
          diagnostics: "Diagnostics",
          mainNavigation: "主导航"
        },
        navigationDescriptions: {
          providers: "管理 Provider 连接入口和访问诊断。",
          repositories: "管理技能来源和本地索引入口。",
          skills: "浏览 skill unit，选择目标并执行 copy 分发。",
          targets: "维护 Codex、Claude Code、Gemini CLI 和自定义目录目标。",
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
          syncSelected: "分发",
          syncSelectedAria: "分发选中的技能",
          syncCurrentSkillAria: "分发当前技能",
          syncSkillAria: "分发 {{name}}",
          syncReady: "准备分发",
          syncNoSelection: "请先选择要分发的技能",
          syncNoTargets: "请先添加分发目标",
          syncSelectedNoTargets: "选中的技能没有分发目标",
          distributionUnavailableStatus: "分发接口暂不可用。",
          distributionEmptyStatus: "没有需要分发的项目。",
          distributionFailedStatus: "分发失败。",
          targetRemovalFailedStatus: "取消分发目标失败。请检查目标目录权限后重试。",
          targetRemovalUnavailableStatus: "取消分发目标接口暂不可用。",
          distributionCompletedStatus:
            "分发完成：安装 {{installed}}，更新 {{updated}}，跳过 {{skipped}}，冲突 {{conflicts}}，阻止 {{blocked}}，失败 {{failed}}。",
          distributionPreviewFailedStatus: "分发预览失败。",
          cancel: "取消",
          close: "关闭",
          editSkill: "编辑",
          addSyncTarget: "新增目标",
          addSyncTargetUnavailable: "新增目标暂不可用",
          preview: "预览"
        },
        filters: {
          ariaLabel: "技能筛选",
          search: "搜索技能",
          searchPlaceholder: "搜索名称、仓库或描述",
          sort: "排序",
          sortName: "名称",
          sortRepository: "仓库",
          repository: "来源",
          allRepositories: "全部仓库",
          status: "状态",
          allStatuses: "全部状态"
        },
        pagination: {
          ariaLabel: "技能分页",
          next: "下一页",
          pageAriaLabel: "第 {{page}} 页",
          previous: "上一页",
          range: "{{start}}-{{end}} / {{total}}"
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
          repository: "来源",
          version: "版本",
          status: "状态",
          targets: "目标",
          actions: "操作",
          selectSkill: "选择 {{name}}"
        },
        detail: {
          ariaLabel: "技能详情",
          emptyTitle: "请选择技能",
          syncTargets: "分发目标",
          syncTargetsDescription:
            "选择默认分发范围；点击分发后会直接按确认弹窗中的选择 copy 到目标目录。",
          chooseTarget: "选择 {{name}}",
          details: "详情",
          skillId: "Skill ID",
          repository: "仓库",
          entryFile: "入口文件",
          version: "版本",
          tags: "标签"
        },
        targets: {
          customDirectory: "Custom directory"
        },
        addTargetModal: {
          description: "选择本机目录并命名为当前 skill 的分发目标。"
        },
        targetRemoval: {
          cancel: "取消",
          confirm: "确定",
          deleteFiles: "删除文件并取消",
          deleteQuestion: "是否同时删除这个目标目录中由当前 skill 分发出来的文件？",
          deleteSkillFiles: "删除技能文件",
          description:
            "确定后会解除此 Skill 与目标的分发关系；也可同时删除目标或已分发的 Skill 文件。",
          keepFiles: "仅取消勾选",
          options: "分发目标操作",
          removeTarget: "删除此分发目标",
          removing: "处理中",
          skill: "Skill",
          target: "目标",
          title: "分发目标"
        },
        distribution: {
          confirmTitle: "确认分发",
          confirmDescription: "确认后会将 {{count}} 个项目分发到目标目录。",
          confirmAction: "确认分发",
          executingAction: "分发中",
          doneAction: "确定",
          conflictResolution: "冲突处理",
          conflictResolutionAria: "处理 {{skill}} 到 {{target}} 的冲突",
          itemDistributing: "{{name}} 分发中",
          itemCompleted: "{{name}} 完成",
          runtimeOverwrite: "覆盖",
          runtimeOverwriteAria: "覆盖 {{name}}",
          itemResults: {
            blocked: "{{name}} 分发被阻止",
            conflict: "{{name}} 存在冲突",
            failed: "{{name}} 分发失败",
            installed: "{{name}} 安装完成",
            skipped: "{{name}} 已跳过",
            updated: "{{name}} 更新完成"
          },
          errors: {
            duplicateTarget: "同一次分发中出现了重复的目标路径，请调整目标后重试。",
            generic: "分发失败，请检查目标目录状态后重试。",
            missingPath: "源或目标路径不存在，请同步来源并确认目标目录仍然存在。",
            missingSourceOrTarget: "源目录或目标目录不完整，请重新同步来源并检查目标设置。",
            nestedPaths: "源目录和目标目录不能互相包含，请选择独立的目标目录。",
            noSpace: "磁盘空间不足，请释放空间后重试。",
            permission: "目标目录没有写入权限，请检查目录权限后重试。",
            targetRoot: "目标路径不能直接指向目标根目录，请选择具体的 skill 目录。",
            unownedTarget: "目标路径已存在，且不是由当前 skill 管理。请清理该目录或选择覆盖。",
            withMessage: "分发失败：{{message}}"
          },
          actions: {
            blocked: "阻止",
            conflict: "冲突",
            install: "安装",
            skip: "跳过",
            update: "更新"
          },
          resolutions: {
            overwrite: "覆盖",
            skip: "不处理"
          }
        }
      },
      targets: {
        pageLabel: "Targets",
        heading: "目标管理",
        description: "扫描本机 agent 目录，并汇总 Skills 页面已选择的本地目标。",
        empty: "没有匹配的目标。调整搜索条件。",
        actions: {
          addTarget: "新增",
          addTargetUnavailable: "新增目标暂未实现",
          copyTarget: "复制目标",
          deleteSelected: "删除",
          deleteTarget: "删除 {{name}}",
          editTarget: "编辑",
          scan: "扫描",
          rescan: "重新扫描"
        },
        filters: {
          ariaLabel: "目标筛选",
          search: "搜索目标",
          searchPlaceholder: "搜索名称、路径或已选择技能",
          sort: "排序",
          sortName: "名称",
          sortPath: "路径",
          sortScope: "范围",
          sortSkills: "技能"
        },
        pagination: {
          ariaLabel: "目标分页",
          next: "下一页",
          pageAriaLabel: "第 {{page}} 页",
          previous: "上一页",
          range: "{{start}}-{{end}} / {{total}}"
        },
        table: {
          actions: "操作",
          headerAriaLabel: "目标列表表头",
          path: "路径",
          selectAll: "选择全部可删除目标",
          selectTarget: "选择 {{name}}",
          skillCount: "{{count}}",
          skills: "技能",
          scope: "范围",
          target: "目标"
        },
        scope: {
          global: "全局",
          independent: "独立"
        },
        status: {
          "app-missing": "应用未安装",
          detected: "已检测",
          disabled: "已停用",
          missing: "未发现",
          "not-directory": "不是目录",
          "not-writable": "不可写",
          "path-missing": "路径不存在",
          "scan-error": "扫描失败",
          registered: "已登记"
        },
        scanIssues: {
          confirm: "知道了",
          description: "请检查这些目标路径或应用安装状态。扫描结果已经写入本地数据库。",
          title: "目标扫描发现异常"
        },
        scanLoading: {
          description: "正在检查本机 agent 目录和已登记目标。",
          title: "正在扫描目标"
        },
        modal: {
          agentType: "确认 agent 类型",
          agentTypeDescription: "未找到 skills 目录，请选择要归一化到哪一种 agent 目录。",
          browse: "浏览",
          cancel: "取消",
          close: "关闭",
          customAgentFolder: "自定义文件夹",
          customAgentFolderPlaceholder: "例如 .cursor",
          customAgentFolderRequiredError: "请填写自定义文件夹名称。",
          customAgentType: "自定义",
          description: "选择本机目录并命名为一个全局分发目标。",
          name: "名称",
          path: "本机路径",
          requiredError: "请填写名称和本机路径。",
          save: "保存",
          saveError: "保存目标失败。",
          selectedDirectory: "已选择目录",
          title: "新增目标"
        },
        deleteDialog: {
          batchSummary: "将删除 {{count}} 个目标。",
          cancel: "取消",
          close: "关闭",
          confirm: "确认删除",
          deleteSkillFiles: "删除技能文件",
          description: "默认只删除目标记录。勾选后会同时删除目标目录中对应的 Skills 文件。",
          options: "删除目标选项",
          target: "目标",
          title: "删除目标"
        },
        editDialog: {
          cancel: "取消",
          close: "关闭",
          description: "只更新这个目标的已选择目录和名称。",
          name: "名称",
          path: "已选择目录",
          requiredError: "请填写名称和已选择目录。",
          save: "保存",
          saveError: "保存目标失败。",
          title: "编辑目标",
          unavailableError: "编辑目标暂不可用。"
        },
        detail: {
          ariaLabel: "目标详情",
          emptyDescription: "选择左侧目标后查看检测状态和已选择的技能。",
          emptyTitle: "选择一个目标",
          noSelectedSkills: "没有 Skills 页面选择到这个目标。",
          scanResult: "扫描结果",
          selectedSkills: "已选择技能"
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
        pagination: {
          ariaLabel: "来源分页",
          next: "下一页",
          pageAriaLabel: "第 {{page}} 页",
          previous: "上一页",
          range: "{{start}}-{{end}} / {{total}}"
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
          pending: "待同步",
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
          scanChanged: "变更技能",
          scanDetailsAction: "查看同步明细",
          scanHeading: "同步影响",
          scanRemoved: "移除技能",
          scanWarnings: "扫描警告",
          syncDetailsHeading: "同步明细",
          distributionHeading: "分发摘要",
          autoDistribution: "自动分发",
          autoDistributionEnabled: "已开启",
          autoDistributionDisabled: "已关闭",
          distributionEligible: "可分发",
          distributionInstalled: "安装",
          distributionUpdated: "更新",
          distributionSkipped: "跳过",
          distributionConflicts: "冲突",
          distributionBlocked: "阻止",
          distributionFailed: "失败"
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
        syncProgress: {
          close: "关闭",
          completedDescription: "同步完成。",
          completedItem: "{{name}} 完成",
          empty: "等待扫描到 Skills 后显示逐项进度。",
          failedDescription: "同步失败。请检查来源状态后重试。",
          failedItem: "{{name}} 失败",
          syncingDescription: "正在同步来源中的 Skills。",
          syncingItem: "{{name}} 同步中",
          title: "同步进度"
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
          settings: "Settings",
          diagnostics: "Diagnostics",
          mainNavigation: "Main navigation"
        },
        navigationDescriptions: {
          providers: "Manage provider connection entry points and diagnostics.",
          repositories: "Manage skill sources and local index entry points.",
          skills: "Browse skill units, choose targets, and copy them to targets.",
          targets: "Maintain Codex, Claude Code, Gemini CLI, and custom directory targets.",
          versionLabel: "Version: {{version}}"
        }
      },
      skills: {
        pageLabel: "Skills",
        heading: "Browse and Distribute Skills",
        description:
          "Each skill comes from repository scan results. Choose distribution targets and copy skills into place.",
        empty: "No indexed skills yet.",
        actions: {
          sync: "Distribute",
          syncSelected: "Distribute",
          syncSelectedAria: "Distribute selected skills",
          syncCurrentSkillAria: "Distribute current skill",
          syncSkillAria: "Distribute {{name}}",
          syncReady: "Ready to distribute",
          syncNoSelection: "Select skills to distribute first",
          syncNoTargets: "Add a distribution target first",
          syncSelectedNoTargets: "Selected skills have no distribution target",
          distributionUnavailableStatus: "Distribution is unavailable.",
          distributionEmptyStatus: "There are no items to distribute.",
          distributionFailedStatus: "Distribution failed.",
          targetRemovalFailedStatus:
            "Failed to remove the distribution target. Check target permissions and try again.",
          targetRemovalUnavailableStatus: "Removing distribution targets is unavailable.",
          distributionCompletedStatus:
            "Distribution finished: installed {{installed}}, updated {{updated}}, skipped {{skipped}}, conflicts {{conflicts}}, blocked {{blocked}}, failed {{failed}}.",
          distributionPreviewFailedStatus: "Distribution preview failed.",
          cancel: "Cancel",
          close: "Close",
          editSkill: "Edit skill",
          addSyncTarget: "Add target",
          addSyncTargetUnavailable: "Adding targets is unavailable",
          preview: "Preview"
        },
        filters: {
          ariaLabel: "Skill filters",
          search: "Search skills",
          searchPlaceholder: "Search name, repository, or description",
          sort: "Sort",
          sortName: "Name",
          sortRepository: "Repository",
          repository: "Source",
          allRepositories: "All repositories",
          status: "Status",
          allStatuses: "All statuses"
        },
        pagination: {
          ariaLabel: "Skill pagination",
          next: "Next",
          pageAriaLabel: "Page {{page}}",
          previous: "Previous",
          range: "{{start}}-{{end}} / {{total}}"
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
          repository: "Source",
          version: "Version",
          status: "Status",
          targets: "Targets",
          actions: "Actions",
          selectSkill: "Select {{name}}"
        },
        detail: {
          ariaLabel: "Skill details",
          emptyTitle: "Select a skill",
          syncTargets: "Distribution targets",
          syncTargetsDescription:
            "Choose the default distribution scope. Distribution copies skills according to the confirmation dialog.",
          chooseTarget: "Choose {{name}}",
          details: "Details",
          skillId: "Skill ID",
          repository: "Repository",
          entryFile: "Entry file",
          version: "Version",
          tags: "Tags"
        },
        targets: {
          customDirectory: "Custom directory"
        },
        addTargetModal: {
          description:
            "Choose a local directory and name it as a distribution target for the current skill."
        },
        targetRemoval: {
          cancel: "Cancel",
          confirm: "OK",
          deleteFiles: "Delete files and remove",
          deleteQuestion:
            "Also delete the files distributed by this skill from the target directory?",
          deleteSkillFiles: "Delete skill files",
          description:
            "Confirming removes this Skill's target link; you can also delete the target or distributed Skill files.",
          keepFiles: "Remove only",
          options: "Distribution target actions",
          removeTarget: "Remove this distribution target",
          removing: "Removing",
          skill: "Skill",
          target: "Target",
          title: "Distribution Target"
        },
        distribution: {
          confirmTitle: "Confirm Distribution",
          confirmDescription: "Confirm to copy {{count}} item(s) to the target directories.",
          confirmAction: "Confirm Distribution",
          executingAction: "Distributing",
          doneAction: "OK",
          conflictResolution: "Conflict handling",
          conflictResolutionAria: "Handle conflict for {{skill}} to {{target}}",
          itemDistributing: "{{name}} distributing",
          itemCompleted: "{{name}} completed",
          runtimeOverwrite: "Overwrite",
          runtimeOverwriteAria: "Overwrite {{name}}",
          itemResults: {
            blocked: "{{name}} blocked",
            conflict: "{{name}} has a conflict",
            failed: "{{name}} failed",
            installed: "{{name}} installed",
            skipped: "{{name}} skipped",
            updated: "{{name}} updated"
          },
          errors: {
            duplicateTarget: "This distribution includes the same target path more than once.",
            generic: "Distribution failed. Check the target directory and try again.",
            missingPath:
              "The source or target path is missing. Sync the source and check the target.",
            missingSourceOrTarget: "The source or target directory is incomplete.",
            nestedPaths: "The source and target directories cannot contain each other.",
            noSpace: "There is not enough disk space. Free space and try again.",
            permission: "The target directory is not writable. Check permissions and try again.",
            targetRoot:
              "The target path cannot be the target root. Choose a specific skill directory.",
            unownedTarget:
              "The target path already exists and is not managed by this skill. Clean it up or choose overwrite.",
            withMessage: "Distribution failed: {{message}}"
          },
          actions: {
            blocked: "Blocked",
            conflict: "Conflict",
            install: "Install",
            skip: "Skip",
            update: "Update"
          },
          resolutions: {
            overwrite: "Overwrite",
            skip: "Skip"
          }
        }
      },
      targets: {
        pageLabel: "Targets",
        heading: "Manage targets",
        description:
          "Scan local agent directories and summarize local targets selected from the Skills page.",
        empty: "No matching targets. Adjust the search.",
        actions: {
          addTarget: "Add",
          addTargetUnavailable: "Adding targets is not implemented yet",
          copyTarget: "Copy target",
          deleteSelected: "Delete",
          deleteTarget: "Delete {{name}}",
          editTarget: "Edit",
          scan: "Scan",
          rescan: "Rescan"
        },
        filters: {
          ariaLabel: "Target filters",
          search: "Search targets",
          searchPlaceholder: "Search name, path, or selected skill",
          sort: "Sort",
          sortName: "Name",
          sortPath: "Path",
          sortScope: "Scope",
          sortSkills: "Skill count"
        },
        pagination: {
          ariaLabel: "Target pagination",
          next: "Next",
          pageAriaLabel: "Page {{page}}",
          previous: "Previous",
          range: "{{start}}-{{end}} / {{total}}"
        },
        table: {
          actions: "Actions",
          headerAriaLabel: "Target list header",
          path: "Path",
          selectAll: "Select all deletable targets",
          selectTarget: "Select {{name}}",
          skillCount: "{{count}} skills",
          skills: "Skills",
          scope: "Scope",
          target: "Target"
        },
        scope: {
          global: "Global",
          independent: "Independent"
        },
        status: {
          "app-missing": "App missing",
          detected: "Detected",
          disabled: "Disabled",
          missing: "Missing",
          "not-directory": "Not a directory",
          "not-writable": "Not writable",
          "path-missing": "Path missing",
          "scan-error": "Scan failed",
          registered: "Registered"
        },
        scanIssues: {
          confirm: "OK",
          description:
            "Check these target paths or application installation state. The scan result has been saved to the local database.",
          title: "Target scan found issues"
        },
        scanLoading: {
          description: "Checking local agent directories and registered targets.",
          title: "Scanning targets"
        },
        modal: {
          agentType: "Confirm agent type",
          agentTypeDescription:
            "No skills directory was found. Choose which agent directory to normalize into.",
          browse: "Browse",
          cancel: "Cancel",
          close: "Close",
          customAgentFolder: "Custom folder",
          customAgentFolderPlaceholder: "For example .cursor",
          customAgentFolderRequiredError: "Custom folder name is required.",
          customAgentType: "Custom",
          description: "Choose a local directory and name it as a global distribution target.",
          name: "Name",
          path: "Local path",
          requiredError: "Name and local path are required.",
          save: "Save",
          saveError: "Failed to save target.",
          selectedDirectory: "Selected directory",
          title: "Add target"
        },
        deleteDialog: {
          batchSummary: "{{count}} targets will be deleted.",
          cancel: "Cancel",
          close: "Close",
          confirm: "Delete",
          deleteSkillFiles: "Delete skill files",
          description:
            "By default, only target records are deleted. Check the option to also delete matching Skills files in the target folders.",
          options: "Target deletion options",
          target: "Target",
          title: "Delete target"
        },
        editDialog: {
          cancel: "Cancel",
          close: "Close",
          description: "Only the selected directory and name for this target will be updated.",
          name: "Name",
          path: "Selected directory",
          requiredError: "Name and selected directory are required.",
          save: "Save",
          saveError: "Failed to save target.",
          title: "Edit target",
          unavailableError: "Editing targets is unavailable."
        },
        detail: {
          ariaLabel: "Target details",
          emptyDescription: "Choose a target to inspect detection status and selected skills.",
          emptyTitle: "Choose a target",
          noSelectedSkills: "No skills select this target from the Skills page.",
          scanResult: "Scan result",
          selectedSkills: "Selected skills"
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
        pagination: {
          ariaLabel: "Source pagination",
          next: "Next",
          pageAriaLabel: "Page {{page}}",
          previous: "Previous",
          range: "{{start}}-{{end}} / {{total}}"
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
          pending: "Pending sync",
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
          scanAdded: "Added skills",
          scanChanged: "Changed skills",
          scanDetailsAction: "View sync details",
          scanHeading: "Sync impact",
          scanRemoved: "Removed skills",
          scanWarnings: "Scan warnings",
          syncDetailsHeading: "Sync details",
          distributionHeading: "Distribution summary",
          autoDistribution: "Auto distribution",
          autoDistributionEnabled: "Enabled",
          autoDistributionDisabled: "Disabled",
          distributionEligible: "Eligible",
          distributionInstalled: "Installed",
          distributionUpdated: "Updated",
          distributionSkipped: "Skipped",
          distributionConflicts: "Conflicts",
          distributionBlocked: "Blocked",
          distributionFailed: "Failed"
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
        syncProgress: {
          close: "Close",
          completedDescription: "Sync completed.",
          completedItem: "{{name}} completed",
          empty: "Per-skill progress appears after skills are discovered.",
          failedDescription: "Sync failed. Check the source status and retry.",
          failedItem: "{{name}} failed",
          syncingDescription: "Syncing skills from the source.",
          syncingItem: "{{name}} syncing",
          title: "Sync progress"
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
      }
    }
  }
} satisfies Record<SupportedLocale, { translation: object }>;
