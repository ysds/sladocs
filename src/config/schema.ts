import { z } from 'zod';

export const projectSchema = z.object({
  name: z.string().optional(),
  dir: z.string(),
  include: z.array(z.string()).optional(),
  exclude: z.array(z.string()).optional(),
});

const siteSchemaBase = z.object({
  title: z.string().default('sladocs'),
  description: z.string().optional(),
  logo: z.string().optional(),
  github: z.string().url().optional(),
});

export const siteSchema = siteSchemaBase.default(() => siteSchemaBase.parse({}));

const markdownSchemaBase = z.object({
  allowDangerousHtml: z.enum(['off', 'safe', 'all']).default('safe'),
});

export const markdownSchema = markdownSchemaBase.default(() => markdownSchemaBase.parse({}));

const colorSchemaBase = z.object({
  primary: z.string().optional(),
});

export const colorSchema = colorSchemaBase.default(() => colorSchemaBase.parse({}));

// The default language has no URL prefix (`/page`); other languages are prefixed
// (`/ja/page`), which the catch-all route reads back as the leading slug. This
// shape is fixed — the more advanced `hideLocale`/`fallbackLanguage` knobs are
// intentionally omitted until a user needs them.
export const i18nSchema = z
  .object({
    languages: z.array(z.string()).min(1),
    defaultLanguage: z.string(),
    parser: z.enum(['dot', 'dir']).default('dot'),
    // Display names for the language switcher, keyed by locale code. Falls back
    // to the locale code itself when unset.
    names: z.record(z.string(), z.string()).optional(),
  })
  .refine((c) => c.languages.includes(c.defaultLanguage), {
    message: 'i18n.defaultLanguage must be one of i18n.languages',
    path: ['defaultLanguage'],
  })
  .optional();

export const configSchema = z.object({
  $schema: z.string().optional(),
  projects: z.array(projectSchema).optional(),
  site: siteSchema,
  markdown: markdownSchema,
  color: colorSchema,
  i18n: i18nSchema,
});

export type ProjectConfig = z.output<typeof projectSchema>;
export type SiteConfig = z.output<typeof siteSchema>;
export type MarkdownConfig = z.output<typeof markdownSchema>;
export type ColorConfig = z.output<typeof colorSchema>;
export type I18nConfig = NonNullable<z.output<typeof i18nSchema>>;
export type AppConfig = z.input<typeof configSchema>;
export type ParsedAppConfig = z.output<typeof configSchema>;
