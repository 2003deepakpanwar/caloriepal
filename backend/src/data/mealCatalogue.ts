export type DietTag = 'vegetarian' | 'non_vegetarian';
export type IntensityTag = 'light' | 'medium' | 'heavy';
export type FeatureTag = 'high_protein' | 'indian' | 'quick' | 'low_carb';

export interface Meal {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  tags: Array<DietTag | IntensityTag | FeatureTag>;
}

export const MEAL_CATALOGUE: Meal[] = [
  { id: 'dal-rice-curd', name: 'Dal + Rice + Curd', calories: 550, protein: 20, carbs: 85, fats: 8, tags: ['vegetarian', 'medium', 'indian'] },
  { id: 'paneer-rice-bowl', name: 'Paneer Rice Bowl', calories: 650, protein: 30, carbs: 70, fats: 22, tags: ['vegetarian', 'medium', 'high_protein', 'indian'] },
  { id: 'roti-sabzi', name: '2 Rotis + Mixed Vegetable Sabzi', calories: 500, protein: 16, carbs: 70, fats: 15, tags: ['vegetarian', 'medium', 'indian'] },
  { id: 'roti-paneer', name: '2 Rotis + Paneer Bhurji', calories: 600, protein: 28, carbs: 55, fats: 25, tags: ['vegetarian', 'medium', 'high_protein', 'indian'] },
  { id: 'khichdi', name: 'Vegetable Khichdi (bowl)', calories: 450, protein: 15, carbs: 70, fats: 10, tags: ['vegetarian', 'light', 'indian', 'quick'] },
  { id: 'idli-sambar', name: '3 Idlis + Sambar', calories: 400, protein: 14, carbs: 70, fats: 6, tags: ['vegetarian', 'light', 'indian'] },
  { id: 'rajma-chawal', name: 'Rajma + Rice', calories: 600, protein: 22, carbs: 95, fats: 10, tags: ['vegetarian', 'medium', 'indian'] },
  { id: 'chole-bhature', name: 'Chole Bhature', calories: 800, protein: 25, carbs: 100, fats: 30, tags: ['vegetarian', 'heavy', 'indian'] },
  { id: 'paneer-tikka', name: 'Paneer Tikka Plate + Salad', calories: 500, protein: 35, carbs: 20, fats: 28, tags: ['vegetarian', 'medium', 'high_protein', 'low_carb'] },
  { id: 'oats-milk-banana', name: 'Oats with Milk + Banana', calories: 350, protein: 12, carbs: 55, fats: 7, tags: ['vegetarian', 'light', 'quick'] },
  { id: 'yogurt-bowl', name: 'Greek Yogurt + Nuts + Fruit', calories: 300, protein: 20, carbs: 25, fats: 10, tags: ['vegetarian', 'light', 'high_protein', 'quick'] },
  { id: 'veg-soup-salad', name: 'Vegetable Soup + Salad', calories: 250, protein: 10, carbs: 25, fats: 8, tags: ['vegetarian', 'light', 'low_carb', 'quick'] },
  { id: 'egg-roti', name: '2 Egg Bhurji + 2 Rotis', calories: 550, protein: 30, carbs: 55, fats: 20, tags: ['non_vegetarian', 'medium', 'high_protein', 'indian'] },
  { id: 'grilled-chicken-veg', name: 'Grilled Chicken + Steamed Vegetables', calories: 550, protein: 45, carbs: 20, fats: 22, tags: ['non_vegetarian', 'medium', 'high_protein', 'low_carb'] },
  { id: 'chicken-biryani', name: 'Chicken Biryani (plate)', calories: 700, protein: 35, carbs: 85, fats: 22, tags: ['non_vegetarian', 'heavy', 'high_protein', 'indian'] },
  { id: 'fish-rice', name: 'Grilled Fish + Rice', calories: 500, protein: 35, carbs: 55, fats: 12, tags: ['non_vegetarian', 'medium', 'high_protein'] },
];
