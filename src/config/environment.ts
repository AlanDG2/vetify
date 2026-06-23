import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

// const optionalUrl = z.preprocess(
//   value => (value === '' ? undefined : value),
//   z.string().url().optional(),
// );

const environmentSchema = z.object({
  APP_ENV: z.enum(['dev', 'qa', 'production']).default('qa'),
  VETIFY_WEBAPP_BASE_URL: z.string().url(),
  VETIFY_INSTITUTIONAL_BASE_URL: z.string().url(),
  AUTH_API_BASE_URL: z.string().url(),
});

export type AppEnvironment = z.infer<typeof environmentSchema>['APP_ENV'];
export type SiteName = 'vetifyWebapp' | 'vetifyInstitutional';

const safeParse = environmentSchema.safeParse(process.env);

if (!safeParse.success) {
  console.error(safeParse.error.format());
  process.exit(1);
}

export const environment = environmentSchema.parse(process.env);

export const siteBaseUrls: Record<SiteName, string> = {
  vetifyWebapp: environment.VETIFY_WEBAPP_BASE_URL,
  vetifyInstitutional: environment.VETIFY_INSTITUTIONAL_BASE_URL,
};
