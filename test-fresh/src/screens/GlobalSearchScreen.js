import React, { useState, useCallback, useEffect } from 'react';
import { StyleSheet, SectionList, View, TouchableOpacity } from 'react-native';
import {
  Appbar,
  Searchbar,
  Text,
  Card,
  Avatar,
  Chip,
  useTheme,
  ActivityIndicator,
  Divider,
} from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useGlobalSearch } from '../hooks/queries';
import { logger } from '../errors/utils/errorLogger';
import { formatDateSmart } from '../utils/dateUtils';
import { getInitials } from '../utils/contactHelpers';

export default function GlobalSearchScreen({ navigation }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // Debounce search to avoid excessive queries
  const debounceTimeout = React.useRef(null);
  const handleSearchChange = useCallback((query) => {
    setSearchQuery(query);

    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }

    debounceTimeout.current = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
  }, []);

  // Cleanup debounce timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
        debounceTimeout.current = null;
      }
    };
  }, []);

  // Perform global search using TanStack Query
  const { data: results, isLoading, isFetching } = useGlobalSearch(debouncedQuery);

  // Transform results into SectionList format
  const sections = React.useMemo(() => {
    if (!results) return [];

    const sections = [];

    if (results.contacts && results.contacts.length > 0) {
      sections.push({
        title: t('globalSearch.sections.contacts'),
        data: results.contacts,
        type: 'contact',
      });
    }

    if (results.companies && results.companies.length > 0) {
      sections.push({
        title: t('globalSearch.sections.companies'),
        data: results.companies,
        type: 'company',
      });
    }

    if (results.interactions && results.interactions.length > 0) {
      sections.push({
        title: t('globalSearch.sections.interactions'),
        data: results.interactions,
        type: 'interaction',
      });
    }

    if (results.events && results.events.length > 0) {
      sections.push({
        title: t('globalSearch.sections.events'),
        data: results.events,
        type: 'event',
      });
    }

    if (results.notes && results.notes.length > 0) {
      sections.push({
        title: t('globalSearch.sections.notes'),
        data: results.notes,
        type: 'note',
      });
    }

    return sections;
  }, [results, t]);

  const handleResultPress = useCallback((item, type) => {
    logger.success('GlobalSearchScreen', 'handleResultPress', { type, itemId: item.id });

    switch (type) {
      case 'contact':
        navigation.navigate('ContactDetail', { contactId: item.id });
        break;
      case 'company':
        // Navigate to company detail or list with filter
        navigation.navigate('Companies');
        break;
      case 'interaction':
        // Navigate to contact detail showing interaction
        if (item.contact_id) {
          navigation.navigate('ContactDetail', { contactId: item.contact_id });
        }
        break;
      case 'event':
        // Navigate to events list or event detail
        navigation.navigate('Events');
        break;
      case 'note':
        // Navigate to related entity
        if (item.entity_type === 'contact' && item.entity_id) {
          navigation.navigate('ContactDetail', { contactId: item.entity_id });
        }
        break;
      default:
        logger.warn('GlobalSearchScreen', 'Unknown result type', { type });
    }
  }, [navigation]);

  const renderSectionHeader = ({ section }) => (
    <View style={[styles.sectionHeader, { backgroundColor: theme.colors.surface }]}>
      <Text variant="titleMedium" style={{ color: theme.colors.primary }}>
        {section.title}
      </Text>
      <Chip mode="outlined" compact>
        {section.data.length}
      </Chip>
    </View>
  );

  const renderItem = ({ item, section }) => {
    switch (section.type) {
      case 'contact':
        return <ContactResult item={item} onPress={() => handleResultPress(item, 'contact')} />;
      case 'company':
        return <CompanyResult item={item} onPress={() => handleResultPress(item, 'company')} />;
      case 'interaction':
        return <InteractionResult item={item} onPress={() => handleResultPress(item, 'interaction')} />;
      case 'event':
        return <EventResult item={item} onPress={() => handleResultPress(item, 'event')} />;
      case 'note':
        return <NoteResult item={item} onPress={() => handleResultPress(item, 'note')} />;
      default:
        return null;
    }
  };

  const renderEmptyState = () => {
    if (!debouncedQuery || debouncedQuery.trim().length < 2) {
      return (
        <View style={styles.emptyState}>
          <Text variant="titleMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            {t('globalSearch.emptyState.prompt')}
          </Text>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 8 }}>
            {t('globalSearch.emptyState.hint')}
          </Text>
        </View>
      );
    }

    if (isLoading || isFetching) {
      return (
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" />
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 16 }}>
            {t('globalSearch.searching')}
          </Text>
        </View>
      );
    }

    if (sections.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Text variant="titleMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            {t('globalSearch.emptyState.noResults')}
          </Text>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 8 }}>
            {t('globalSearch.emptyState.tryDifferent')}
          </Text>
        </View>
      );
    }

    return null;
  };

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title={t('globalSearch.title')} />
      </Appbar.Header>

      <Searchbar
        placeholder={t('globalSearch.searchPlaceholder')}
        onChangeText={handleSearchChange}
        value={searchQuery}
        style={styles.searchbar}
        autoFocus
      />

      {sections.length === 0 ? (
        renderEmptyState()
      ) : (
        <SectionList
          sections={sections}
          renderSectionHeader={renderSectionHeader}
          renderItem={renderItem}
          keyExtractor={(item, index) => `${item.id}-${index}`}
          stickySectionHeadersEnabled
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <Divider />}
        />
      )}
    </View>
  );
}

