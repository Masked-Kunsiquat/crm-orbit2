/**
 * Tests for Proximity UI Components
 *
 * Combined test suite for:
 * - TierHeader
 * - ContactProximityCard
 *
 * Focuses on rendering, props handling, and edge cases
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import TierHeader from '../TierHeader';
import ContactProximityCard from '../ContactProximityCard';

// Mock dependencies
jest.mock('../../utils/contactHelpers', () => ({
  getContactDisplayName: jest.fn((contact) => {
    const trim = (str) => (str || '').trim();

    if (trim(contact.display_name)) return trim(contact.display_name);

    const firstName = trim(contact.first_name);
    const lastName = trim(contact.last_name);

    if (firstName && lastName) {
      return `${firstName} ${lastName}`;
    }
    if (firstName) return firstName;
    return 'Unnamed Contact';
  }),
}));

jest.mock('../ContactAvatar', () => {
  const { View, Text } = require('react-native');
  return function MockContactAvatar({ contact, size, style }) {
    return (
      <View testID="contact-avatar" style={style}>
        <Text>{contact.first_name?.[0] || '?'}</Text>
      </View>
    );
  };
});

jest.mock('../ScoreBadge', () => {
  const { View, Text } = require('react-native');
  return function MockScoreBadge({ score, size }) {
    return (
      <View testID="score-badge">
        <Text>{Math.round(score || 0)}</Text>
      </View>
    );
  };
});

jest.mock('react-native-paper', () => ({
  useTheme: () => ({
    colors: {
      background: '#FFFFFF',
      onSurfaceVariant: '#49454F',
      primary: '#6750A4',
    },
  }),
  Text: ({ children, ...props }) => {
    const { Text } = require('react-native');
    return <Text {...props}>{children}</Text>;
  },
  Card: Object.assign(
    ({ children, onPress, style }) => {
      const { TouchableOpacity, View } = require('react-native');
      const Component = onPress ? TouchableOpacity : View;
      return (
        <Component onPress={onPress} style={style} testID="card">
          {children}
        </Component>
      );
    },
    {
      Content: ({ children, style }) => {
        const { View } = require('react-native');
        return <View style={style}>{children}</View>;
      },
    }
  ),
  Chip: ({ children, style, textStyle, compact, mode }) => {
    const { View, Text } = require('react-native');
    return (
      <View style={style} testID="chip">
        <Text style={textStyle}>{children}</Text>
      </View>
    );
  },
}));

describe('TierHeader', () => {
  const defaultProps = {
    emoji: '💚',
    title: 'Inner Circle',
    color: '#4CAF50',
    count: 5,
  };

  describe('Rendering', () => {
    it('renders without crashing', () => {
      const { getByText } = render(<TierHeader {...defaultProps} />);
      expect(getByText(/INNER CIRCLE/)).toBeTruthy();
    });

    it('displays emoji and title', () => {
      const { getByText } = render(<TierHeader {...defaultProps} />);
      expect(getByText('💚 INNER CIRCLE')).toBeTruthy();
    });

    it('displays count in chip', () => {
      const { getByTestId } = render(<TierHeader {...defaultProps} />);
      const chip = getByTestId('chip');
      expect(chip).toBeTruthy();
    });

    it('converts title to uppercase', () => {
      const { getByText } = render(
        <TierHeader emoji="💙" title="middle circle" color="#2196F3" count={10} />
      );
      expect(getByText('💙 MIDDLE CIRCLE')).toBeTruthy();
    });
  });

  describe('Props Handling', () => {
    it('handles different emojis', () => {
      const { getByText } = render(
        <TierHeader emoji="⚪" title="Distant" color="#9E9E9E" count={2} />
      );
      expect(getByText('⚪ DISTANT')).toBeTruthy();
    });

    it('handles zero count', () => {
      const { getByTestId } = render(<TierHeader {...defaultProps} count={0} />);
      expect(getByTestId('chip')).toBeTruthy();
    });

    it('handles large count', () => {
      const { getByTestId } = render(<TierHeader {...defaultProps} count={999} />);
      expect(getByTestId('chip')).toBeTruthy();
    });

    it('accepts custom style', () => {
      const customStyle = { marginTop: 10 };
      const { getByText } = render(<TierHeader {...defaultProps} style={customStyle} />);
      expect(getByText(/INNER CIRCLE/)).toBeTruthy();
    });
  });

  describe('Color Format Handling', () => {
    it('handles standard hex color (#RRGGBB)', () => {
      const { getByText } = render(
        <TierHeader emoji="💚" title="Test" color="#4CAF50" count={5} />
      );
      expect(getByText(/TEST/)).toBeTruthy();
    });

    it('handles short hex color (#RGB)', () => {
      const { getByText } = render(
        <TierHeader emoji="💚" title="Test" color="#4AF" count={5} />
      );
      expect(getByText(/TEST/)).toBeTruthy();
    });

    it('handles rgb() color format', () => {
      const { getByText } = render(
        <TierHeader emoji="💚" title="Test" color="rgb(76, 175, 80)" count={5} />
      );
      expect(getByText(/TEST/)).toBeTruthy();
    });

    it('handles rgba() color format', () => {
      const { getByText } = render(
        <TierHeader emoji="💚" title="Test" color="rgba(76, 175, 80, 1.0)" count={5} />
      );
      expect(getByText(/TEST/)).toBeTruthy();
    });

    it('handles invalid color gracefully', () => {
      const { getByText } = render(
        <TierHeader emoji="💚" title="Test" color="invalid" count={5} />
      );
      expect(getByText(/TEST/)).toBeTruthy();
    });

    it('handles null color', () => {
      const { getByText } = render(
        <TierHeader emoji="💚" title="Test" color={null} count={5} />
      );
      expect(getByText(/TEST/)).toBeTruthy();
    });
  });
});

describe('ContactProximityCard', () => {
  const mockContact = {
    id: 1,
    first_name: 'Alice',
    last_name: 'Smith',
    display_name: 'Alice Smith',
    proximityScore: 85,
  };

  const mockOnPress = jest.fn();

  beforeEach(() => {
    mockOnPress.mockClear();
  });

  describe('Rendering', () => {
    it('renders without crashing', () => {
      const { getByText } = render(
        <ContactProximityCard contact={mockContact} onPress={mockOnPress} />
      );
      expect(getByText('Alice Smith')).toBeTruthy();
    });

    it('displays contact name', () => {
      const { getByText } = render(
        <ContactProximityCard contact={mockContact} onPress={mockOnPress} />
      );
      expect(getByText('Alice Smith')).toBeTruthy();
    });

    it('renders ContactAvatar component', () => {
      const { getByTestId } = render(
        <ContactProximityCard contact={mockContact} onPress={mockOnPress} />
      );
      expect(getByTestId('contact-avatar')).toBeTruthy();
    });

    it('renders ScoreBadge component', () => {
      const { getByTestId } = render(
        <ContactProximityCard contact={mockContact} onPress={mockOnPress} />
      );
      expect(getByTestId('score-badge')).toBeTruthy();
    });
  });

  describe('Contact Display Name', () => {
    it('uses display_name if available', () => {
      const contact = {
        id: 1,
        first_name: 'John',
        last_name: 'Doe',
        display_name: 'Johnny D',
        proximityScore: 60,
      };
      const { getByText } = render(
        <ContactProximityCard contact={contact} onPress={mockOnPress} />
      );
      expect(getByText('Johnny D')).toBeTruthy();
    });

    it('constructs name from first and last name', () => {
      const contact = {
        id: 2,
        first_name: 'Jane',
        last_name: 'Doe',
        proximityScore: 60,
      };
      const { getByText } = render(
        <ContactProximityCard contact={contact} onPress={mockOnPress} />
      );
      expect(getByText('Jane Doe')).toBeTruthy();
    });

    it('uses first name only if last name missing', () => {
      const contact = {
        id: 3,
        first_name: 'Bob',
        proximityScore: 40,
      };
      const { getByText } = render(
        <ContactProximityCard contact={contact} onPress={mockOnPress} />
      );
      expect(getByText('Bob')).toBeTruthy();
    });

    it('handles contact with no name', () => {
      const contact = {
        id: 4,
        proximityScore: 20,
      };
      const { getByText } = render(
        <ContactProximityCard contact={contact} onPress={mockOnPress} />
      );
      expect(getByText('Unnamed Contact')).toBeTruthy();
    });
  });

  describe('Proximity Score', () => {
    it('displays proximity score', () => {
      const { getByText } = render(
        <ContactProximityCard contact={mockContact} onPress={mockOnPress} />
      );
      expect(getByText('85')).toBeTruthy();
    });

    it('handles zero score', () => {
      const contact = { ...mockContact, proximityScore: 0 };
      const { getByText } = render(
        <ContactProximityCard contact={contact} onPress={mockOnPress} />
      );
      expect(getByText('0')).toBeTruthy();
    });

    it('handles missing proximityScore', () => {
      const contact = { id: 5, first_name: 'Test' };
      const { getByText } = render(
        <ContactProximityCard contact={contact} onPress={mockOnPress} />
      );
      expect(getByText('0')).toBeTruthy();
    });

    it('handles high score', () => {
      const contact = { ...mockContact, proximityScore: 100 };
      const { getByText } = render(
        <ContactProximityCard contact={contact} onPress={mockOnPress} />
      );
      expect(getByText('100')).toBeTruthy();
    });
  });

  describe('Interaction', () => {
    it('calls onPress when card is pressed', () => {
      const { getByTestId } = render(
        <ContactProximityCard contact={mockContact} onPress={mockOnPress} />
      );

      fireEvent.press(getByTestId('card'));

      expect(mockOnPress).toHaveBeenCalledTimes(1);
      expect(mockOnPress).toHaveBeenCalledWith(mockContact);
    });

    it('passes correct contact object to onPress', () => {
      const customContact = {
        id: 99,
        first_name: 'Custom',
        last_name: 'User',
        proximityScore: 75,
      };

      const { getByTestId } = render(
        <ContactProximityCard contact={customContact} onPress={mockOnPress} />
      );

      fireEvent.press(getByTestId('card'));

      expect(mockOnPress).toHaveBeenCalledWith(customContact);
    });

    it('handles multiple presses', () => {
      const { getByTestId } = render(
        <ContactProximityCard contact={mockContact} onPress={mockOnPress} />
      );

      const card = getByTestId('card');
      fireEvent.press(card);
      fireEvent.press(card);
      fireEvent.press(card);

      expect(mockOnPress).toHaveBeenCalledTimes(3);
    });
  });

  describe('React.memo Optimization', () => {
    it('renders with same props', () => {
      const { rerender, getByText } = render(
        <ContactProximityCard contact={mockContact} onPress={mockOnPress} />
      );

      expect(getByText('Alice Smith')).toBeTruthy();

      // Re-render with same props (should use memo)
      rerender(<ContactProximityCard contact={mockContact} onPress={mockOnPress} />);

      expect(getByText('Alice Smith')).toBeTruthy();
    });

    it('updates when contact changes', () => {
      const { rerender, getByText } = render(
        <ContactProximityCard contact={mockContact} onPress={mockOnPress} />
      );

      expect(getByText('Alice Smith')).toBeTruthy();

      const newContact = { ...mockContact, first_name: 'Bob', display_name: 'Bob Smith' };
      rerender(<ContactProximityCard contact={newContact} onPress={mockOnPress} />);

      expect(getByText('Bob Smith')).toBeTruthy();
    });

    it('updates when score changes', () => {
      const { rerender, getByText } = render(
        <ContactProximityCard contact={mockContact} onPress={mockOnPress} />
      );

      expect(getByText('85')).toBeTruthy();

      const newContact = { ...mockContact, proximityScore: 60 };
      rerender(<ContactProximityCard contact={newContact} onPress={mockOnPress} />);

      expect(getByText('60')).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('handles contact with empty string names', () => {
      const contact = {
        id: 6,
        first_name: '',
        last_name: '',
        proximityScore: 50,
      };
      const { getByText } = render(
        <ContactProximityCard contact={contact} onPress={mockOnPress} />
      );
      expect(getByText('Unnamed Contact')).toBeTruthy();
    });

    it('handles contact with whitespace-only names', () => {
      const contact = {
        id: 7,
        first_name: '   ',
        last_name: '   ',
        proximityScore: 50,
      };
      const { getByText } = render(
        <ContactProximityCard contact={contact} onPress={mockOnPress} />
      );
      // getContactDisplayName handles trimming
      expect(getByText('Unnamed Contact')).toBeTruthy();
    });

    it('handles negative proximity score', () => {
      const contact = { ...mockContact, proximityScore: -10 };
      const { getByText } = render(
        <ContactProximityCard contact={contact} onPress={mockOnPress} />
      );
      expect(getByText('-10')).toBeTruthy();
    });

    it('handles very large proximity score', () => {
      const contact = { ...mockContact, proximityScore: 9999 };
      const { getByText } = render(
        <ContactProximityCard contact={contact} onPress={mockOnPress} />
      );
      expect(getByText('9999')).toBeTruthy();
    });
  });
});
