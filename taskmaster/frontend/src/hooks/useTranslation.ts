import { useSettingsStore } from '@/stores/settings.store';
import { getTranslation, TranslationKeys } from '@/lib/translations';

export function useTranslation(): TranslationKeys {
  const { language } = useSettingsStore();
  return getTranslation(language);
}