// Contact result card
function ContactResult({ item, onPress }) {
  const theme = useTheme();
  const { t } = useTranslation();

  return (
    <TouchableOpacity onPress={onPress}>
      <Card.Title
        title={item.display_name}
        subtitle={item.primary_phone || item.primary_email || t('globalSearch.noContact')}
        left={(props) => (
          <Avatar.Text
            {...props}
            label={getInitials(item.first_name, item.last_name)}
            size={40}
          />
        )}
        right={(props) =>
          item.is_favorite ? (
            <Avatar.Icon {...props} icon="star" size={24} style={{ backgroundColor: 'transparent' }} />
          ) : null
        }
        style={{ paddingVertical: 8 }}
      />
    </TouchableOpacity>
  );
}

// Company result card
function CompanyResult({ item, onPress }) {
  const theme = useTheme();
  const { t } = useTranslation();

  return (
    <TouchableOpacity onPress={onPress}>
      <Card.Title
        title={item.name}
        subtitle={item.industry || t('globalSearch.noIndustry')}
        left={(props) => (
          <Avatar.Icon {...props} icon="domain" size={40} />
        )}
        style={{ paddingVertical: 8 }}
      />
    </TouchableOpacity>
  );
}

// Interaction result card
function InteractionResult({ item, onPress }) {
  const theme = useTheme();
  const { t } = useTranslation();

  const interactionType = item.custom_type || item.interaction_type;
  const interactionIcon = getInteractionIcon(interactionType);

  return (
    <TouchableOpacity onPress={onPress}>
      <Card.Title
        title={item.title || t('globalSearch.untitled')}
        subtitle={`${item.contact_name} • ${formatDateSmart(item.interaction_datetime)}`}
        left={(props) => (
          <Avatar.Icon {...props} icon={interactionIcon} size={40} />
        )}
        style={{ paddingVertical: 8 }}
      />
    </TouchableOpacity>
  );
}

// Event result card
function EventResult({ item, onPress }) {
  const theme = useTheme();
  const { t } = useTranslation();

  return (
    <TouchableOpacity onPress={onPress}>
      <Card.Title
        title={item.title}
        subtitle={`${formatDateSmart(item.event_date)}${item.location ? ' • ' + item.location : ''}`}
        description={item.contact_name || null}
        left={(props) => (
          <Avatar.Icon {...props} icon="calendar" size={40} />
        )}
        style={{ paddingVertical: 8 }}
      />
    </TouchableOpacity>
  );
}

// Note result card
function NoteResult({ item, onPress }) {
  const theme = useTheme();
  const { t } = useTranslation();

  // Truncate note content
  const truncatedContent = item.content.length > 100
    ? item.content.substring(0, 100) + '...'
    : item.content;

  return (
    <TouchableOpacity onPress={onPress}>
      <Card.Title
        title={truncatedContent}
        subtitle={item.related_name || t('globalSearch.note')}
        left={(props) => (
          <Avatar.Icon
            {...props}
            icon={item.is_pinned ? "pin" : "note-text"}
            size={40}
          />
        )}
        style={{ paddingVertical: 8 }}
      />
    </TouchableOpacity>
  );
}

// Helper function to get interaction icon
function getInteractionIcon(type) {
  const iconMap = {
    call: 'phone',
    text: 'message',
    email: 'email',
    meeting: 'account-group',
    note: 'note-text',
  };
  return iconMap[type] || 'format-list-bulleted';
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchbar: {
    margin: 16,
    marginBottom: 8,
  },
  listContent: {
    paddingBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
});
