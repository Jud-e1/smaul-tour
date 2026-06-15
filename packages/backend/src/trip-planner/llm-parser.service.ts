import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { TripParameters } from './interfaces/trip-planner.interfaces';

const SYSTEM_PROMPT = `You are a travel planning assistant. Extract structured trip parameters from natural language input.
Return ONLY valid JSON with this exact structure (omit fields that are not mentioned):
{
  "duration": <number of days, integer>,
  "budget": { "min": <number>, "max": <number>, "currency": "<3-letter ISO code>" },
  "preferences": ["<preference1>", "<preference2>"],
  "activityTypes": ["<type1>", "<type2>"],
  "location": "<city or region>",
  "dates": { "start": "<ISO date>", "end": "<ISO date>" }
}
"preferences" are traveler interests (e.g. food, culture, adventure, nature, history, art).
"activityTypes" are specific activity categories (e.g. hiking, cooking class, museum tour, boat trip).
Always include "preferences" and "activityTypes" arrays (can be empty).`;

@Injectable()
export class LlmParserService {
  private readonly logger = new Logger(LlmParserService.name);

  constructor(private readonly configService: ConfigService) {}

  async parseTripRequest(naturalLanguageInput: string): Promise<TripParameters> {
    const provider = this.configService.get<string>('llm.provider') ?? 'openai';
    const apiKey = this.configService.get<string>('llm.apiKey');
    const model = this.configService.get<string>('llm.model') ?? 'gpt-4o-mini';

    if (!apiKey) {
      this.logger.warn('No LLM API key configured, using fallback parser');
      return this.fallbackParse(naturalLanguageInput);
    }

    try {
      const raw =
        provider === 'anthropic'
          ? await this.callAnthropic(naturalLanguageInput, apiKey, model)
          : await this.callOpenAI(naturalLanguageInput, apiKey, model);

      return this.parseAndValidate(raw);
    } catch (error) {
      this.logger.error(`LLM parsing failed: ${(error as Error).message}`);
      return this.fallbackParse(naturalLanguageInput);
    }
  }

  private async callOpenAI(input: string, apiKey: string, model: string): Promise<string> {
    const response = await axios.post<{ choices: Array<{ message: { content: string } }> }>(
      'https://api.openai.com/v1/chat/completions',
      {
        model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: input },
        ],
        max_tokens: 500,
        temperature: 0,
      },
      {
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        timeout: 10000,
      }
    );
    return response.data.choices[0].message.content;
  }

  private async callAnthropic(input: string, apiKey: string, model: string): Promise<string> {
    const response = await axios.post<{ content: Array<{ text: string }> }>(
      'https://api.anthropic.com/v1/messages',
      {
        model: model || 'claude-3-haiku-20240307',
        max_tokens: 500,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: input }],
      },
      {
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      }
    );
    return response.data.content[0].text;
  }

  private parseAndValidate(raw: string): TripParameters {
    // Extract JSON from potential markdown code blocks
    const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/) ?? raw.match(/(\{[\s\S]*\})/);
    const jsonStr = jsonMatch ? jsonMatch[1].trim() : raw.trim();

    const parsed = JSON.parse(jsonStr) as Record<string, unknown>;

    const params: TripParameters = {
      preferences: Array.isArray(parsed.preferences) ? (parsed.preferences as string[]) : [],
      activityTypes: Array.isArray(parsed.activityTypes) ? (parsed.activityTypes as string[]) : [],
    };

    if (typeof parsed.duration === 'number' && parsed.duration > 0) {
      params.duration = Math.round(parsed.duration);
    }

    if (parsed.budget && typeof parsed.budget === 'object') {
      const b = parsed.budget as Record<string, unknown>;
      if (typeof b.max === 'number') {
        params.budget = {
          min: typeof b.min === 'number' ? b.min : 0,
          max: b.max,
          currency: typeof b.currency === 'string' ? b.currency : 'USD',
        };
      }
    }

    if (typeof parsed.location === 'string' && parsed.location.trim()) {
      params.location = parsed.location.trim();
    }

    if (parsed.dates && typeof parsed.dates === 'object') {
      const d = parsed.dates as Record<string, unknown>;
      if (typeof d.start === 'string' && typeof d.end === 'string') {
        const start = new Date(d.start);
        const end = new Date(d.end);
        if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
          params.dates = { start, end };
        }
      }
    }

    return params;
  }

  /** Simple regex-based fallback when LLM is unavailable */
  private fallbackParse(input: string): TripParameters {
    const lower = input.toLowerCase();
    const params: TripParameters = { preferences: [], activityTypes: [] };

    const daysMatch = lower.match(/(\d+)\s*(?:day|night)/);
    if (daysMatch) params.duration = parseInt(daysMatch[1], 10);

    const budgetMatch = lower.match(/\$\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/);
    if (budgetMatch) {
      const max = parseFloat(budgetMatch[1].replace(',', ''));
      params.budget = { min: 0, max, currency: 'USD' };
    }

    const preferenceKeywords = [
      'food',
      'culture',
      'adventure',
      'nature',
      'history',
      'art',
      'beach',
      'shopping',
    ];
    params.preferences = preferenceKeywords.filter((k) => lower.includes(k));

    const activityKeywords = ['hiking', 'cooking', 'museum', 'tour', 'diving', 'cycling', 'yoga'];
    params.activityTypes = activityKeywords.filter((k) => lower.includes(k));

    return params;
  }
}
