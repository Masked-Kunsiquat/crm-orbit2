import React, { useState } from 'react';
import { StyleSheet, FlatList, View } from 'react-native';
import { showAlert } from '../errors';
import { Appbar, FAB, Searchbar, Text, Chip, useTheme, Card, IconButton } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import AddCompanyModal from '../components/AddCompanyModal';
import EditCompanyModal from '../components/EditCompanyModal';
import { useCompanies, useDeleteCompany } from '../hooks/queries';
import { INDUSTRIES } from '../constants/industries';

export default function CompanyListScreen({ navigation }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCompany, setEditingCompany] = useState(null);
  const [selectedIndustry, setSelectedIndustry] = useState(null);

  // Use TanStack Query for companies data
  const {
    data: companies = [],
    isLoading: loading,
    refetch,
    isFetching: refreshing
  } = useCompanies();

  const deleteCompany = useDeleteCompany();

  const handleRefresh = async () => {
    await refetch();
  };

  const handleCompanyPress = (company) => {
    // Navigate to company detail screen (to be implemented)
    // For now, open edit modal
    setEditingCompany(company);
  };

  const handleAddCompany = () => {
    setShowAddModal(true);
  };

  const handleDeleteCompany = (company) => {
    showAlert.confirmDelete(
      t('companies.list.delete.title'),
      t('companies.list.delete.message', { name: company.name }),
      async () => {
        try {
          await deleteCompany.mutateAsync(company.id);
          showAlert.success(t('labels.success'), t('companies.list.delete.success'));
        } catch (error) {
          showAlert.error(t('companies.list.delete.error.title'), t('companies.list.delete.error.message'));
        }
      }
    );
  };

  // Filter by industry
  const industryFilteredCompanies = React.useMemo(() => {
    if (!selectedIndustry) return companies;
    return companies.filter(company => company.industry === selectedIndustry);
  }, [companies, selectedIndustry]);

  // Filter by search query
  const filteredCompanies = React.useMemo(() => {
    if (!searchQuery) return industryFilteredCompanies;
    const query = searchQuery.toLowerCase();
    return industryFilteredCompanies.filter(company => {
      const name = (company.name || '').toLowerCase();
      const industry = (company.industry || '').toLowerCase();
      const address = (company.address || '').toLowerCase();

      return name.includes(query) ||
             industry.includes(query) ||
             address.includes(query);
    });
  }, [industryFilteredCompanies, searchQuery]);

  const renderCompany = ({ item }) => (
    <Card
      style={styles.card}
      onPress={() => handleCompanyPress(item)}
    >
      <Card.Content style={styles.cardContent}>
        <View style={styles.companyInfo}>
          {item.logo_attachment_id ? (
            <View style={[styles.logoContainer, { backgroundColor: theme.colors.primaryContainer }]}>
              <IconButton icon="office-building" size={24} iconColor={theme.colors.primary} />
            </View>
          ) : (
            <View style={[styles.logoPlaceholder, { backgroundColor: theme.colors.surfaceVariant }]}>
              <Text variant="titleMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                {item.name?.charAt(0)?.toUpperCase() || '?'}
              </Text>
            </View>
          )}

          <View style={styles.details}>
            <Text variant="titleMedium" style={styles.companyName}>
              {item.name}
            </Text>
            {item.industry && (
              <Text variant="bodySmall" style={styles.industry}>
                {item.industry}
              </Text>
            )}
            {item.address && (
              <Text variant="bodySmall" style={styles.address} numberOfLines={1}>
                {item.address}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.actions}>
          <IconButton
            icon="pencil"
            size={20}
            onPress={() => setEditingCompany(item)}
          />
          <IconButton
            icon="delete"
            size={20}
            onPress={() => handleDeleteCompany(item)}
          />
        </View>
      </Card.Content>
    </Card>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text variant="headlineSmall" style={styles.emptyTitle}>
        {t('companies.list.empty.title')}
      </Text>
      <Text variant="bodyMedium" style={styles.emptyMessage}>
        {searchQuery
          ? t('companies.list.empty.noResults')
          : t('companies.list.empty.addFirst')}
      </Text>
    </View>
  );

  // Get unique industries from companies for filter chips
  const availableIndustries = React.useMemo(() => {
    const industries = new Set(
      companies
        .map(c => c.industry)
        .filter(industry => industry && INDUSTRIES.includes(industry))
    );
    return Array.from(industries).sort();
  }, [companies]);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors?.background }]}>
      <Appbar.Header>
        <Appbar.Content title={t('companies.list.title')} />
      </Appbar.Header>

      <Searchbar
        placeholder={t('companies.list.searchPlaceholder')}
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchbar}
      />

      {/* Industry Filter */}
      {availableIndustries.length > 0 && (
        <View style={styles.industryFilter}>
          <Chip
            selected={!selectedIndustry}
            onPress={() => setSelectedIndustry(null)}
            style={styles.industryChip}
            mode="flat"
            compact
          >
            {t('common.all')}
          </Chip>
          {availableIndustries.map((industry) => (
            <Chip
              key={industry}
              selected={selectedIndustry === industry}
              onPress={() => setSelectedIndustry(industry)}
              style={styles.industryChip}
              mode="flat"
              compact
            >
              {industry}
            </Chip>
          ))}
        </View>
      )}

      <FlatList
        data={filteredCompanies}
        renderItem={renderCompany}
        keyExtractor={(item) => item.id.toString()}
        style={styles.list}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        ListEmptyComponent={!loading ? renderEmptyState : null}
        contentContainerStyle={filteredCompanies.length === 0 ? styles.emptyContainer : null}
      />

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={handleAddCompany}
      />

      <AddCompanyModal
        visible={showAddModal}
        onDismiss={() => setShowAddModal(false)}
      />

      <EditCompanyModal
        visible={!!editingCompany}
        company={editingCompany}
        onDismiss={() => setEditingCompany(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  searchbar: {
    margin: 16,
    marginBottom: 8,
  },
  industryFilter: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingVertical: 4,
    gap: 8,
    marginBottom: 8,
  },
  industryChip: {
    height: 32,
  },
  list: {
    flex: 1,
  },
  card: {
    marginHorizontal: 16,
    marginVertical: 4,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  companyInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  logoContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  logoPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  details: {
    flex: 1,
  },
  companyName: {
    fontWeight: '600',
    marginBottom: 2,
  },
  industry: {
    color: '#666',
    marginBottom: 2,
  },
  address: {
    color: '#888',
    fontSize: 12,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 48,
  },
  emptyTitle: {
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyMessage: {
    textAlign: 'center',
    color: '#666',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
});
