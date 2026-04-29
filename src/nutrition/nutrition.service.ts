import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { IngredientNutrition } from './ingredient-nutrition.entity';
import { Recipe } from '../recipes/recipe.entity';

interface NutritionMacros {
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  fiber: number;
  sugar: number;
  sodium: number;
  cholesterol: number;
}

export interface NutritionResult extends NutritionMacros {
  servings: number | null;
  perServing: NutritionMacros | null;
  calculatedAt: string;
}

interface CalorieNinjasItem {
  calories: number;
  serving_size_g: number;
  fat_total_g: number;
  protein_g: number;
  sodium_mg: number;
  cholesterol_mg: number;
  carbohydrates_total_g: number;
  fiber_g: number;
  sugar_g: number;
}

// volume units map to 'g' — treat liquids as density=1 (1ml≈1g); CalorieNinjas
// cannot reliably parse sub-100ml quantities so we always query "100g X"
const UNIT_MAP: Record<string, string> = {
  g: 'g', gr: 'g', gram: 'g', grams: 'g', kg: 'g', mg: 'g', dkg: 'g',
  ml: 'g', milliliter: 'g', millilitre: 'g',
  dl: 'g', deciliter: 'g', decilitre: 'g',
  l: 'g', liter: 'g', litre: 'g',
  tbsp: 'tbsp', tablespoon: 'tbsp', tablespoons: 'tbsp', 'evőkanál': 'tbsp', ek: 'tbsp',
  tsp: 'tsp', teaspoon: 'tsp', teaspoons: 'tsp',
  'kávéskanál': 'tsp', 'teáskanál': 'tsp', kk: 'tsp', mk: 'tsp',
  cup: 'cup', cups: 'cup', 'csésze': 'cup',
  oz: 'oz', ounce: 'oz', ounces: 'oz',
  lb: 'lb', lbs: 'lb', pound: 'lb', pounds: 'lb',
};

// If CalorieNinjas returns a serving_size_g larger than these limits the query
// was misidentified (e.g. "1 tbsp flour" matched as "1 cup") — fall back to
// standard culinary gram weights instead.
const UNIT_MAX_G: Record<string, number> = { tbsp: 20, tsp: 8 };
const UNIT_DEFAULT_G: Record<string, number> = { tbsp: 15, tsp: 5 };

function normalizeUnit(unit: string): string {
  return UNIT_MAP[unit.toLowerCase().trim()] ?? 'piece';
}

function toGrams(amount: number, rawUnit: string): number {
  const u = rawUnit.toLowerCase().trim();
  if (u === 'kg') return amount * 1000;
  if (u === 'dkg') return amount * 10;
  if (u === 'mg') return amount / 1000;
  if (u === 'dl') return amount * 100;
  if (u === 'l' || u === 'liter' || u === 'litre') return amount * 1000;
  return amount; // g / ml / gr and variants → 1:1
}

// All nutrition in cache is stored per-100 g.
// For 'g'  units: scale = ingredient_grams / 100
// For rest: scale = (amount × gramsPerUnit) / 100
function computeScale(
  amount: string,
  rawUnit: string,
  cacheUnit: string,
  gramsPerUnit: number,
): number {
  const n = parseFloat(amount) || 1;
  if (cacheUnit === 'g') return toGrams(n, rawUnit) / 100;
  return (n * gramsPerUnit) / 100;
}

function r2(n: number): number {
  return Math.round(n * 100) / 100;
}

function scaleNutrition(base: NutritionMacros, scale: number): NutritionMacros {
  return {
    calories: r2(base.calories * scale),
    protein: r2(base.protein * scale),
    fat: r2(base.fat * scale),
    carbs: r2(base.carbs * scale),
    fiber: r2(base.fiber * scale),
    sugar: r2(base.sugar * scale),
    sodium: r2(base.sodium * scale),
    cholesterol: r2(base.cholesterol * scale),
  };
}

function sumNutrition(items: NutritionMacros[]): NutritionMacros {
  return items.reduce(
    (acc, cur) => ({
      calories: r2(acc.calories + cur.calories),
      protein: r2(acc.protein + cur.protein),
      fat: r2(acc.fat + cur.fat),
      carbs: r2(acc.carbs + cur.carbs),
      fiber: r2(acc.fiber + cur.fiber),
      sugar: r2(acc.sugar + cur.sugar),
      sodium: r2(acc.sodium + cur.sodium),
      cholesterol: r2(acc.cholesterol + cur.cholesterol),
    }),
    { calories: 0, protein: 0, fat: 0, carbs: 0, fiber: 0, sugar: 0, sodium: 0, cholesterol: 0 },
  );
}

@Injectable()
export class NutritionService {
  private readonly anthropic: Anthropic;

  constructor(
    @InjectRepository(IngredientNutrition)
    private readonly nutritionRepo: Repository<IngredientNutrition>,
    @InjectRepository(Recipe)
    private readonly recipeRepo: Repository<Recipe>,
    private readonly config: ConfigService,
  ) {
    this.anthropic = new Anthropic({ apiKey: config.get<string>('ANTHROPIC_API_KEY') });
  }

