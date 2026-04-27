export interface Ingredient {
  name: string;
  amount: string;
  unit: string;
}

export interface RecipeModel {
  id?: number;
  url?: string;
  title: string;
  category: string;
  ingredients?: Ingredient[];
  data: object;
}