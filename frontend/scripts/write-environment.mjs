import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const placeholderApiBaseUrl = 'https://your-practice-planner-api.up.railway.app';

export async function writeEnvironment({ cwd = process.cwd(), env = process.env } = {}) {
  const apiBaseUrl = env.API_BASE_URL || env.PRACTICE_PLANNER_API_ORIGIN;
  if (!apiBaseUrl) {
    throw new Error('API_BASE_URL or PRACTICE_PLANNER_API_ORIGIN is required for production builds.');
  }
  if (apiBaseUrl === placeholderApiBaseUrl || apiBaseUrl.includes('your-practice-planner-api')) {
    throw new Error('Production API base URL cannot use the placeholder Railway URL.');
  }

  const environmentPath = resolve(cwd, 'src/environments/environment.ts');
  const contents = `export const environment = {
  production: true,
  apiBaseUrl: ${JSON.stringify(apiBaseUrl)},
};
`;

  await mkdir(dirname(environmentPath), { recursive: true });
  await writeFile(environmentPath, contents);
  return environmentPath;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const environmentPath = await writeEnvironment();
  console.log(`Wrote Angular production API base URL to ${environmentPath}`);
}
