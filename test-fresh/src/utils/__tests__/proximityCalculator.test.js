/**
 * Tests for Proximity Calculator
 *
 * Tests the proximity scoring algorithm including:
 * - Recency score calculation
 * - Frequency score calculation
 * - Quality score calculation
 * - Contact type score calculation
 * - Overall proximity score calculation
 * - Tier grouping
 * - Batch processing
 */

import {
  calculateRecencyScore,
  calculateFrequencyScore,
  calculateQualityScore,
  calculateContactTypeScore,
  calculateProximityScore,
  getProximityTier,
  groupByProximity,
  calculateProximityScores,
} from '../proximityCalculator';

// Mock dependencies
jest.mock('../dateUtils', () => ({
  parseLocalDate: jest.fn((dateString) => {
    if (!dateString || typeof dateString !== 'string') return null;
    const parsed = new Date(dateString);
    return isNaN(parsed.getTime()) ? null : parsed;
  }),
  daysBetween: jest.fn((date1, date2) => {
    const diff = date2.getTime() - date1.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }),
}));

jest.mock('../../errors/utils/errorLogger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    success: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('../../constants/proximityDefaults', () => ({
  RECENCY_BRACKETS: [
    { maxDays: 7, score: 100 },
    { maxDays: 14, score: 85 },
    { maxDays: 30, score: 70 },
    { maxDays: 60, score: 50 },
    { maxDays: 90, score: 30 },
    { maxDays: Infinity, score: 10 },
  ],
  FREQUENCY_BRACKETS: [
    { minCount: 10, score: 100 },
    { minCount: 5, score: 80 },
    { minCount: 3, score: 60 },
    { minCount: 1, score: 40 },
    { minCount: 0, score: 0 },
  ],
  INTERACTION_QUALITY_WEIGHTS: {
    meeting: 5,
    call: 4,
    email: 3,
    message: 2,
    note: 1,
    other: 1,
  },
  CONTACT_TYPE_SCORES: {
    family: 100,
    friend: 90,
    colleague: 70,
    client: 80,
    vendor: 60,
    other: 50,
    null: 0,
  },
  getTierDetails: jest.fn((score) => {
    if (score >= 75) return { tier: 'inner', label: 'Inner Circle', emoji: '💚', color: '#4CAF50', description: 'Close relationships' };
    if (score >= 50) return { tier: 'middle', label: 'Middle Circle', emoji: '💙', color: '#2196F3', description: 'Regular contacts' };
    if (score >= 25) return { tier: 'outer', label: 'Outer Circle', emoji: '💛', color: '#FF9800', description: 'Occasional contacts' };
    return { tier: 'distant', label: 'Distant', emoji: '⚪', color: '#9E9E9E', description: 'Infrequent contacts' };
  }),
}));

