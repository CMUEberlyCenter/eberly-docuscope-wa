import { enhance } from '@universal-middleware/core';
import { watch } from 'fs';
import { readFile } from 'fs/promises';
import { DEFAULT, type Settings } from '../lib/ToolSettings';
import { logger } from './logger';
import { TOOL_SETTINGS_PATH } from './settings';

let ToolSettings: Settings | null = null;

/** Gets the site wide settings. */
export async function getSettings(
  settingsPath = TOOL_SETTINGS_PATH
): Promise<Settings> {
  if (!ToolSettings) {
    logger.warn('ToolSettings not loaded yet, loading from file...');
    ToolSettings = await loadSettingsFromFile(settingsPath);
  }
  return ToolSettings;
}

async function loadSettingsFromFile(filePath: string): Promise<Settings> {
  try {
    const fileContents = await readFile(filePath, 'utf-8');
    const jsonData = JSON.parse(fileContents);
    return { ...DEFAULT, ...jsonData };
  } catch (error) {
    logger.error('Error reading settings file:', error);
    return DEFAULT;
  }
}

/** Sets up file watching for settings file changes. */
export async function watchSettings(settingsPath = TOOL_SETTINGS_PATH) {
  ToolSettings = await loadSettingsFromFile(settingsPath);
  logger.info(`Watching settings file: ${settingsPath}`);
  const settings = watch(
    settingsPath,
    { persistent: true },
    async (eventType, filename) => {
      // FIXME: double invocation of this callback
      logger.debug(`watchSettings event: ${eventType} ${filename}`);
      // TODO use filename and eventType to determine if we need to reload settings
      ToolSettings = await loadSettingsFromFile(settingsPath);
    }
  );
  return () => settings.close();
}

export const toolSettingsMiddleware = enhance(
  async (_request, context, _runtime) => {
    const settings = await getSettings();
    return { ...context, settings };
  },
  {
    name: 'myprose:toolSettingsMiddleware',
  }
);