  async calculateForRecipe(recipeId: number): Promise<NutritionResult> {
    const recipe = await this.recipeRepo.findOneBy({ id: recipeId });
    if (!recipe) throw new NotFoundException('Recipe not found');

    const data = (recipe.data ?? {}) as Record<string, unknown>;
    const ingredients: { name: string; amount: string; unit: string }[] =
      recipe.ingredients ??
      (data.ingredients as { name: string; amount: string; unit: string }[]) ??
      [];

    if (ingredients.length === 0) throw new ForbiddenException('No ingredients to calculate');

    const translations = await this.translateNames(ingredients.map(i => i.name));

    const contributions: NutritionMacros[] = [];
    for (const ing of ingredients) {
      const nameEn = (translations[ing.name] ?? ing.name).toLowerCase();
      const cacheUnit = normalizeUnit(ing.unit ?? '');

      let cached = await this.nutritionRepo.findOne({
        where: { name_en: nameEn, unit: cacheUnit },
      });

      if (!cached) {
        const fetched = await this.fetchFromApi(nameEn, cacheUnit);
        if (!fetched) continue;
        try {
          cached = await this.nutritionRepo.save({
            name_en: nameEn,
            name_hu: ing.name.toLowerCase() !== nameEn ? ing.name.toLowerCase() : null,
            unit: cacheUnit,
            grams_per_unit: fetched.gramsPerUnit,
            ...fetched.nutrition,
          });
        } catch {
          cached = await this.nutritionRepo.findOne({ where: { name_en: nameEn, unit: cacheUnit } });
          if (!cached) continue;
        }
      }

      const base: NutritionMacros = {
        calories: cached.calories, protein: cached.protein, fat: cached.fat,
        carbs: cached.carbs, fiber: cached.fiber, sugar: cached.sugar,
        sodium: cached.sodium, cholesterol: cached.cholesterol,
      };
      contributions.push(
        scaleNutrition(base, computeScale(ing.amount, ing.unit ?? '', cacheUnit, cached.grams_per_unit)),
      );
    }

    const total = sumNutrition(contributions);
    const servings = parseFloat((data.servings as string) ?? '') || null;
    const perServing = servings && servings > 0 ? scaleNutrition(total, 1 / servings) : null;

    const result: NutritionResult = {
      ...total,
      servings,
      perServing,
      calculatedAt: new Date().toISOString().split('T')[0],
    };

    await this.recipeRepo.update(recipeId, { data: { ...data, nutrition: result } });
    return result;
  }

  private async translateNames(names: string[]): Promise<Record<string, string>> {
    const unique = [...new Set(names)];
    try {
      const res = await this.anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 512,
        messages: [{
          role: 'user',
          content: `Translate these food ingredient names to standard English culinary terms.
Return ONLY a JSON object mapping each input to its English equivalent.
If already English, return it unchanged. Use simple common terms (e.g. "paradicsom" → "tomato").
Input: ${JSON.stringify(unique)}`,
        }],
      });
      const text = res.content[0]?.type === 'text' ? res.content[0].text : '';
      const match = text.match(/\{[\s\S]*\}/);
      if (match) return JSON.parse(match[0]);
    } catch { /* fall through */ }
    return Object.fromEntries(unique.map(n => [n, n]));
  }

  private async fetchFromApi(
    nameEn: string,
    cacheUnit: string,
  ): Promise<{ nutrition: NutritionMacros; gramsPerUnit: number } | null> {
    const apiKey = this.config.get<string>('CALORIE_NINJAS_API_KEY');
    if (!apiKey) return null;

    const query = cacheUnit === 'g' ? `100g ${nameEn}` : `1 ${cacheUnit} ${nameEn}`;
    try {
      const res = await fetch(
        `https://api.calorieninjas.com/v1/nutrition?query=${encodeURIComponent(query)}`,
        { headers: { 'X-Api-Key': apiKey } },
      );
      const json = await res.json() as { items: CalorieNinjasItem[] };
      const item = json.items?.[0];
      if (!item) return null;

      const servingG = item.serving_size_g || 100;

      // Normalize to per-100g regardless of what CalorieNinjas returned
      const factor = 100 / servingG;
      const nutrition: NutritionMacros = {
        calories: r2(item.calories * factor),
        protein: r2(item.protein_g * factor),
        fat: r2(item.fat_total_g * factor),
        carbs: r2(item.carbohydrates_total_g * factor),
        fiber: r2((item.fiber_g ?? 0) * factor),
        sugar: r2((item.sugar_g ?? 0) * factor),
        sodium: r2((item.sodium_mg ?? 0) * factor),
        cholesterol: r2((item.cholesterol_mg ?? 0) * factor),
      };

      // gramsPerUnit: for 'g' always 100; for others use serving_size_g but cap
      // small units to detect when CalorieNinjas misidentified the serving
      let gramsPerUnit: number;
      if (cacheUnit === 'g') {
        gramsPerUnit = 100;
      } else {
        const maxG = UNIT_MAX_G[cacheUnit];
        gramsPerUnit = maxG && servingG > maxG
          ? (UNIT_DEFAULT_G[cacheUnit] ?? servingG)
          : servingG;
      }

      return { nutrition, gramsPerUnit };
    } catch {
      return null;
    }
  }
}
