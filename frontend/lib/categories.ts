export interface CategoryOption {
  value: string;
  label: string;
  description: string;
}

export const CATEGORIES: readonly CategoryOption[] = [
  {
    value: "waste",
    label: "Waste & Cleanliness",
    description: "Garbage, overflowing bins, illegal dumps, street cleaning."
  },
  {
    value: "roads",
    label: "Roads & Traffic",
    description: "Damaged roads, sidewalks, parking, traffic signs or signals."
  },
  {
    value: "lighting",
    label: "Street Lighting",
    description: "Broken lamps, dark streets, flashing or unstable lights."
  },
  {
    value: "water",
    label: "Water & Drainage",
    description: "Leaks, flooded areas, blocked drains, sewage issues."
  },
  {
    value: "safety",
    label: "Public Safety & Noise",
    description: "Dangerous situations, accidents, noise, unsafe areas."
  },
  {
    value: "property",
    label: "Public Property",
    description: "Municipal buildings, public furniture, monuments."
  },
  {
    value: "parks",
    label: "Parks & Green Spaces",
    description: "Parks, gardens, trees, green areas maintenance."
  },
  {
    value: "other",
    label: "Other",
    description: "Anything that does not fit in the other categories."
  }
] as const;

export type CategoryValue = typeof CATEGORIES[number]["value"];

export const getCategoryLabel = (value: string): string => {
  const cat = CATEGORIES.find(c => c.value === value);
  return cat ? cat.label : value;
};

export const getCategoryDescription = (value: string): string => {
  const cat = CATEGORIES.find(c => c.value === value);
  return cat ? cat.description : "";
};

export const categoryOptions = CATEGORIES.map(cat => ({
  value: cat.value,
  label: cat.label
}));

export const categoryLabels = Object.fromEntries(
  categoryOptions.map(opt => [opt.value, opt.label])
);

