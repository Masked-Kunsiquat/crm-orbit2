/**
 * Tests for ScoreBadge Component
 *
 * Tests the proximity score badge including:
 * - Rendering with different scores
 * - Size prop validation
 * - Invalid prop handling
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import ScoreBadge from '../ScoreBadge';

// Mock getTierDetails from proximityDefaults
jest.mock('../../constants/proximityDefaults', () => ({
  getTierDetails: jest.fn((score) => {
    if (score >= 75) return { tier: 'inner', label: 'Inner Circle', emoji: '💚', color: '#4CAF50', description: 'Close relationships' };
    if (score >= 50) return { tier: 'middle', label: 'Middle Circle', emoji: '💙', color: '#2196F3', description: 'Regular contacts' };
    if (score >= 25) return { tier: 'outer', label: 'Outer Circle', emoji: '💛', color: '#FF9800', description: 'Occasional contacts' };
    return { tier: 'distant', label: 'Distant', emoji: '⚪', color: '#9E9E9E', description: 'Infrequent contacts' };
  }),
}));

// Mock react-native-paper
jest.mock('react-native-paper', () => ({
  useTheme: () => ({
    colors: {
      onPrimary: '#FFFFFF',
    },
  }),
  Text: ({ children, ...props }) => {
    const { Text } = require('react-native');
    return <Text {...props}>{children}</Text>;
  },
}));

describe('ScoreBadge', () => {
  // Suppress console.warn during tests (for invalid size warnings)
  const originalWarn = console.warn;
  const originalDev = global.__DEV__;

  beforeAll(() => {
    console.warn = jest.fn();
  });

  afterAll(() => {
    console.warn = originalWarn;
    global.__DEV__ = originalDev;
  });

  describe('Score Display', () => {
    it('renders score rounded to nearest integer', () => {
      const { getByText } = render(<ScoreBadge score={85.7} />);
      expect(getByText('86')).toBeTruthy();
    });

    it('renders 0 for undefined score', () => {
      const { getByText } = render(<ScoreBadge />);
      expect(getByText('0')).toBeTruthy();
    });

    it('renders 0 for null score', () => {
      const { getByText } = render(<ScoreBadge score={null} />);
      expect(getByText('0')).toBeTruthy();
    });

    it('renders high score (inner tier)', () => {
      const { getByText } = render(<ScoreBadge score={90} />);
      expect(getByText('90')).toBeTruthy();
    });

    it('renders medium score (middle tier)', () => {
      const { getByText } = render(<ScoreBadge score={60} />);
      expect(getByText('60')).toBeTruthy();
    });

    it('renders low score (outer tier)', () => {
      const { getByText } = render(<ScoreBadge score={35} />);
      expect(getByText('35')).toBeTruthy();
    });

    it('renders very low score (distant tier)', () => {
      const { getByText } = render(<ScoreBadge score={10} />);
      expect(getByText('10')).toBeTruthy();
    });
  });

  describe('Size Prop', () => {
    afterEach(() => {
      // Restore __DEV__ after each test in this suite
      global.__DEV__ = originalDev;
    });

    it('renders with default medium size', () => {
      const { getByText } = render(<ScoreBadge score={50} />);
      expect(getByText('50')).toBeTruthy();
    });

    it('renders with small size', () => {
      const { getByText } = render(<ScoreBadge score={50} size="small" />);
      expect(getByText('50')).toBeTruthy();
    });

    it('renders with medium size', () => {
      const { getByText } = render(<ScoreBadge score={50} size="medium" />);
      expect(getByText('50')).toBeTruthy();
    });

    it('renders with large size', () => {
      const { getByText } = render(<ScoreBadge score={50} size="large" />);
      expect(getByText('50')).toBeTruthy();
    });

    it('falls back to medium for invalid size without crashing', () => {
      const { getByText } = render(<ScoreBadge score={50} size="invalid" />);
      expect(getByText('50')).toBeTruthy();
    });

    it('logs warning for invalid size in dev mode', () => {
      global.__DEV__ = true;

      render(<ScoreBadge score={50} size="invalid" />);

      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('ScoreBadge: Invalid size "invalid"')
      );
    });
  });

  describe('getTierDetails Integration', () => {
    const getTierDetails = require('../../constants/proximityDefaults').getTierDetails;

    it('calls getTierDetails with score for inner tier', () => {
      render(<ScoreBadge score={85} />);
      expect(getTierDetails).toHaveBeenCalledWith(85);
    });

    it('calls getTierDetails with score for middle tier', () => {
      getTierDetails.mockClear();
      render(<ScoreBadge score={60} />);
      expect(getTierDetails).toHaveBeenCalledWith(60);
    });

    it('calls getTierDetails with score for outer tier', () => {
      getTierDetails.mockClear();
      render(<ScoreBadge score={35} />);
      expect(getTierDetails).toHaveBeenCalledWith(35);
    });

    it('calls getTierDetails with score for distant tier', () => {
      getTierDetails.mockClear();
      render(<ScoreBadge score={10} />);
      expect(getTierDetails).toHaveBeenCalledWith(10);
    });
  });

  describe('Edge Cases', () => {
    it('handles score of 0', () => {
      const { getByText } = render(<ScoreBadge score={0} />);
      expect(getByText('0')).toBeTruthy();
    });

    it('handles score of 100', () => {
      const { getByText } = render(<ScoreBadge score={100} />);
      expect(getByText('100')).toBeTruthy();
    });

    it('handles negative score', () => {
      const { getByText } = render(<ScoreBadge score={-5} />);
      expect(getByText('-5')).toBeTruthy();
    });

    it('handles score > 100', () => {
      const { getByText } = render(<ScoreBadge score={150} />);
      expect(getByText('150')).toBeTruthy();
    });

    it('handles decimal scores (rounds down)', () => {
      const { getByText } = render(<ScoreBadge score={74.3} />);
      expect(getByText('74')).toBeTruthy();
    });

    it('handles decimal scores (rounds up)', () => {
      const { getByText } = render(<ScoreBadge score={74.6} />);
      expect(getByText('75')).toBeTruthy();
    });
  });

  describe('Component Rendering', () => {
    it('renders without crashing', () => {
      const { getByText } = render(<ScoreBadge score={50} />);
      expect(getByText('50')).toBeTruthy();
    });

    it('renders with custom style prop', () => {
      const customStyle = { marginTop: 10 };
      const { getByText } = render(<ScoreBadge score={50} style={customStyle} />);
      expect(getByText('50')).toBeTruthy();
    });

    it('renders with all props', () => {
      const { getByText } = render(
        <ScoreBadge score={75} size="large" style={{ margin: 5 }} />
      );
      expect(getByText('75')).toBeTruthy();
    });
  });
});
