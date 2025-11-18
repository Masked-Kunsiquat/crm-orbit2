import React, { useState, useCallback, useMemo } from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import {
  Modal,
  Portal,
  Text,
  Button,
  Chip,
  SegmentedButtons,
  useTheme,
  IconButton,
} from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import DateTimePicker from '@react-native-community/datetimepicker';
import { logger } from '../errors/utils/errorLogger';

export default function FilterBottomSheet({
  visible,
  onDismiss,
  onApply,
  categories = [],
  companies = [],
  initialFilters = {},
}) {
  const theme = useTheme();
  const { t } = useTranslation();

  // Filter state
  const [selectedCategories, setSelectedCategories] = useState(initialFilters.categoryIds || []);
  const [categoryLogic, setCategoryLogic] = useState(initialFilters.categoryLogic || 'OR');
  const [selectedCompany, setSelectedCompany] = useState(initialFilters.companyId || null);
  const [dateAddedRange, setDateAddedRange] = useState(initialFilters.dateAddedRange || null);
  const [interactionDays, setInteractionDays] = useState(initialFilters.interactionDays || null);
  const [hasUpcomingEvents, setHasUpcomingEvents] = useState(initialFilters.hasUpcomingEvents || false);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);

  const toggleCategory = useCallback((categoryId) => {
    setSelectedCategories((prev) => {
      if (prev.includes(categoryId)) {
        return prev.filter((id) => id !== categoryId);
      }
      return [...prev, categoryId];
    });
  }, []);

  const handleApply = useCallback(() => {
    const filters = {
      categoryIds: selectedCategories.length > 0 ? selectedCategories : null,
      categoryLogic: selectedCategories.length > 1 ? categoryLogic : null,
      companyId: selectedCompany,
      dateAddedRange,
      interactionDays,
      hasUpcomingEvents: hasUpcomingEvents || null,
    };

    logger.success('FilterBottomSheet', 'handleApply', { filters });
    onApply(filters);
    onDismiss();
  }, [selectedCategories, categoryLogic, selectedCompany, dateAddedRange, interactionDays, hasUpcomingEvents, onApply, onDismiss]);

  const handleClear = useCallback(() => {
    setSelectedCategories([]);
    setCategoryLogic('OR');
    setSelectedCompany(null);
    setDateAddedRange(null);
    setInteractionDays(null);
    setHasUpcomingEvents(false);
  }, []);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedCategories.length > 0) count++;
    if (selectedCompany) count++;
    if (dateAddedRange) count++;
    if (interactionDays) count++;
    if (hasUpcomingEvents) count++;
    return count;
  }, [selectedCategories, selectedCompany, dateAddedRange, interactionDays, hasUpcomingEvents]);

  const handleStartDateChange = useCallback((event, selectedDate) => {
    setShowStartDatePicker(false);
    if (selectedDate) {
      setDateAddedRange((prev) => ({
        start: selectedDate.toISOString().split('T')[0],
        end: prev?.end || null,
      }));
    }
  }, []);

  const handleEndDateChange = useCallback((event, selectedDate) => {
    setShowEndDatePicker(false);
    if (selectedDate) {
      setDateAddedRange((prev) => ({
        start: prev?.start || null,
        end: selectedDate.toISOString().split('T')[0],
      }));
    }
  }, []);

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={[
          styles.modal,
          { backgroundColor: theme.colors.surface }
        ]}
      >
        <View style={styles.header}>
          <Text variant="titleLarge">{t('filters.title')}</Text>
          <IconButton icon="close" onPress={onDismiss} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Categories Section */}
          {categories.length > 0 && (
            <View style={styles.section}>
              <Text variant="titleMedium" style={styles.sectionTitle}>
                {t('filters.categories')}
              </Text>
              <View style={styles.chips}>
                {categories.map((category) => (
                  <Chip
                    key={category.id}
                    selected={selectedCategories.includes(category.id)}
                    onPress={() => toggleCategory(category.id)}
                    style={styles.chip}
                    mode="outlined"
                  >
                    {category.name}
                  </Chip>
                ))}
              </View>

              {selectedCategories.length > 1 && (
                <View style={styles.logicSection}>
                  <Text variant="bodySmall" style={styles.logicLabel}>
                    {t('filters.categoryLogic')}
                  </Text>
                  <SegmentedButtons
                    value={categoryLogic}
                    onValueChange={setCategoryLogic}
                    buttons={[
                      { value: 'OR', label: t('filters.or') },
                      { value: 'AND', label: t('filters.and') },
                    ]}
                    style={styles.segmentedButtons}
                  />
                </View>
              )}
            </View>
          )}

          {/* Company Filter */}
          {companies.length > 0 && (
            <View style={styles.section}>
              <Text variant="titleMedium" style={styles.sectionTitle}>
                {t('filters.company')}
              </Text>
              <View style={styles.chips}>
                <Chip
                  selected={!selectedCompany}
                  onPress={() => setSelectedCompany(null)}
                  style={styles.chip}
                  mode="outlined"
                >
                  {t('common.all')}
                </Chip>
                {companies.map((company) => (
                  <Chip
                    key={company.id}
                    selected={selectedCompany === company.id}
                    onPress={() => setSelectedCompany(company.id)}
                    style={styles.chip}
                    mode="outlined"
                  >
                    {company.name}
                  </Chip>
                ))}
              </View>
            </View>
          )}

          {/* Date Added Range */}
          <View style={styles.section}>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              {t('filters.dateAdded')}
            </Text>
            <View style={styles.dateButtons}>
              <Button
                mode="outlined"
                onPress={() => setShowStartDatePicker(true)}
                style={styles.dateButton}
              >
                {dateAddedRange?.start || t('filters.startDate')}
              </Button>
              <Text variant="bodyMedium" style={styles.dateSeparator}>
                {t('filters.to')}
              </Text>
              <Button
                mode="outlined"
                onPress={() => setShowEndDatePicker(true)}
                style={styles.dateButton}
              >
                {dateAddedRange?.end || t('filters.endDate')}
              </Button>
            </View>
            {dateAddedRange && (
              <Button
                mode="text"
                onPress={() => setDateAddedRange(null)}
                compact
              >
                {t('filters.clearDateRange')}
              </Button>
            )}
          </View>

          {/* Interaction Activity */}
          <View style={styles.section}>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              {t('filters.interactionActivity')}
            </Text>
            <View style={styles.chips}>
              <Chip
                selected={!interactionDays}
                onPress={() => setInteractionDays(null)}
                style={styles.chip}
                mode="outlined"
              >
                {t('common.all')}
              </Chip>
              <Chip
                selected={interactionDays === 7}
                onPress={() => setInteractionDays(7)}
                style={styles.chip}
                mode="outlined"
              >
                {t('filters.last7Days')}
              </Chip>
              <Chip
                selected={interactionDays === 30}
                onPress={() => setInteractionDays(30)}
                style={styles.chip}
                mode="outlined"
              >
                {t('filters.last30Days')}
              </Chip>
              <Chip
                selected={interactionDays === 90}
                onPress={() => setInteractionDays(90)}
                style={styles.chip}
                mode="outlined"
              >
                {t('filters.last90Days')}
              </Chip>
            </View>
          </View>

          {/* Has Upcoming Events */}
          <View style={styles.section}>
            <Chip
              selected={hasUpcomingEvents}
              onPress={() => setHasUpcomingEvents(!hasUpcomingEvents)}
              icon={hasUpcomingEvents ? 'check' : undefined}
              mode="outlined"
            >
              {t('filters.hasUpcomingEvents')}
            </Chip>
          </View>
        </ScrollView>

        {/* Footer Actions */}
        <View style={styles.footer}>
          <Button
            mode="outlined"
            onPress={handleClear}
            style={styles.footerButton}
          >
            {t('filters.clear')}
          </Button>
          <Button
            mode="contained"
            onPress={handleApply}
            style={styles.footerButton}
          >
            {t('filters.apply')}
            {activeFilterCount > 0 && ` (${activeFilterCount})`}
          </Button>
        </View>

        {/* Date Pickers */}
        {showStartDatePicker && (
          <DateTimePicker
            value={dateAddedRange?.start ? new Date(dateAddedRange.start) : new Date()}
            mode="date"
            display="default"
            onChange={handleStartDateChange}
          />
        )}
        {showEndDatePicker && (
          <DateTimePicker
            value={dateAddedRange?.end ? new Date(dateAddedRange.end) : new Date()}
            mode="date"
            display="default"
            onChange={handleEndDateChange}
          />
        )}
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modal: {
    margin: 20,
    borderRadius: 12,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 8,
  },
  content: {
    paddingHorizontal: 16,
    maxHeight: 500,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    marginBottom: 12,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    marginBottom: 8,
  },
  logicSection: {
    marginTop: 12,
  },
  logicLabel: {
    marginBottom: 8,
    opacity: 0.7,
  },
  segmentedButtons: {
    width: 200,
  },
  dateButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateButton: {
    flex: 1,
  },
  dateSeparator: {
    paddingHorizontal: 4,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    gap: 12,
  },
  footerButton: {
    flex: 1,
  },
});
