import { useColorScheme as useColorSchemeCore } from 'react-native';

/** Always returns a concrete scheme so `Colors[scheme]` never indexes null. */
export function useColorScheme(): 'light' | 'dark' {
  const coreScheme = useColorSchemeCore();
  return coreScheme === 'dark' ? 'dark' : 'light';
}
