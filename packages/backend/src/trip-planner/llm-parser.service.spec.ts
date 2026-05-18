import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { LlmParserService } from './llm-parser.service';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

const mockConfigService = {
  get: jest.fn(),
};

describe('LlmParserService', () => {
  let service: LlmParserService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LlmParserService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<LlmParserService>(LlmParserService);
    jest.clearAllMocks();
  });

  // ─── Natural language parsing ─────────────────────────────────────────────

  describe('parseTripRequest', () => {
    it('should use fallback parser when no API key configured', async () => {
      mockConfigService.get.mockReturnValue(undefined);

      const result = await service.parseTripRequest('3-day food trip in Tokyo under $500');

      expect(result.preferences).toContain('food');
      expect(result.duration).toBe(3);
      expect(result.budget?.max).toBe(500);
    });

    it('should call OpenAI API when provider is openai and key is set', async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'llm.provider') return 'openai';
        if (key === 'llm.apiKey') return 'sk-test-key';
        if (key === 'llm.model') return 'gpt-4o-mini';
        return undefined;
      });

      const llmResponse = JSON.stringify({
        duration: 3,
        budget: { min: 0, max: 500, currency: 'USD' },
        preferences: ['food', 'culture'],
        activityTypes: ['cooking class'],
        location: 'Tokyo',
      });

      mockedAxios.post.mockResolvedValue({
        data: { choices: [{ message: { content: llmResponse } }] },
      });

      const result = await service.parseTripRequest('3-day food and culture trip in Tokyo under $500');

      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('openai.com'),
        expect.objectContaining({ model: 'gpt-4o-mini' }),
        expect.any(Object),
      );
      expect(result.duration).toBe(3);
      expect(result.preferences).toContain('food');
      expect(result.location).toBe('Tokyo');
    });

    it('should call Anthropic API when provider is anthropic', async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'llm.provider') return 'anthropic';
        if (key === 'llm.apiKey') return 'ant-test-key';
        if (key === 'llm.model') return 'claude-3-haiku-20240307';
        return undefined;
      });

      const llmResponse = JSON.stringify({
        preferences: ['adventure'],
        activityTypes: ['hiking'],
        location: 'Kyoto',
      });

      mockedAxios.post.mockResolvedValue({
        data: { content: [{ text: llmResponse }] },
      });

      const result = await service.parseTripRequest('Adventure trip in Kyoto');

      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('anthropic.com'),
        expect.any(Object),
        expect.any(Object),
      );
      expect(result.preferences).toContain('adventure');
    });

    it('should fall back to regex parser when LLM API call fails', async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'llm.provider') return 'openai';
        if (key === 'llm.apiKey') return 'sk-test-key';
        return undefined;
      });

      mockedAxios.post.mockRejectedValue(new Error('Network error'));

      const result = await service.parseTripRequest('2-day hiking trip under $300');

      expect(result.preferences).toBeDefined();
      expect(result.activityTypes).toBeDefined();
    });

    it('should parse JSON wrapped in markdown code blocks', async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'llm.provider') return 'openai';
        if (key === 'llm.apiKey') return 'sk-test-key';
        if (key === 'llm.model') return 'gpt-4o-mini';
        return undefined;
      });

      const llmResponse = '```json\n{"preferences":["nature"],"activityTypes":["hiking"]}\n```';

      mockedAxios.post.mockResolvedValue({
        data: { choices: [{ message: { content: llmResponse } }] },
      });

      const result = await service.parseTripRequest('Nature hiking trip');

      expect(result.preferences).toContain('nature');
      expect(result.activityTypes).toContain('hiking');
    });

    it('should always return preferences and activityTypes arrays', async () => {
      mockConfigService.get.mockReturnValue(undefined);

      const result = await service.parseTripRequest('I want to travel somewhere nice');

      expect(Array.isArray(result.preferences)).toBe(true);
      expect(Array.isArray(result.activityTypes)).toBe(true);
    });

    it('should extract budget from natural language in fallback mode', async () => {
      mockConfigService.get.mockReturnValue(undefined);

      const result = await service.parseTripRequest('Trip with budget of $1,000');

      expect(result.budget?.max).toBe(1000);
      expect(result.budget?.currency).toBe('USD');
    });

    it('should extract multiple preferences in fallback mode', async () => {
      mockConfigService.get.mockReturnValue(undefined);

      const result = await service.parseTripRequest('I love food, culture, and adventure');

      expect(result.preferences).toContain('food');
      expect(result.preferences).toContain('culture');
      expect(result.preferences).toContain('adventure');
    });

    it('should ignore invalid date ranges from LLM', async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'llm.provider') return 'openai';
        if (key === 'llm.apiKey') return 'sk-test-key';
        if (key === 'llm.model') return 'gpt-4o-mini';
        return undefined;
      });

      const llmResponse = JSON.stringify({
        preferences: ['food'],
        activityTypes: [],
        dates: { start: 'not-a-date', end: 'also-not-a-date' },
      });

      mockedAxios.post.mockResolvedValue({
        data: { choices: [{ message: { content: llmResponse } }] },
      });

      const result = await service.parseTripRequest('Food trip');

      expect(result.dates).toBeUndefined();
    });
  });
});
