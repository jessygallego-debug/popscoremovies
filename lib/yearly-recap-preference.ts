export const DEFAULT_YEARLY_RECAP_PREFERENCE = true;

export function resolveYearlyRecapPreference(
  preference: boolean | null | undefined
) {
  return preference !== false;
}
