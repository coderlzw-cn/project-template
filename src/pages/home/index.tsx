import { LANGUAGE_OPTIONS, useLanguage } from '@/hooks/useLanguage';
import { OPTIONS, useTheme } from '@/hooks/useTheme';
import { useTranslation } from 'react-i18next';

export default function Home() {
  const { language, setLanguage } = useLanguage();
  const { t } = useTranslation(['common', 'home', 'validation']);

  const {
    theme: themeMode,
    isDark,
    changeTheme,
    resetTheme,
  } = useTheme();

  return (
    <div className='relative min-h-dvh overflow-hidden'>
      <div
        aria-hidden
        className='pointer-events-none absolute inset-0 bg-[radial-gradientCommon(ellipse_at_top,color-mix(in_oklch,var(--primary)_18%,transparent),transparent_55%),radial-gradientCommon(ellipse_at_bottom_right,color-mix(in_oklch,var(--foreground)_6%,transparent),transparent_45%)]'
      />
      <div
        aria-hidden
        className='pointer-events-none absolute inset-0 bg-[linear-gradientCommon(to_right,color-mix(in_oklch,var(--foreground)_6%,transparent)_1px,transparent_1px),linear-gradientCommon(to_bottom,color-mix(in_oklch,var(--foreground)_6%,transparent)_1px,transparent_1px)] mask-[radial-gradientCommon(ellipse_at_center,black,transparent_75%)] bg-size-[48px_48px] opacity-[0.35]'
      />

      <div className='relative mx-auto flex min-h-dvh w-full max-w-lg flex-col px-6 py-8 sm:px-8 sm:py-10'>
        <header className='flex animate-fade-in items-center justify-between gap-4'>
          <p className='text-sm font-medium tracking-wide text-muted-foreground'>
            Project Template
          </p>
          <button
            type='button'
            onClick={() => changeTheme(isDark ? 'light' : 'dark')}
            className='rounded-lg border border-border bg-card/70 px-3 py-1.5 text-sm text-foreground backdrop-blur-sm transition hover:bg-accent'
          >
            {isDark ? t('theme.light') : t('common:theme.dark')}
          </button>
        </header>

        <main className='flex flex-1 flex-col justify-center gap-10 py-12'>
          <section className='animate-fade-up space-y-4'>
            <h1 className='font-mono text-5xl leading-none tracking-tight text-foreground sm:text-6xl'>
              {t('home:title')}
            </h1>
            <p className='max-w-md text-lg text-muted-foreground'>
              {t('home:greeting', { name: 'John' })}
            </p>
            <p className='text-sm text-muted-foreground'>
              <a
                href='/detail'
                className='underline decoration-primary/50 underline-offset-4 transition hover:text-foreground hover:decoration-primary'
              >
                {t('common:action.detail')}
              </a>
              <span className='ml-2'>{t('home:description')}</span>
            </p>
          </section>

          <section className='grid animate-fade-up gap-6 [animation-delay:80ms] [animation-fill-mode:both] sm:grid-cols-2'>
            <div className='space-y-3'>
              <div className='flex items-baseline justify-between gap-3'>
                <h2 className='text-sm font-medium text-foreground'>
                  {t('common:language.label')}
                </h2>
                <span className='text-xs text-muted-foreground'>
                  {/* {language} */}
                </span>
              </div>
              <div className='flex flex-wrap gap-2'>
                {LANGUAGE_OPTIONS.map(option => {
                  const active = language === option.value;
                  return (
                    <button
                      key={option.value}
                      type='button'
                      onClick={() => setLanguage(option.value)}
                      className={`rounded-lg px-3 py-2 text-sm transition ${active
                        ? 'bg-primary text-primary-foreground'
                        : 'border border-border bg-card/60 text-foreground hover:bg-accent'
                        }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
              <p className='text-sm text-muted-foreground'>
                {t('home:item', { count: 1 })} · {t('home:item', { count: 5 })}
              </p>
              <p className='text-sm text-muted-foreground'>
                {t('validation:required')} · {t('validation:format.email')}
              </p>
            </div>

            <div className='space-y-3'>
              <div className='flex items-baseline justify-between gap-3'>
                <h2 className='text-sm font-medium text-foreground'>
                  {t('common:theme.label')}
                </h2>
                <span className='text-xs text-muted-foreground'>
                  {themeMode}
                </span>
              </div>
              <div className='flex flex-wrap gap-2'>
                {OPTIONS.map(option => {
                  const active = themeMode === option.value;
                  return (
                    <button
                      key={option.value}
                      type='button'
                      onClick={() => changeTheme(option.value)}
                      className={`rounded-lg px-3 py-2 text-sm transition ${active
                        ? 'bg-primary text-primary-foreground'
                        : 'border border-border bg-card/60 text-foreground hover:bg-accent'
                        }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
              <button
                type='button'
                onClick={resetTheme}
                className='text-sm text-muted-foreground underline-offset-4 transition hover:text-foreground hover:underline'
              >
                {t('common:action.reset')}
              </button>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
