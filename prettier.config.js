/** @type { import('prettier').Config & import('prettier-plugin-tailwindcss').PluginOptions } */
export default {
  plugins: ["prettier-plugin-tailwindcss"],
  // 单行代码的最大长度（超出会自动换行）
  printWidth: 100,
  // 缩进空格数（建议 2 或 4，保持与项目一致）
  tabWidth: 2,
  // 是否使用 tab 键缩进（false 表示使用空格）
  useTabs: false,
  // 语句末尾是否加分号
  semi: true,
  // 是否使用单引号（JS/TS 中推荐 false，HTML 中会自动适配）
  singleQuote: false,
  // 对象/数组的键值对末尾是否加逗号（如 { a: 1, }）
  trailingComma: "all", // "none" | "es5" | "all"
  // 对象字面量的括号间是否加空格（如 { key: 1 }）
  bracketSpacing: true,
  // 箭头函数参数是否加括号（如 (x) => x 还是 x => x）
  arrowParens: "always", // "always" | "avoid"
  // HTML 标签的闭合标签是否单独换行
  htmlWhitespaceSensitivity: "css", // 遵循 CSS 显示属性的空白敏感性
  // 换行符格式（windows 用 crlf，mac/linux 用 lf）
  endOfLine: "lf",
  // 是否格式化嵌入在 HTML 中的 JS
  embeddedLanguageFormatting: "auto",
  // 忽略不需要格式化的文件（也可单独创建 .prettierignore）
  // ignorePath: ".prettierignore",
};
