/** TimeSense design tokens from screen-flow UX board. */

export const colors = {
  crust: '#D98A3D',
  crustDark: '#B5691F',
  sauce: '#C1442D',
  cheese: '#FFE29B',
  basil: '#4B7A4C',
  board: '#241A14',
  boardLight: '#332419',
  plate: '#FBF5E9',
  cream: '#FFF8EC',
  ink: '#241A14',
  muted: '#8A7561',
  border: '#E7D9C3',
  cardBorder: '#EFE2CC',
  insightCard: '#F3ECD8',
} as const;

export const fonts = {
  display: 'Fraunces_700Bold',
  displayBlack: 'Fraunces_900Black',
  displaySemi: 'Fraunces_600SemiBold',
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodySemi: 'Inter_600SemiBold',
  bodyBold: 'Inter_700Bold',
  mono: 'Inter_500Medium',
} as const;

/** Wireframe labels → stored VisualStyle */
export const STYLE_OPTIONS = [
  { label: 'Radial', value: 'pizza' as const, icon: 'chart-donut' as const },
  { label: 'Pizza', value: 'pie' as const, icon: 'pizza' as const },
  { label: 'Plant', value: 'plant' as const, icon: 'sprout' as const },
  {
    label: 'Moon',
    value: 'moon' as const,
    icon: 'moon-waning-crescent' as const,
  },
  { label: 'Monk', value: 'monk' as const, icon: 'meditation' as const },
  { label: 'Cat', value: 'cat' as const, icon: 'cat' as const },
];

export const CATEGORY_OPTIONS = [
  { label: 'Chores', value: 'chores' as const },
  { label: 'Work', value: 'work' as const },
  { label: 'Study', value: 'study' as const },
  { label: 'Other', value: 'other' as const },
];
