/** @type {import('@commitlint/types').UserConfig} */
module.exports = {
  extends: ['@commitlint/config-conventional'],

  rules: {
    // 提交标题允许使用中文。
    'subject-case': [0],
    'header-max-length': [2, 'always', 100],
    'type-enum': [2, 'always', ['feat', 'fix', 'refactor', 'perf', 'test', 'docs', 'style', 'build', 'ci', 'chore', 'revert']],
  },

  prompt: {
    messages: {
      type: '请选择提交类型：',
      scope: '请选择影响范围：',
      customScope: '请输入自定义影响范围：',
      subject: '请输入简短的修改描述：',
      body: '请输入详细描述（可跳过）：',
      breaking: '请输入破坏性变更说明（可跳过）：',
      footerPrefixesSelect: '请选择关联事项类型（可跳过）：',
      customFooterPrefix: '请输入自定义关联事项类型：',
      footer: '请输入关联的 Issue，例如 #123：',
      confirmCommit: '确认使用以上提交信息吗？',
    },

    types: [
      { value: 'feat', name: 'feat:     新增功能' },
      { value: 'fix', name: 'fix:      修复问题' },
      { value: 'refactor', name: 'refactor: 重构代码' },
      { value: 'perf', name: 'perf:     性能优化' },
      { value: 'test', name: 'test:     测试相关' },
      { value: 'docs', name: 'docs:     文档修改' },
      { value: 'style', name: 'style:    代码格式调整' },
      { value: 'build', name: 'build:    构建系统修改' },
      { value: 'ci', name: 'ci:       CI/CD 修改' },
      { value: 'chore', name: 'chore:    工具或依赖调整' },
      { value: 'revert', name: 'revert:   回退提交' },
    ],

    scopes: ['auth', 'user', 'permission', 'database', 'prisma', 'i18n', 'exception', 'config', 'udp', 'deps'],

    allowCustomScopes: true,
    allowEmptyScopes: true,
    enableMultipleScopes: false,
    upperCaseSubject: false,
    markBreakingChangeMode: true,
    allowBreakingChanges: ['feat', 'fix'],
    breaklineNumber: 100,
  },
};
