import { watch } from 'fs';
import { readFile } from 'fs/promises';
import { type Settings, DEFAULT } from './lib/ToolSettings';
import { TOOL_SETTINGS_PATH } from './server/settings';

let ToolSettings: Settings = DEFAULT;

export function getSettings(): Settings {
  return ToolSettings;
}

async function loadSettingsFromFile(filePath: string): Promise<Settings> {
  try {
    const fileContents = await readFile(filePath, 'utf-8');
    const jsonData = JSON.parse(fileContents);
    // console.log('Settings loaded:', jsonData);
    return { ...DEFAULT, ...jsonData };
  } catch (error) {
    console.error('Error reading settings file:', error);
    return DEFAULT;
  }
}

export async function watchSettings() {
  const settingsPath = TOOL_SETTINGS_PATH;
  ToolSettings = await loadSettingsFromFile(settingsPath);
  console.log('Watching settings file:', settingsPath);
  const settings = watch(
    settingsPath,
    { persistent: true },
    async (eventType, filename) => {
      // FIXME: double invocation of this callback
      console.log('watchSettings event:', eventType, filename);
      // if (!filename) {
      //   ToolSettings = DEFAULT; // Reset to default if no filename is provided
      //   console.log('Settings file has been reset to default.');
      //   return;
      // }
      // TODO use filename and eventType to determine if we need to reload settings
      ToolSettings = await loadSettingsFromFile(TOOL_SETTINGS_PATH);
    }
  );
  return () => settings.close();
}
