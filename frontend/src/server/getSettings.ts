import { watch } from 'fs';
import { readFile } from 'fs/promises';
import { type Settings, DEFAULT } from '../lib/ToolSettings';
import { logger } from './logger';
import { TOOL_SETTINGS_PATH } from './settings';

let ToolSettings: Settings = DEFAULT;

export function getSettings(): Settings {
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

export async function watchSettings(settingsPath = TOOL_SETTINGS_PATH) {
  ToolSettings = await loadSettingsFromFile(settingsPath);
  logger.info(`Watching settings file: ${settingsPath}`);
  const settings = watch(
    settingsPath,
    { persistent: true },
    async (eventType, filename) => {
      // FIXME: double invocation of this callback
      logger.debug(`watchSettings event: ${eventType} ${filename}`);
      // if (!filename) {
      //   ToolSettings = DEFAULT; // Reset to default if no filename is provided
      //   console.log('Settings file has been reset to default.');
      //   return;
      // }
      // TODO use filename and eventType to determine if we need to reload settings
      ToolSettings = await loadSettingsFromFile(settingsPath);
    }
  );
  return () => settings.close();
}
