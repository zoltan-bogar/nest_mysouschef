import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';

@Injectable()
export class ScanService {
  private readonly logger = new Logger(ScanService.name);
  private readonly client: Anthropic;

  constructor(private readonly config: ConfigService) {
    this.client = new Anthropic({ apiKey: config.get<string>('ANTHROPIC_API_KEY') });
  }

  async extractRecipe(imageBuffer: Buffer, mimeType: string): Promise<object> {
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] as const;
    type AllowedMime = (typeof allowed)[number];
    const mediaType: AllowedMime = allowed.includes(mimeType as AllowedMime)
      ? (mimeType as AllowedMime)
      : 'image/jpeg';

    const response = await this.client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mediaType, data: imageBuffer.toString('base64') },
          },
          {
            type: 'text',
            text: `Extract the recipe from this image. Return ONLY a raw JSON object — no markdown, no explanation:
{
  "title": "recipe name",
  "category": "cuisine type e.g. Italian, Dessert, Soup",
  "description": "brief description if visible",
  "servings": "number as string e.g. 4",
  "time": ["prep minutes as plain number string", "cook minutes as plain number string"],
  "ingredients": [{"name": "ingredient name", "amount": "quantity", "unit": "unit"}],
  "instructions": ["Step 1 text", "Step 2 text"]
}
Omit fields not visible. Use plain numbers for amounts and time.`,
          },
        ],
      }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    return this.parseJson(text);
  }

  private parseJson(text: string): object {
    try {
      return JSON.parse(text);
    } catch {
      const block = text.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (block) return JSON.parse(block[1].trim());
      const obj = text.match(/\{[\s\S]*\}/);
      if (obj) return JSON.parse(obj[0]);
      this.logger.error('Unparseable Claude response', text);
      throw new InternalServerErrorException('Could not extract recipe from image.');
    }
  }
}
