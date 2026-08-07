import { DEFAULT_LANGUAGE, LANGUAGE_FALLBACKS, SUPPORTED_LANGUAGES } from '@/constants/i18n.constants';
import { Test } from '@nestjs/testing';
import { I18nModule, I18nService } from 'nestjs-i18n';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const RESOURCE_ROOT = join(__dirname, '..', 'i18n');

function flattenTranslations(value: unknown, prefix = '', result: Record<string, string> = {}): Record<string, string> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return result;

  for (const [key, child] of Object.entries(value)) {
    const translationKey = prefix ? `${prefix}.${key}` : key;
    if (typeof child === 'string') {
      result[translationKey] = child;
    } else {
      flattenTranslations(child, translationKey, result);
    }
  }
  return result;
}

function loadLanguage(language: string): Record<string, string> {
  const languagePath = join(RESOURCE_ROOT, language);
  const translations: Record<string, string> = {};

  for (const filename of readdirSync(languagePath)
    .filter((name) => name.endsWith('.json'))
    .sort()) {
    const namespace = filename.slice(0, -'.json'.length);
    const content: unknown = JSON.parse(readFileSync(join(languagePath, filename), 'utf8'));
    flattenTranslations(content, namespace, translations);
  }
  return translations;
}

function placeholders(message: string): string[] {
  return [...message.matchAll(/\{([^}]+)\}/g)].map((match) => match[1]).sort();
}

describe('i18n resources', () => {
  it('uses a default language and fallbacks backed by real resource directories', () => {
    expect(SUPPORTED_LANGUAGES).toContain(DEFAULT_LANGUAGE);
    expect(Object.values(LANGUAGE_FALLBACKS).every((language) => SUPPORTED_LANGUAGES.includes(language))).toBe(true);
  });

  it('keeps translation keys and placeholders aligned across all supported languages', () => {
    const [referenceLanguage, ...otherLanguages] = SUPPORTED_LANGUAGES;
    const reference = loadLanguage(referenceLanguage);
    const referenceKeys = Object.keys(reference).sort();

    expect(referenceKeys.length).toBeGreaterThan(0);
    for (const language of otherLanguages) {
      const translations = loadLanguage(language);
      expect(Object.keys(translations).sort()).toEqual(referenceKeys);
      for (const key of referenceKeys) {
        expect(placeholders(translations[key])).toEqual(placeholders(reference[key]));
      }
    }
  });

  it('loads the configured default and explicit languages', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        I18nModule.forRoot({
          fallbackLanguage: DEFAULT_LANGUAGE,
          fallbacks: LANGUAGE_FALLBACKS,
          loaderOptions: { path: RESOURCE_ROOT, watch: false },
        }),
      ],
    }).compile();

    try {
      const i18n: I18nService = moduleRef.get(I18nService);
      expect(i18n.t('common.SUCCESS')).toBe('请求成功');
      expect(i18n.t('common.SUCCESS', { lang: 'en-US' })).toBe('Operation successful');
    } finally {
      await moduleRef.close();
    }
  });
});
