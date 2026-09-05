/** Config for static-image timer themes — see docs/concepts/feature-static-theme-images.md. */

export type StaticThemeConfig = {
  id: string;
  /** `require()` result for the theme's illustrated image. */
  imageSource: number;
  /** Saturation % target during the "got distracted" dip. Default 40. */
  distractDesatTargetPct?: number;
  /** Total duration of the desaturate-and-recover cue, ms. Default 800. */
  distractCueMs?: number;
};

// pizza maps to the `pizza` VisualStyle (the default "Eating Pizza" style) — not `pie`,
// which keeps its original EatingPizza SVG rendering since no separate asset exists for it.
export const pizzaTheme: StaticThemeConfig = {
  id: 'pizza',
  imageSource: require('../assets/timer-themes/pizza/pizza.png'),
  distractDesatTargetPct: 40,
  distractCueMs: 800,
};

export const plantTheme: StaticThemeConfig = {
  id: 'plant',
  imageSource: require('../assets/timer-themes/plant/plant.png'),
  distractDesatTargetPct: 40,
  distractCueMs: 800,
};

export const monkTheme: StaticThemeConfig = {
  id: 'monk',
  imageSource: require('../assets/timer-themes/monk/monk.png'),
  distractDesatTargetPct: 40,
  distractCueMs: 800,
};

export const catTheme: StaticThemeConfig = {
  id: 'cat',
  imageSource: require('../assets/timer-themes/cat/cat.png'),
  distractDesatTargetPct: 40,
  distractCueMs: 800,
};

export const moonTheme: StaticThemeConfig = {
  id: 'moon',
  imageSource: require('../assets/timer-themes/moon/moon.png'),
  distractDesatTargetPct: 40,
  distractCueMs: 800,
};

export const staticThemes: Record<string, StaticThemeConfig> = {
  pizza: pizzaTheme,
  plant: plantTheme,
  monk: monkTheme,
  cat: catTheme,
  moon: moonTheme,
};

/** Static-image styles get the full-screen immersive layout — see feature-fullscreen-immersive-timer.md. */
export function isStaticImageStyle(style: string): boolean {
  return style in staticThemes;
}
