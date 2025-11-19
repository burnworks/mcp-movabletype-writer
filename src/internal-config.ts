import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

export interface InternalConfig {
  requestTimeoutMs: number;
}

const DEFAULT_CONFIG: InternalConfig = {
  requestTimeoutMs: 30000
};

const CONFIG_FILENAME = 'internal-config.json';
const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const configPathFromModule = path.resolve(moduleDir, '..', CONFIG_FILENAME);
const configPathFromCwd = path.resolve(process.cwd(), CONFIG_FILENAME);

export function loadInternalConfig(): InternalConfig {
  const candidates = [configPathFromModule];
  if (configPathFromCwd !== configPathFromModule) {
    candidates.push(configPathFromCwd);
  }

  for (const candidate of candidates) {
    const loaded = readConfig(candidate);
    if (loaded) {
      return loaded;
    }
  }

  return DEFAULT_CONFIG;
}

function readConfig(filePath: string): InternalConfig | null {
  try {
    if (!fs.existsSync(filePath)) {
      return null;
    }

    const contents = fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(contents);

    const parsedTimeout = Number(parsed.requestTimeoutMs);
    const requestTimeoutMs =
      Number.isFinite(parsedTimeout) && parsedTimeout > 0
        ? parsedTimeout
        : DEFAULT_CONFIG.requestTimeoutMs;

    return { requestTimeoutMs };
  } catch (error) {
    console.warn(`Failed to load internal config (${filePath}):`, error);
    return DEFAULT_CONFIG;
  }
}