describe('proximityCalculator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateRecencyScore', () => {
    it('returns 0 for no interactions', () => {
      expect(calculateRecencyScore([])).toBe(0);
    });

    it('returns 0 for null/undefined interactions', () => {
      expect(calculateRecencyScore(null)).toBe(0);
      expect(calculateRecencyScore(undefined)).toBe(0);
    });

    it('returns 0 for interactions with no valid dates', () => {
      const interactions = [
        { interaction_datetime: null },
        { interaction_datetime: 'invalid' },
      ];
      expect(calculateRecencyScore(interactions)).toBe(0);
    });

    it('calculates score for recent interaction (within 7 days)', () => {
      const today = new Date();
      const twoDaysAgo = new Date(today);
      twoDaysAgo.setDate(today.getDate() - 2);

      const interactions = [
        { interaction_datetime: twoDaysAgo.toISOString().split('T')[0] },
      ];

      const score = calculateRecencyScore(interactions);
      expect(score).toBe(100); // Within 7 days
    });

    it('calculates score for older interaction (8-14 days)', () => {
      const today = new Date();
      const tenDaysAgo = new Date(today);
      tenDaysAgo.setDate(today.getDate() - 10);

      const interactions = [
        { interaction_datetime: tenDaysAgo.toISOString().split('T')[0] },
      ];

      const score = calculateRecencyScore(interactions);
      expect(score).toBe(85); // 8-14 days
    });

    it('uses most recent interaction when multiple exist', () => {
      const today = new Date();
      const twoDaysAgo = new Date(today);
      twoDaysAgo.setDate(today.getDate() - 2);
      const thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setDate(today.getDate() - 30);

      const interactions = [
        { interaction_datetime: thirtyDaysAgo.toISOString().split('T')[0] },
        { interaction_datetime: twoDaysAgo.toISOString().split('T')[0] },
      ];

      const score = calculateRecencyScore(interactions);
      expect(score).toBe(100); // Uses most recent (2 days ago)
    });

    it('accepts custom brackets', () => {
      const customBrackets = [
        { maxDays: 5, score: 90 },
        { maxDays: Infinity, score: 10 },
      ];

      const today = new Date();
      const threeDaysAgo = new Date(today);
      threeDaysAgo.setDate(today.getDate() - 3);

      const interactions = [
        { interaction_datetime: threeDaysAgo.toISOString().split('T')[0] },
      ];

      const score = calculateRecencyScore(interactions, customBrackets);
      expect(score).toBe(90);
    });
  });

  describe('calculateFrequencyScore', () => {
    it('returns 0 for no interactions', () => {
      expect(calculateFrequencyScore([])).toBe(0);
    });

    it('returns 0 for null/undefined interactions', () => {
      expect(calculateFrequencyScore(null)).toBe(0);
      expect(calculateFrequencyScore(undefined)).toBe(0);
    });

    it('calculates score for high frequency (10+ interactions)', () => {
      const today = new Date();
      const interactions = [];

      // Create 12 interactions in last 30 days
      for (let i = 0; i < 12; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        interactions.push({
          interaction_datetime: date.toISOString().split('T')[0],
        });
      }

      const score = calculateFrequencyScore(interactions);
      expect(score).toBe(100); // 10+ interactions
    });

    it('calculates score for medium frequency (5-9 interactions)', () => {
      const today = new Date();
      const interactions = [];

      // Create 7 interactions in last 30 days
      for (let i = 0; i < 7; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        interactions.push({
          interaction_datetime: date.toISOString().split('T')[0],
        });
      }

      const score = calculateFrequencyScore(interactions);
      expect(score).toBe(80); // 5-9 interactions
    });

    it('ignores interactions older than 30 days', () => {
      const today = new Date();
      const fortyDaysAgo = new Date(today);
      fortyDaysAgo.setDate(today.getDate() - 40);

      const interactions = [
        { interaction_datetime: fortyDaysAgo.toISOString().split('T')[0] },
      ];

      const score = calculateFrequencyScore(interactions);
      expect(score).toBe(0); // No interactions in last 30 days
    });

    it('counts only interactions within 30-day window', () => {
      const today = new Date();
      const interactions = [];

      // 5 recent interactions (within 30 days)
      for (let i = 0; i < 5; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        interactions.push({
          interaction_datetime: date.toISOString().split('T')[0],
        });
      }

      // 10 old interactions (>30 days ago)
      for (let i = 31; i < 41; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        interactions.push({
          interaction_datetime: date.toISOString().split('T')[0],
        });
      }

      const score = calculateFrequencyScore(interactions);
      expect(score).toBe(80); // Only 5 recent interactions count
    });

    it('accepts custom brackets', () => {
      const customBrackets = [
        { minCount: 3, score: 75 },
        { minCount: 0, score: 0 },
      ];

      const today = new Date();
      const interactions = [];

      for (let i = 0; i < 5; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        interactions.push({
          interaction_datetime: date.toISOString().split('T')[0],
        });
      }

      const score = calculateFrequencyScore(interactions, customBrackets);
      expect(score).toBe(75);
    });
  });

  describe('calculateQualityScore', () => {
    it('returns 0 for no interactions', () => {
      expect(calculateQualityScore([])).toBe(0);
    });

    it('returns 0 for null/undefined interactions', () => {
      expect(calculateQualityScore(null)).toBe(0);
      expect(calculateQualityScore(undefined)).toBe(0);
    });

    it('calculates score for high-quality interactions (meetings)', () => {
      const interactions = [
        { interaction_type: 'meeting' },
        { interaction_type: 'meeting' },
      ];

      const score = calculateQualityScore(interactions);
      expect(score).toBe(100); // meeting = weight 5, max weight 5
    });

    it('calculates score for mixed quality interactions', () => {
      const interactions = [
        { interaction_type: 'meeting' }, // 5
        { interaction_type: 'call' },    // 4
        { interaction_type: 'email' },   // 3
        { interaction_type: 'note' },    // 1
      ];

      // Average: (5 + 4 + 3 + 1) / 4 = 3.25
      // Normalized: (3.25 / 5) * 100 = 65
      const score = calculateQualityScore(interactions);
      expect(score).toBe(65);
    });

    it('uses "other" weight for unknown interaction types', () => {
      const interactions = [
        { interaction_type: 'unknown_type' },
      ];

      // Should use "other" weight = 1
      // Normalized: (1 / 5) * 100 = 20
      const score = calculateQualityScore(interactions);
      expect(score).toBe(20);
    });

    it('ignores interactions without type', () => {
      const interactions = [
        { interaction_type: 'meeting' }, // 5
        { interaction_type: null },
        { interaction_type: undefined },
      ];

      // Only counts the meeting
      const score = calculateQualityScore(interactions);
      expect(score).toBe(100);
    });

    it('accepts custom quality weights', () => {
      const customWeights = {
        meeting: 10,
        call: 5,
        other: 1,
      };

      const interactions = [
        { interaction_type: 'call' },
        { interaction_type: 'call' },
      ];

      // Average: 5, Normalized: (5 / 10) * 100 = 50
      const score = calculateQualityScore(interactions, customWeights);
      expect(score).toBe(50);
    });
  });

  describe('calculateContactTypeScore', () => {
    it('returns 0 for null contact', () => {
      expect(calculateContactTypeScore(null)).toBe(0);
    });

    it('returns 0 for undefined contact', () => {
      expect(calculateContactTypeScore(undefined)).toBe(0);
    });

    it('returns 0 for contact without type', () => {
      const contact = { id: 1, first_name: 'John' };
      expect(calculateContactTypeScore(contact)).toBe(0);
    });

    it('returns correct score for family contact', () => {
      const contact = { id: 1, contact_type: 'family' };
      expect(calculateContactTypeScore(contact)).toBe(100);
    });

    it('returns correct score for friend contact', () => {
      const contact = { id: 1, contact_type: 'friend' };
      expect(calculateContactTypeScore(contact)).toBe(90);
    });

    it('returns correct score for colleague contact', () => {
      const contact = { id: 1, contact_type: 'colleague' };
      expect(calculateContactTypeScore(contact)).toBe(70);
    });

    it('uses "other" score for unknown contact type', () => {
      const contact = { id: 1, contact_type: 'unknown_type' };
      expect(calculateContactTypeScore(contact)).toBe(50);
    });

    it('accepts custom type scores', () => {
      const customScores = {
        vip: 100,
        regular: 50,
        other: 0,
      };

      const contact = { id: 1, contact_type: 'vip' };
      expect(calculateContactTypeScore(contact, customScores)).toBe(100);
    });
  });

  describe('calculateProximityScore', () => {
    const mockConfig = {
      weights: {
        recency: 0.4,
        frequency: 0.3,
        quality: 0.2,
        contactType: 0.1,
      },
    };

    it('returns 0 for null contact', () => {
      const score = calculateProximityScore(null, [], mockConfig);
      expect(score).toBe(0);
    });

    it('returns 0 for invalid config', () => {
      const contact = { id: 1, first_name: 'John' };
      const score = calculateProximityScore(contact, [], null);
      expect(score).toBe(0);
    });

    it('calculates weighted average correctly', () => {
      const contact = { id: 1, first_name: 'John', contact_type: 'friend' };

      const today = new Date();
      const twoDaysAgo = new Date(today);
      twoDaysAgo.setDate(today.getDate() - 2);

      const interactions = [
        {
          interaction_datetime: twoDaysAgo.toISOString().split('T')[0],
          interaction_type: 'meeting',
        },
      ];

      const score = calculateProximityScore(contact, interactions, mockConfig);

      // Recency: 100 (within 7 days)
      // Frequency: 40 (1 interaction in 30 days)
      // Quality: 100 (meeting)
      // ContactType: 90 (friend)
      // Weighted: 100*0.4 + 40*0.3 + 100*0.2 + 90*0.1 = 40 + 12 + 20 + 9 = 81
      expect(score).toBe(81);
    });

    it('handles missing weights with defaults (0)', () => {
      const contact = { id: 1, first_name: 'John' };
      const invalidConfig = { weights: {} };

      const score = calculateProximityScore(contact, [], invalidConfig);
      expect(score).toBe(0); // All weights default to 0
    });

    it('clamps score to 0-100 range', () => {
      const contact = { id: 1, first_name: 'John', contact_type: 'family' };

      const config = {
        weights: {
          recency: 2.0, // Invalid weight > 1
          frequency: 0,
          quality: 0,
          contactType: 0,
        },
      };

      const today = new Date();
      const interactions = [
        { interaction_datetime: today.toISOString().split('T')[0] },
      ];

      const score = calculateProximityScore(contact, interactions, config);
      expect(score).toBeLessThanOrEqual(100);
      expect(score).toBeGreaterThanOrEqual(0);
    });

    it('handles non-array interactions gracefully', () => {
      const contact = { id: 1, first_name: 'John', contact_type: 'friend' };

      const score = calculateProximityScore(contact, null, mockConfig);

      // Should treat as no interactions
      // Recency: 0, Frequency: 0, Quality: 0, ContactType: 90
      // Weighted: 0*0.4 + 0*0.3 + 0*0.2 + 90*0.1 = 9
      expect(score).toBe(9);
    });
  });

  describe('getProximityTier', () => {
    it('returns inner tier for high scores', () => {
      const tier = getProximityTier(85);
      expect(tier.tier).toBe('inner');
      expect(tier.label).toBe('Inner Circle');
    });

    it('returns middle tier for medium-high scores', () => {
      const tier = getProximityTier(60);
      expect(tier.tier).toBe('middle');
      expect(tier.label).toBe('Middle Circle');
    });

    it('returns outer tier for medium-low scores', () => {
      const tier = getProximityTier(35);
      expect(tier.tier).toBe('outer');
      expect(tier.label).toBe('Outer Circle');
    });

    it('returns distant tier for low scores', () => {
      const tier = getProximityTier(15);
      expect(tier.tier).toBe('distant');
      expect(tier.label).toBe('Distant');
    });
  });

  describe('groupByProximity', () => {
    it('returns empty groups for empty array', () => {
      const groups = groupByProximity([]);
      expect(groups).toEqual({
        inner: [],
        middle: [],
        outer: [],
        distant: [],
      });
    });

    it('returns empty groups for null/undefined', () => {
      const nullGroups = groupByProximity(null);
      const undefinedGroups = groupByProximity(undefined);

      expect(nullGroups).toEqual({ inner: [], middle: [], outer: [], distant: [] });
      expect(undefinedGroups).toEqual({ inner: [], middle: [], outer: [], distant: [] });
    });

    it('groups contacts by tier correctly', () => {
      const contacts = [
        { id: 1, first_name: 'Alice', proximityScore: 85 },  // inner
        { id: 2, first_name: 'Bob', proximityScore: 60 },    // middle
        { id: 3, first_name: 'Charlie', proximityScore: 35 }, // outer
        { id: 4, first_name: 'David', proximityScore: 15 },  // distant
      ];

      const groups = groupByProximity(contacts);

      expect(groups.inner).toHaveLength(1);
      expect(groups.middle).toHaveLength(1);
      expect(groups.outer).toHaveLength(1);
      expect(groups.distant).toHaveLength(1);

      expect(groups.inner[0].first_name).toBe('Alice');
      expect(groups.middle[0].first_name).toBe('Bob');
      expect(groups.outer[0].first_name).toBe('Charlie');
      expect(groups.distant[0].first_name).toBe('David');
    });

    it('sorts contacts within tiers by score (descending)', () => {
      const contacts = [
        { id: 1, first_name: 'Alice', proximityScore: 80 },  // inner
        { id: 2, first_name: 'Bob', proximityScore: 90 },    // inner
        { id: 3, first_name: 'Charlie', proximityScore: 85 }, // inner
      ];

      const groups = groupByProximity(contacts);

      expect(groups.inner).toHaveLength(3);
      expect(groups.inner[0].proximityScore).toBe(90);  // Bob (highest)
      expect(groups.inner[1].proximityScore).toBe(85);  // Charlie
      expect(groups.inner[2].proximityScore).toBe(80);  // Alice (lowest)
    });

    it('skips contacts without proximityScore', () => {
      const contacts = [
        { id: 1, first_name: 'Alice', proximityScore: 85 },
        { id: 2, first_name: 'Bob' }, // Missing score
      ];

      const groups = groupByProximity(contacts);

      expect(groups.inner).toHaveLength(1);
      expect(groups.middle).toHaveLength(0);
    });
  });

  describe('calculateProximityScores', () => {
    const mockConfig = {
      weights: {
        recency: 0.4,
        frequency: 0.3,
        quality: 0.2,
        contactType: 0.1,
      },
    };

    it('returns empty array for empty contacts', () => {
      const result = calculateProximityScores([], {}, mockConfig);
      expect(result).toEqual([]);
    });

    it('returns contacts with 0 score for null interactions map', () => {
      const contacts = [
        { id: 1, first_name: 'Alice' },
        { id: 2, first_name: 'Bob' },
      ];

      const result = calculateProximityScores(contacts, null, mockConfig);

      expect(result).toHaveLength(2);
      expect(result[0].proximityScore).toBe(0);
      expect(result[1].proximityScore).toBe(0);
    });

    it('calculates scores for multiple contacts', () => {
      const contacts = [
        { id: 1, first_name: 'Alice', contact_type: 'friend' },
        { id: 2, first_name: 'Bob', contact_type: 'colleague' },
      ];

      const today = new Date();
      const twoDaysAgo = new Date(today);
      twoDaysAgo.setDate(today.getDate() - 2);

      const interactionsByContactId = {
        1: [
          {
            interaction_datetime: twoDaysAgo.toISOString().split('T')[0],
            interaction_type: 'meeting',
          },
        ],
        2: [], // No interactions
      };

      const result = calculateProximityScores(
        contacts,
        interactionsByContactId,
        mockConfig
      );

      expect(result).toHaveLength(2);
      expect(result[0].proximityScore).toBeGreaterThan(0); // Alice has interactions
      expect(result[1].proximityScore).toBeGreaterThanOrEqual(0); // Bob has no interactions
    });

    it('handles contacts with no interactions in map', () => {
      const contacts = [
        { id: 1, first_name: 'Alice', contact_type: 'friend' },
      ];

      const interactionsByContactId = {}; // No entry for contact 1

      const result = calculateProximityScores(
        contacts,
        interactionsByContactId,
        mockConfig
      );

      expect(result).toHaveLength(1);
      expect(result[0].proximityScore).toBeDefined();
    });

    it('preserves original contact data', () => {
      const contacts = [
        { id: 1, first_name: 'Alice', last_name: 'Smith', contact_type: 'friend' },
      ];

      const result = calculateProximityScores(contacts, {}, mockConfig);

      expect(result[0].id).toBe(1);
      expect(result[0].first_name).toBe('Alice');
      expect(result[0].last_name).toBe('Smith');
      expect(result[0].contact_type).toBe('friend');
      expect(result[0]).toHaveProperty('proximityScore');
    });
  });
});
