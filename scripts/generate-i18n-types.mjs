import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const clientDirectory = path.resolve(scriptDirectory, '..');
const localesDirectory = path.join(clientDirectory, 'src/i18n/locales');
const outputFile = path.join(
  clientDirectory,
  'src/i18n/localeResources.generated.ts',
);
const defaultNamespace = 'common';
const preferredReferenceLocale = 'zh-CN';

async function findJsonFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async entry => {
      const absolutePath = path.join(directory, entry.name);
      return entry.isDirectory() ? findJsonFiles(absolutePath) : [absolutePath];
    }),
  );

  return files.flat().filter(file => file.endsWith('.json'));
}

function flattenResource(value, resourcePath, leaves = new Map()) {
  if (typeof value === 'string') {
    leaves.set(resourcePath, value);
    return leaves;
  }

  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`翻译值必须是字符串或嵌套对象: ${resourcePath}`);
  }

  const entries = Object.entries(value);
  if (entries.length === 0)
    throw new Error(`翻译对象不能为空: ${resourcePath}`);

  for (const [key, childValue] of entries) {
    flattenResource(
      childValue,
      resourcePath ? `${resourcePath}.${key}` : key,
      leaves,
    );
  }

  return leaves;
}

function getInterpolationVariables(message) {
  const variables = new Set();
  const interpolationPattern = /{{\s*([^},\s]+)[^}]*}}/g;
  let match;

  while ((match = interpolationPattern.exec(message)) !== null)
    variables.add(match[1]);
  return [...variables].sort();
}

function getDifference(source, target) {
  const targetSet = new Set(target);
  return source.filter(value => !targetSet.has(value));
}

const files = (await findJsonFiles(localesDirectory)).sort();
const locales = new Map();

for (const [index, file] of files.entries()) {
  const relativePath = path.relative(localesDirectory, file);
  const pathParts = relativePath.split(path.sep);

  if (pathParts.length < 2) {
    throw new Error(`语言包必须放在 locales/<locale>/ 目录中: ${relativePath}`);
  }

  const locale = pathParts[0];
  const namespace = path.basename(file, '.json');
  const namespaces = locales.get(locale) ?? new Map();

  if (namespaces.has(namespace)) {
    throw new Error(`语言 ${locale} 中存在重复 namespace: ${namespace}`);
  }

  let resource;
  try {
    resource = JSON.parse(await readFile(file, 'utf8'));
  } catch (error) {
    throw new Error(`语言包不是有效 JSON: ${relativePath}`, { cause: error });
  }

  const leaves = flattenResource(resource, `${locale}.${namespace}`);
  namespaces.set(namespace, {
    importName: `resource${index}`,
    importPath: `./locales/${relativePath.split(path.sep).join('/')}`,
    leaves,
  });
  locales.set(locale, namespaces);
}

if (locales.size === 0) throw new Error('locales 目录中没有语言包');

const referenceLocale = locales.has(preferredReferenceLocale)
  ? preferredReferenceLocale
  : locales.keys().next().value;
const referenceNamespaces = locales.get(referenceLocale);
if (!referenceNamespaces?.has(defaultNamespace))
  throw new Error(
    `基准语言 ${referenceLocale} 缺少默认 namespace: ${defaultNamespace}`,
  );

const expectedNamespaces = [...referenceNamespaces.keys()].sort();

for (const [locale, namespaces] of locales) {
  const actualNamespaces = [...namespaces.keys()].sort();
  const missingNamespaces = getDifference(expectedNamespaces, actualNamespaces);
  const extraNamespaces = getDifference(actualNamespaces, expectedNamespaces);

  if (missingNamespaces.length || extraNamespaces.length) {
    throw new Error(
      `语言 ${locale} 的 namespace 与 ${referenceLocale} 不一致；缺少: ${missingNamespaces.join(', ') || '无'}；多余: ${extraNamespaces.join(', ') || '无'}`,
    );
  }

  for (const namespace of expectedNamespaces) {
    const referenceLeaves = referenceNamespaces.get(namespace).leaves;
    const currentLeaves = namespaces.get(namespace).leaves;
    const expectedKeys = [...referenceLeaves.keys()].map(key =>
      key.replace(`${referenceLocale}.${namespace}.`, ''),
    );
    const actualKeys = [...currentLeaves.keys()].map(key =>
      key.replace(`${locale}.${namespace}.`, ''),
    );
    const missingKeys = getDifference(expectedKeys, actualKeys);
    const extraKeys = getDifference(actualKeys, expectedKeys);

    if (missingKeys.length || extraKeys.length) {
      throw new Error(
        `语言 ${locale}/${namespace} 的 key 与 ${referenceLocale} 不一致；缺少: ${missingKeys.join(', ') || '无'}；多余: ${extraKeys.join(', ') || '无'}`,
      );
    }

    for (const key of expectedKeys) {
      const referenceMessage = referenceLeaves.get(
        `${referenceLocale}.${namespace}.${key}`,
      );
      const currentMessage = currentLeaves.get(`${locale}.${namespace}.${key}`);
      const expectedVariables = getInterpolationVariables(referenceMessage);
      const actualVariables = getInterpolationVariables(currentMessage);

      if (expectedVariables.join('|') !== actualVariables.join('|')) {
        throw new Error(
          `语言 ${locale}/${namespace}.${key} 的插值变量与 ${referenceLocale} 不一致；期望: ${expectedVariables.join(', ') || '无'}；实际: ${actualVariables.join(', ') || '无'}`,
        );
      }
    }
  }
}

const imports = [...locales.values()]
  .flatMap(namespaces => [...namespaces.values()])
  .map(
    ({ importName, importPath }) =>
      `import type ${importName} from '${importPath}';`,
  );

const localeTypes = [...locales.entries()].flatMap(([locale, namespaces]) => [
  `  ${JSON.stringify(locale)}: {`,
  ...[...namespaces.entries()].map(
    ([namespace, { importName }]) =>
      `    ${JSON.stringify(namespace)}: typeof ${importName};`,
  ),
  '  };',
]);

const content = [
  '// 此文件由 scripts/generate-i18n-types.mjs 自动生成，请勿手动修改。',
  "import type { Resource } from 'i18next';",
  ...imports,
  '',
  `export type LocaleName = ${[...locales.keys()].map(JSON.stringify).join(' | ')};`,
  `export type NamespaceName = ${expectedNamespaces.map(JSON.stringify).join(' | ')};`,
  '',
  'export interface LocaleResourceTypes extends Resource {',
  ...localeTypes,
  '}',
  '',
].join('\n');

await writeFile(outputFile, content);
