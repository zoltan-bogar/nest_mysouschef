import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

//import $ from 'cheerio';
import cheerio from 'cheerio';

const CACHE_TTL_SECONDS = 60 * 60; // 1 hour

@Injectable()
export class CrawlerService implements OnModuleInit, OnModuleDestroy {
  private redis: Redis;
  private recipeData: Object = {};

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const url = this.config.get<string>('REDIS_URL');
    this.redis = url
      ? new Redis(url, { tls: url.startsWith('rediss://') ? {} : undefined })
      : new Redis({
          host: this.config.get<string>('REDIS_HOST', 'localhost'),
          port: this.config.get<number>('REDIS_PORT', 6379),
        });
  }

  onModuleDestroy() {
    this.redis.quit();
  }

  public async crawl({ url }) /*: RecipeModel*/ {
    const cached = await this.redis.get(url);
    if (cached) return JSON.parse(cached);

    this.recipeData = {};
    await fetch(url)
      .then((result) => result.text())
      .then((html) => {
        const ch = cheerio.load(html);
        const title =
          ch('meta[property="og:title"]').attr('content') ||
          ch('title').text() ||
          ch('meta[name="title"]').attr('content');
        const description =
          ch('meta[property="og:description"]').attr('content') ||
          ch('meta[name="description"]').attr('content');
        const url = ch('meta[property="og:url"]').attr('content');
        const site_name = ch('meta[property="og:site_name"]').attr('content');
        const image =
          ch('meta[property="og:image"]').attr('content') ||
          ch('meta[property="og:image:url"]').attr('content');
        const icon =
          ch('link[rel="icon"]').attr('href') ||
          ch('link[rel="shortcut icon"]').attr('href');
        const keywords =
          ch('meta[property="og:keywords"]').attr('content') ||
          ch('meta[name="keywords"]').attr('content');

        const ldRecipe = this.extractJsonLdRecipe(ch);

        this.recipeData = {
          ...this.recipeData,
          title: this.getRecipeTitle(html),
          time: this.getRecipeTimes(html, ch),
          imgSrc: image,
          url: url,
          keywords: keywords,
          siteName: site_name,
          description: description?.trim(),
          instructions: ldRecipe?.instructions ?? this.getRecipeDirections(html),
          source: ldRecipe?.author ?? this.getRecipeAuthor(html),
          servings: ldRecipe?.servings ?? this.getRecipeServing(html),
          ingredients: ldRecipe?.ingredients ?? this.getRecipeIngredients(html),
        };
      })
      .catch((error) => {
        console.log(error);
      });

    if (Object.keys(this.recipeData).length > 0) {
      await this.redis.setex(url, CACHE_TTL_SECONDS, JSON.stringify(this.recipeData));
    }

    return this.recipeData;
  }

  private extractJsonLdRecipe(ch: ReturnType<typeof cheerio.load>): {
    ingredients: {}[];
    instructions: string[];
    author: string;
    servings: string;
  } | null {
    let recipe: any = null;

    ch('script[type="application/ld+json"]').each((_, el) => {
      if (recipe) return;
      try {
        const data = JSON.parse(ch(el).html() || '');
        const candidates: any[] = Array.isArray(data)
          ? data
          : data['@graph']
            ? data['@graph']
            : [data];
        recipe = candidates.find((n: any) => n['@type'] === 'Recipe') ?? null;
      } catch {
        // ignore malformed blocks
      }
    });

    if (!recipe) return null;

    // ingredients
    const rawIngredients: string[] = Array.isArray(recipe.recipeIngredient)
      ? recipe.recipeIngredient
      : [];
    const ingredients = rawIngredients.map((item) => {
      const units = ['g','kg','ek','teáskanál','l','ml','cl','dl','dkg','tbsp','tsp','csipet','db','pcs','oz','floz','mk','fej','gerezd','csokor'];
      const parts = item.trim().split(/\s+/);
      let amount = '';
      let unit = '';
      const nameWords: string[] = [];
      let amountFound = false;
      let unitFound = false;

      for (const part of parts) {
        if (!amountFound && /^\d+([.,]\d+)?(-\d+)?$/.test(part)) {
          amount = part;
          amountFound = true;
        } else if (!unitFound && units.includes(part.toLowerCase())) {
          unit = part;
          unitFound = true;
        } else {
          nameWords.push(part);
        }
      }

      return { amount, unit, name: nameWords.join(' ') };
    });

    // instructions
    const rawInstructions = Array.isArray(recipe.recipeInstructions)
      ? recipe.recipeInstructions
      : [];
    const instructions = rawInstructions
      .map((step: any) =>
        typeof step === 'string' ? step : step.text ?? step.name ?? '',
      )
      .filter((s: string) => s.trim() !== '');

    // author
    const author =
      typeof recipe.author === 'string'
        ? recipe.author
        : recipe.author?.name ?? '';

    // servings
    const servings = recipe.recipeYield
      ? String(recipe.recipeYield)
      : '';

    return { ingredients, instructions, author, servings };
  }

  private getRecipeTitle(html): string {
    const titleSelectors = [
      '#article-title',
      '#article__title',
      '.article__title',
      '.article-title',
      'h1',
      '#title',
      '.title',
      "[class*='article-title']",
      "[class*='article__title']",
      "[class*='title']",
    ];

    let title = '';

    titleSelectors.every((selector) => {
      if (cheerio(selector, html).text()) {
        title = cheerio(selector, html).text();
        return false;
      }

      return true;
    });

    return title;
  }

  private getRecipeDirections(html): string[] {
    //most likely want the list items "li" inside instead of the wrapper
    const directionSelectors = [
      "[class*='recipe__directions'] li",

      '#recipe-direction',
      '#recipe-directions',
      '#recipe__direction',
      '#recipe__directions',
      '.recipe__direction',
      '.recipe__directions',
      '.recipe-direction',
      '.recipe-directions',
      '#direction',
      '#directions',
      '.direction',
      '.directions',
      "[class*='recipe-direction']",
      "[class*='recipe-directions']",
      "[class*='recipe__direction']",
      "[class*='recipe__directions']",
      "[class*='direction']",
      "[class*='directions']",

      '#recipe-instruction',
      '#recipe-instructions',
      '#recipe__instruction',
      '#recipe__instructions',
      '.recipe__instruction',
      '.recipe__instructions',
      '.recipe-instruction',
      '.recipe-instructions',
      '#instruction',
      '#instructions',
      '.instruction',
      '.instructions',
      "[class*='recipe-instruction']",
      "[class*='recipe-instructions']",
      "[class*='recipe__instruction']",
      "[class*='recipe__instructions']",
      "[class*='instruction']",
      "[class*='instructions']",
    ];

    let directions = '';

    directionSelectors.every((selector) => {
      if (cheerio(selector, html).text()) {
        directions = cheerio(selector, html).text();
        return false;
      }

      return true;
    });

    const arr_answers = directions.trim().split(/\n+/);

    //console.log(arr_answers);

    let foo = arr_answers.map(a => {
      return a.trim();
    })
    //console.log(bar);

    return foo.filter(n => n != null && n != "");
  }

  private getRecipeIngredients(html): {}[] {
    //most likely want the list items "li" inside instead of the wrapper
    const ingredientSelectors = [
      '#ingradientsBox li',
      '#shopingCart li',
      '.shopingCart li',
      '#shoppingCart li',
      '.shoppingCart li',
      '#recipe-ingredient li',
      '#recipe-ingredients li',
      '#recipe__ingredient li',
      '#recipe__ingredients li',
      '.recipe__ingredient li',
      '.recipe__ingredients li',
      '.recipe-ingredient li',
      '.recipe-ingredients li',
      '#ingredient li',
      '#ingredients li',
      '.ingredient li',
      '.ingredients li',
      "[class*='recipe-ingredient'] li",
      "[class*='recipe-ingredients'] li",
      "[class*='recipe__ingredient'] li",
      "[class*='recipe__ingredients'] li",
      "[class*='ingredient'] li",
      "[class*='ingredients'] li",
    ];

    let ingredients: string = '';
    let ingredientsArr: string[] = [];
    let ingredientsArrArr: {}[] = [];

    ingredientSelectors.every((selector) => {
      if (cheerio(selector, html).text()) {
        ingredients = cheerio(selector, html).text();
        return false;
      }

      return true;
    });
    //console.log(ingredients);
    ingredients = ingredients.replace(/\n+/g, '_ln_');
    ingredients = ingredients.replace(/\s+/g, ' ');
    ingredientsArr = ingredients.split('_ln_ _ln_ _ln_');

    ingredientsArr = ingredientsArr.map((item) => {
      let res = '';
      res = item.replaceAll('_ln_', ' ');
      res = res.replace(/\s+/g, ' ');
      res = res.trim();
      return res;
    });

    const units = [
      'g',
      'kg',
      'ek',
      'teáskanál',
      'l',
      'ml',
      'cl',
      'dl',
      'dkg',
      'tbsp',
      'tsp',
      'csipet',
      'db',
      'pcs',
      'oz',
      'floz',
    ];

    ingredientsArr = ingredientsArr.filter((n) => n);

    ingredientsArrArr = ingredientsArr.map((item) => {
      let result = {};
      const indexes = [];
      let unitFound = false;
      let amountFound = false;
      const arr = item.split(' ');

      arr.every((e) => {
        const idx = arr.indexOf(e);

        if (!isNaN(Number(e)) && !amountFound) {
          result = {
            ...result,
            amount: e,
          };
          if (idx !== -1) {
            indexes.push(idx);
          }
          amountFound = true;
          //return false;
        }

        if (units.includes(e) && !unitFound) {
          result = {
            ...result,
            unit: e,
          };

          if (idx !== -1) {
            indexes.push(idx);
          }
          unitFound = true;
          //return false;
        }

        return true;
      });

      for (let i = indexes.length - 1; i >= 0; i--) {
        arr.splice(indexes[i], 1);
      }

      //arrból kivenni az indexes
      //maradék a name

      result = {
        ...result,
        name: arr.join(' '),
      };

      //console.log(result);
      return result;
    });

    return ingredientsArrArr;
  }

  private getRecipeAuthor(html): string {
    const titleSelectors = [
      '#recipe-author-name',
      '#recipe-authorName',
      '#recipe__author-name',
      '#recipe__authorName',
      '.recipe__author-name',
      '.recipe__authorName',
      '.recipe-author-name',
      '.recipe-authorName',
      '#author-name',
      '#authorName',
      '.author-name',
      '.authorName',
      "[class*='recipe-author-name']",
      "[class*='recipe-authorName']",
      "[class*='recipe__author-name']",
      "[class*='recipe__authorName']",
      "[class*='authorName']",
      "[class*='author-name']",
      '#recipe-author',
      '#recipe__author',
      '.recipe__author',
      '.recipe-author',
      '#author',
      '.author',
      "[class*='recipe-author']",
      "[class*='recipe__author']",
      "[class*='author']",
    ];

    let author = '';

    titleSelectors.every((selector) => {
      if (cheerio(selector, html).text()) {
        author = cheerio(selector, html).text();
        return false;
      }

      return true;
    });

    return author.trim();
  }

  private getRecipeServing(html): string {
    const servingSelectors = ['#adag', '.adag', 'span.spritePortion + span'];

    let serving: string | string[] = '';

    servingSelectors.every((selector) => {
      if (cheerio(selector, html).text()) {
        serving = cheerio(selector, html).text();
        return false;
      } else if (cheerio(selector, html).val()) {
        serving = cheerio(selector, html).val();
        return false;
      }

      return true;
    });

    return typeof serving === 'string' ? serving.trim() : serving;
  }

  private getRecipeTimes(html, ch): string {
    const timesSelectors = [
      '.recipe__details .recipe__detailsBody.w-100 time',
      '.recipe__details .recipe__details-body.w-100 time',
      '.recipe-details .recipe-detailsBody.w-100 time',
      '.recipe-details .recipe-details-body.w-100 time',
      '.recipe__details time',
      '.recipe-details time',

      "[class*='recipe__details'] [class*='recipe__detailsBody'].w-100 time",
      "[class*='recipe__details'] [class*='recipe__details-body'].w-100 time",
      "[class*='recipe-details'] [class*='recipe-detailsBody'].w-100 time",
      "[class*='recipe-details'] [class*='recipe-details-body'].w-100 time",
      "[class*='recipe__details'] time",
      "[class*='recipe-details'] time",

      '#recipe-details time',
      '#recipe__details time',
      'article time',
    ];

    let times: string | string[] = '';
    let foo: string | string[] = '';

    timesSelectors.every((selector) => {
      if (cheerio(selector, html).text()) {
        times = cheerio(selector, html).text();
        foo = ch(selector)
          .map((i, e) => ch(e).text())
          .get();
        return false;
      } else if (cheerio(selector, html).val()) {
        times = cheerio(selector, html).val();
        foo = ch(selector)
          .map((i, e) => ch(e).val())
          .get();
        return false;
      }

      return true;
    });

    //console.log(foo);
    //console.log(times);

    return foo;
  }

  private getRecipeImage(html): string {
    console.log(cheerio('meta[property="og:image"]').attr('content'));
    if (cheerio('meta[property="og:image"]').attr('content')) {
      return cheerio('meta[property="og:image"]').attr('content');
    }

    const imageSelectors = [
      '#recipe__image',
      '#recipe-image',
      '.recipe__image',
      '.recipe-image',
      "[class*='recipe-image']",
      "[class*='recipe__image']",
      'article img',
      'body img',
    ];

    let imgSrc = '';

    imageSelectors.every((selector) => {
      if (cheerio(selector, html).attr('src')) {
        imgSrc = cheerio(selector, html).attr('src');
        return false;
      }

      return true;
    });

    return imgSrc;
  }
}
