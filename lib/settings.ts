import AsyncStorage from '@react-native-async-storage/async-storage';

import type { VisualStyle } from '@/types/task';

const DEFAULT_STYLE_KEY = 'timesense.settings.default_visual_style';
const SOUND_HAPTICS_KEY = 'timesense.settings.sound_haptics';

export async function getDefaultVisualStyle(): Promise<VisualStyle> {
  const raw = await AsyncStorage.getItem(DEFAULT_STYLE_KEY);
  if (
    raw === 'pizza' ||
    raw === 'pie' ||
    raw === 'plant' ||
    raw === 'moon' ||
    raw === 'monk' ||
    raw === 'cat' ||
    raw === 'ring' ||
    raw === 'bar'
  ) {
    return raw;
  }
  return 'pizza';
}

export async function setDefaultVisualStyle(style: VisualStyle): Promise<void> {
  await AsyncStorage.setItem(DEFAULT_STYLE_KEY, style);
}

export async function getSoundHapticsEnabled(): Promise<boolean> {
  const raw = await AsyncStorage.getItem(SOUND_HAPTICS_KEY);
  if (raw == null) return true;
  return raw === '1';
}

export async function setSoundHapticsEnabled(on: boolean): Promise<void> {
  await AsyncStorage.setItem(SOUND_HAPTICS_KEY, on ? '1' : '0');
}
