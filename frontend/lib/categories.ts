import i18n from 'i18next';

export interface CategoryOption {
  value: string;
  label: string;
  description: string;
}

export const CATEGORIES: readonly CategoryOption[] = [
  {
    value: 'waste',
    label: 'Waste & Cleanliness',
    description: 'Garbage, overflowing bins, illegal dumps, street cleaning.',
  },
  {
    value: 'roads',
    label: 'Roads & Traffic',
    description: 'Damaged roads, sidewalks, parking, traffic signs or signals.',
  },
  {
    value: 'lighting',
    label: 'Street Lighting',
    description: 'Broken lamps, dark streets, flashing or unstable lights.',
  },
  {
    value: 'water',
    label: 'Water & Drainage',
    description: 'Leaks, flooded areas, blocked drains, sewage issues.',
  },
  {
    value: 'safety',
    label: 'Public Safety & Noise',
    description: 'Dangerous situations, accidents, noise, unsafe areas.',
  },
  {
    value: 'property',
    label: 'Public Property',
    description: 'Municipal buildings, public furniture, monuments.',
  },
  {
    value: 'parks',
    label: 'Parks & Green Spaces',
    description: 'Parks, gardens, trees, green areas maintenance.',
  },
  {
    value: 'other',
    label: 'Other',
    description: 'Anything that does not fit in the other categories.',
  },
] as const;

export type CategoryValue = (typeof CATEGORIES)[number]['value'];

// Mapping from French department names to translation keys
const DEPT_NAME_TO_KEY: Record<string, string> = {
  'Déchets et Propreté': 'waste',
  'Routes et Circulation': 'roads',
  'Éclairage public': 'lighting',
  'Eau et Drainage': 'water',
  'Sécurité et Bruit': 'safety',
  'Propriété publique': 'property',
  'Parcs et Espaces verts': 'parks',
  'Services Généraux': 'other',
  // English fallbacks (in case DB language changes)
  'Waste & Cleanliness': 'waste',
  'Roads & Traffic': 'roads',
  'Street Lighting': 'lighting',
  'Water & Drainage': 'water',
  'Public Safety & Noise': 'safety',
  'Public Property': 'property',
  'Parks & Green Spaces': 'parks',
  'General Services': 'other',
};

/**
 * Get translated department name from stored French/English name or categoryKey.
 * Falls back to original name if not found or translation unavailable.
 */
export function getDepartmentLabel(
  dept: string | undefined | null | { name?: string; categoryKey?: string }
): string {
  if (!dept) return '';
  
  // Handle department object with categoryKey
  if (typeof dept === 'object') {
    const { categoryKey, name } = dept;
    if (categoryKey) {
      try {
        const translated = i18n.t(`departments.${categoryKey}`, { defaultValue: name });
        return translated;
      } catch {
        return name || '';
      }
    }
    // Fallback to name if no categoryKey
    dept = name;
  }
  
  // Handle department name string
  if (typeof dept === 'string') {
    const key = DEPT_NAME_TO_KEY[dept];
    if (!key) return dept;
    try {
      const translated = i18n.t(`departments.${key}`, { defaultValue: dept });
      return translated;
    } catch {
      return dept;
    }
  }
  
  return '';
}

/**
 * Get translated category label using i18n.
 */
export function getCategoryLabel(value: string): string {
  const cat = CATEGORIES.find((c) => c.value === value);
  if (!cat) return value;
  try {
    const translated = i18n.t(`categories.${value}`, {
      defaultValue: cat.label,
    });
    return translated;
  } catch {
    return cat.label;
  }
}

export const categoryOptions = CATEGORIES.map((cat) => ({
  value: cat.value,
  label: cat.label,
}));

export const categoryLabels = Object.fromEntries(
  categoryOptions.map((opt) => [opt.value, opt.label])
);
