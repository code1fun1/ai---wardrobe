export interface Clothing {
  id: string;
  filename: string;
  originalName: string;
  aiTags: string[];
  manualTags: string[];
  category: string;
  color: string;
  occasion: string[];
  dateAdded: Date;
  userPreferences: {
    liked: boolean | null;
    disliked: boolean | null;
  };
}

export interface Outfit {
  id: string;
  items: Clothing[];
  dateRecommended: Date;
  occasion: string;
  userFeedback: {
    liked: boolean | null;
    worn: boolean;
  };
}

export interface UserPreference {
  dislikedCombinations: string[][];
  preferredColors: string[];
  occasionPreferences: {
    festive: string[];
    outing: string[];
    professional: string[];
  };
}

export interface HinduDayColors {
  day: string;
  colors: string[];
}
