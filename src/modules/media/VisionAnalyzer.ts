/**
 * OpenAI Vision analyzer for food photo analysis
 */
import OpenAI from 'openai';
import { logger } from '../../lib/logger';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface VisionAnalysisResult {
  success: boolean;
  description?: string;
  error?: string;
}

export class VisionAnalyzer {
  private static readonly MODEL_VERSION = 'gpt-4o-mini';

  /**
   * Analyze a food photo to extract meal description
   */
  async analyzeFood(imageBuffer: Buffer, caption?: string): Promise<VisionAnalysisResult> {
    try {
      logger.info('[VisionAnalyzer] Analyzing food image', {
        imageSize: imageBuffer.length,
        hasCaption: !!caption,
      });

      // Convert buffer to base64 for OpenAI Vision API
      const base64Image = imageBuffer.toString('base64');
      const imageUrl = `data:image/jpeg;base64,${base64Image}`;

      // Build the prompt for food analysis
      const systemPrompt = this.buildFoodAnalysisPrompt(caption);

      const response = await openai.chat.completions.create({
        model: VisionAnalyzer.MODEL_VERSION,
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: caption 
                  ? `Please provide a detailed analysis of this food image. The user also provided this caption: "${caption}" - use it as context but focus on what you see in the image.`
                  : 'Please provide a detailed analysis of this food image. List every visible food item with portions, cooking methods, and context.',
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageUrl,
                  detail: 'low', // Use low detail to reduce costs
                },
              },
            ],
          },
        ],
        max_tokens: 500,
        temperature: 0.1,
      });

      const description = response.choices[0]?.message?.content?.trim();

      if (!description) {
        throw new Error('No description returned from OpenAI Vision');
      }

      logger.info('[VisionAnalyzer] Food image analyzed successfully', {
        imageSize: imageBuffer.length,
        descriptionLength: description.length,
      });

      return {
        success: true,
        description,
      };

    } catch (error) {
      logger.error('[VisionAnalyzer] Failed to analyze food image', {
        error,
        imageSize: imageBuffer.length,
        hasCaption: !!caption,
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Build the system prompt for food analysis
   */
  private buildFoodAnalysisPrompt(caption?: string): string {
    return `You are a nutrition expert analyzing food photos for detailed meal logging. Your task is to provide an extremely detailed description of ALL food items visible in the image.

CRITICAL REQUIREMENTS - Provide a comprehensive analysis including:

1. MAIN PROTEIN SOURCES:
   - Type of meat/fish/legumes (chicken breast, salmon, tofu, etc.)
   - Cooking method (grilled, fried, baked, steamed, raw, etc.)
   - Portion size estimation (small/medium/large - be specific)
   - Visible characteristics (skin on/off, breaded, seasoned, etc.)

2. CARBOHYDRATE SOURCES:
   - Type of carbs (rice, pasta, bread, potatoes, etc.)
   - Specific variety (brown rice, white rice, whole wheat bread, etc.)
   - Portion size and form (1/2 cup, 1 slice, mashed, etc.)
   - Cooking method if applicable

3. VEGETABLES:
   - List EVERY vegetable visible (broccoli, carrots, spinach, etc.)
   - Cooking method (raw, steamed, roasted, sautéed, etc.)
   - Portion size estimation
   - Color and freshness indicators

4. FATS/OILS:
   - Visible oils, dressings, sauces, butter, etc.
   - Type if identifiable (olive oil, ranch dressing, etc.)
   - Amount estimation

5. ADDITIONAL INGREDIENTS:
   - Herbs, spices, seasonings
   - Nuts, seeds, cheese, etc.
   - Any other visible food items

6. MEAL CONTEXT:
   - Time of day indicators (breakfast/lunch/dinner/snack)
   - Setting clues (restaurant, home-cooked, takeout, etc.)
   - Presentation style (plated, bowl, sandwich, etc.)

7. QUALITY INDICATORS:
   - Homemade vs processed/restaurant
   - Fresh vs packaged appearance
   - Healthy vs junk food characteristics

${caption ? `USER CAPTION: "${caption}" - Use this as additional context but prioritize what you see in the image.` : ''}

FORMAT YOUR RESPONSE AS:
"Detailed meal description: [comprehensive list of all items with portions and methods]"

EXAMPLE DETAILED RESPONSES:
- "Detailed meal description: 1 medium grilled chicken breast (skinless, seasoned), 3/4 cup steamed broccoli florets, 1/2 cup brown rice, 1 tablespoon olive oil drizzle, fresh herbs garnish. Appears home-cooked, healthy preparation."

- "Detailed meal description: Large mixed green salad with 2 cups mixed lettuce/spinach, 1/4 cup cherry tomatoes, 1/2 cucumber sliced, 1/4 cup shredded carrots, 2 tablespoons ranch dressing, 1/4 cup croutons, 1/4 cup shredded cheese. Restaurant/takeout style."

- "Detailed meal description: 2 slices whole wheat toast, 1/4 avocado mashed and spread, 1 fried egg (over-easy), 1 slice cheese, 1/4 cup mixed berries on side, 1 tablespoon butter visible. Homemade breakfast plate."

BE EXTREMELY THOROUGH - Include every visible food item, estimate portions, note cooking methods, and provide context that will help with nutrition analysis.`;
  }

  /**
   * Validate if an image appears to contain food
   */
  async validateFoodImage(imageBuffer: Buffer): Promise<boolean> {
    try {
      // Quick validation to check if image likely contains food
      // This could be expanded with a simpler model or heuristics
      const analysis = await this.analyzeFood(imageBuffer);
      
      if (!analysis.success || !analysis.description) {
        return false;
      }

      // Simple heuristic: check if the description contains food-related words
      const foodKeywords = [
        'food', 'meal', 'eat', 'dish', 'plate', 'bowl', 'cup',
        'chicken', 'beef', 'fish', 'rice', 'bread', 'vegetable',
        'fruit', 'salad', 'soup', 'sandwich', 'pasta', 'pizza',
        'cooked', 'grilled', 'fried', 'baked', 'raw'
      ];

      const description = analysis.description.toLowerCase();
      return foodKeywords.some(keyword => description.includes(keyword));

    } catch (error) {
      logger.warn('[VisionAnalyzer] Failed to validate food image', { error });
      return false; // Assume it's food if validation fails
    }
  }
} 