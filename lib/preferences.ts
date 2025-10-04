import { z } from 'zod';
import { PreferenceSetSchema, PreferenceSet, createDefaultPreferences } from '@/lib/models/proposal';

const PREFERENCES_KEY = 'schedule-assistant-preferences';

/**
 * Simple wrapper to persist and validate preferences via Zod using localStorage
 */
export class PreferencesManager {
  /**
   * Load preferences from localStorage, returning defaults if not found or invalid
   */
  static load(): PreferenceSet {
    try {
      if (typeof localStorage === 'undefined') {
        // Server-side or environment without localStorage
        return createDefaultPreferences();
      }

      const stored = localStorage.getItem(PREFERENCES_KEY);
      if (!stored) {
        return createDefaultPreferences();
      }

      const parsed = JSON.parse(stored);
      return PreferenceSetSchema.parse(parsed);
    } catch (error) {
      console.warn('Failed to load preferences from localStorage, using defaults:', error);
      return createDefaultPreferences();
    }
  }

  /**
   * Save preferences to localStorage with validation
   */
  static save(preferences: PreferenceSet): void {
    try {
      if (typeof localStorage === 'undefined') {
        console.warn('localStorage not available, cannot persist preferences');
        return;
      }

      // Validate before saving
      const validated = PreferenceSetSchema.parse(preferences);
      localStorage.setItem(PREFERENCES_KEY, JSON.stringify(validated));
    } catch (error) {
      console.error('Failed to save preferences to localStorage:', error);
      throw new Error('Invalid preferences data');
    }
  }

  /**
   * Update specific preference fields while preserving others
   */
  static update(updates: Partial<PreferenceSet>): PreferenceSet {
    const current = this.load();
    const updated = { ...current, ...updates };
    this.save(updated);
    return updated;
  }

  /**
   * Clear preferences from localStorage (resets to defaults on next load)
   */
  static clear(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(PREFERENCES_KEY);
      }
    } catch (error) {
      console.error('Failed to clear preferences from localStorage:', error);
    }
  }

  /**
   * Check if preferences exist in localStorage
   */
  static exists(): boolean {
    try {
      if (typeof localStorage === 'undefined') {
        return false;
      }
      return localStorage.getItem(PREFERENCES_KEY) !== null;
    } catch (error) {
      return false;
    }
  }
}