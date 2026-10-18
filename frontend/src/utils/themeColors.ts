import { ApplicationSettings } from '../types.ts';

/**
 * Dynamically applies branding & theme color variables to the root document
 */
export function applyThemeColors(settings?: Partial<ApplicationSettings> | null): void {
  if (typeof document === 'undefined' || !settings) return;
  
  const root = document.documentElement;
  
  if (settings.topbarColor) {
    root.style.setProperty('--theme-topbar', settings.topbarColor);
    root.style.setProperty('--color-topbar', settings.topbarColor);
  }
  if (settings.primaryColor) {
    root.style.setProperty('--theme-primary', settings.primaryColor);
    root.style.setProperty('--color-primary', settings.primaryColor);
  }
  if (settings.secondaryColor) {
    root.style.setProperty('--theme-secondary', settings.secondaryColor);
    root.style.setProperty('--color-secondary', settings.secondaryColor);
  }
  if (settings.accentColor) {
    root.style.setProperty('--theme-accent', settings.accentColor);
    root.style.setProperty('--color-accent', settings.accentColor);
  }
}
