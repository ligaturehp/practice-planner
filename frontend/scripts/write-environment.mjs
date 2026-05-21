import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const apiBaseUrl = process.env.API_BASE_URL || process.env.PRACTICE_PLANNER_API_ORIGIN || 'https://your-practice-planner-api.up.railway.app';
const environmentPath = resolve('src/environments/environment.ts');

const contents = `export const environment = {
  production: true,
  apiBaseUrl: ${JSON.stringify(apiBaseUrl)},
};
`;

await mkdir(dirname(environmentPath), { recursive: true });
await writeFile(environmentPath, contents);
console.log(`Wrote Angular production API base URL: ${apiBaseUrl}`);
