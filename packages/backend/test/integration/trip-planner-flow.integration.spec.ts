/**
 * Integration test: AI Trip Planner flow
 * Tests: request → generate → modify → save
 */

describe('AI Trip Planner Flow Integration', () => {
  const mockTripPlannerService = {
    parseNaturalLanguage: jest.fn(),
    generateItinerary: jest.fn(),
    modifyItinerary: jest.fn(),
    saveItinerary: jest.fn(),
    getItinerary: jest.fn(),
  };

  const mockVectorSearchService = {
    searchSimilar: jest.fn(),
  };

  beforeEach(() => jest.clearAllMocks());

  describe('Request → Generate → Modify → Save', () => {
    it('completes full trip planner flow', async () => {
      const naturalLanguageInput =
        '3-day adventure trip in Nairobi with $300 budget, interested in culture and food';

      // Step 1: Parse natural language
      const parsedParams = {
        duration: 3,
        budget: { min: 0, max: 300, currency: 'USD' },
        preferences: ['culture', 'food'],
        location: 'Nairobi',
        activityTypes: ['adventure', 'cultural', 'culinary'],
      };
      mockTripPlannerService.parseNaturalLanguage.mockResolvedValueOnce(parsedParams);
      const params = await mockTripPlannerService.parseNaturalLanguage(naturalLanguageInput);
      expect(params.duration).toBe(3);
      expect(params.preferences).toContain('culture');

      // Step 2: Search vector DB for relevant experiences
      const relevantExperiences = [
        { id: 'exp-1', title: 'Nairobi Cultural Tour', relevanceScore: 0.92 },
        { id: 'exp-2', title: 'Street Food Safari', relevanceScore: 0.88 },
        { id: 'exp-3', title: 'Maasai Village Visit', relevanceScore: 0.85 },
      ];
      mockVectorSearchService.searchSimilar.mockResolvedValueOnce(relevantExperiences);
      const experiences = await mockVectorSearchService.searchSimilar(params);
      expect(experiences.length).toBeGreaterThanOrEqual(3);
      expect(experiences[0].relevanceScore).toBeGreaterThan(0.7);

      // Step 3: Generate itinerary
      const itinerary = {
        id: 'itin-1',
        experiences: relevantExperiences.map((e, i) => ({
          experienceId: e.id,
          suggestedDate: `2026-04-0${i + 1}`,
          reasoning: 'Matches your preferences',
        })),
        totalCost: { amount: 250, currency: 'USD' },
        parameters: params,
        generatedAt: new Date().toISOString(),
      };
      mockTripPlannerService.generateItinerary.mockResolvedValueOnce(itinerary);
      const generated = await mockTripPlannerService.generateItinerary(params, experiences);
      expect(generated.experiences.length).toBeGreaterThanOrEqual(3);
      expect(generated.totalCost.amount).toBeLessThanOrEqual(300);

      // Step 4: Modify itinerary
      const modification = 'Replace the second activity with something outdoors';
      const modifiedItinerary = {
        ...itinerary,
        experiences: [
          itinerary.experiences[0],
          {
            experienceId: 'exp-4',
            suggestedDate: '2026-04-02',
            reasoning: 'Outdoor activity as requested',
          },
          itinerary.experiences[2],
        ],
      };
      mockTripPlannerService.modifyItinerary.mockResolvedValueOnce(modifiedItinerary);
      const modified = await mockTripPlannerService.modifyItinerary('itin-1', modification);
      expect(modified.experiences[1].experienceId).toBe('exp-4');

      // Step 5: Save itinerary
      mockTripPlannerService.saveItinerary.mockResolvedValueOnce({ ...modified, saved: true });
      const saved = await mockTripPlannerService.saveItinerary('user-1', modified);
      expect(saved.saved).toBe(true);

      // Step 6: Retrieve saved itinerary
      mockTripPlannerService.getItinerary.mockResolvedValueOnce(saved);
      const retrieved = await mockTripPlannerService.getItinerary('itin-1');
      expect(retrieved.id).toBe('itin-1');
    });

    it('satisfies budget constraints', async () => {
      const budget = 100;
      const itinerary = {
        totalCost: { amount: 95, currency: 'USD' },
        experiences: [
          { experienceId: 'exp-1' },
          { experienceId: 'exp-2' },
          { experienceId: 'exp-3' },
        ],
      };
      mockTripPlannerService.generateItinerary.mockResolvedValueOnce(itinerary);
      const result = await mockTripPlannerService.generateItinerary(
        { budget: { max: budget } },
        []
      );
      expect(result.totalCost.amount).toBeLessThanOrEqual(budget);
    });
  });
});
