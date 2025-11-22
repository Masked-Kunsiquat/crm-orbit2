import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { companiesDB } from '../../database';
import { invalidateQueries, createMutationHandlers } from './queryHelpers';
import { logger } from '../../errors';

/**
 * Query keys for company-related queries
 */
export const companyKeys = {
  all: ['companies'],
  lists: () => [...companyKeys.all, 'list'],
  list: filters => [...companyKeys.lists(), filters],
  details: () => [...companyKeys.all, 'detail'],
  detail: id => [...companyKeys.details(), id],
  withContacts: id => [...companyKeys.all, 'with-contacts', id],
  search: query => [...companyKeys.all, 'search', query],
};

/**
 * Fetch all companies with optional filtering
 *
 * @param {Object} options - Query options
 * @param {number} options.limit - Max number of results
 * @param {number} options.offset - Pagination offset
 * @param {string} options.orderBy - Sort field (name, industry, created_at)
 * @param {string} options.orderDir - Sort direction (ASC, DESC)
 * @param {string} options.industry - Filter by industry
 */
export function useCompanies(options = {}) {
  return useQuery({
    queryKey: companyKeys.list(options),
    queryFn: () => companiesDB.getAll(options),
    staleTime: 10 * 60 * 1000, // 10 minutes (companies change infrequently)
    gcTime: 30 * 60 * 1000, // 30 minutes
    ...options,
  });
}

/**
 * Fetch a single company by ID
 */
export function useCompany(id, options = {}) {
  return useQuery({
    queryKey: companyKeys.detail(id),
    queryFn: () => companiesDB.getById(id),
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    enabled: !!id,
    ...options,
  });
}

/**
 * Fetch a company with its contacts
 */
export function useCompanyWithContacts(id, options = {}) {
  return useQuery({
    queryKey: companyKeys.withContacts(id),
    queryFn: () => companiesDB.getWithContacts(id),
    staleTime: 5 * 60 * 1000, // 5 minutes (contacts may change more frequently)
    gcTime: 10 * 60 * 1000,
    enabled: !!id,
    ...options,
  });
}

/**
 * Search companies by query string
 */
export function useCompanySearch(query, options = {}) {
  return useQuery({
    queryKey: companyKeys.search(query),
    queryFn: () => companiesDB.search(query),
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000,
    enabled: query?.length > 0,
    ...options,
  });
}

/**
 * Create a new company
 */
export function useCreateCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: data => companiesDB.create(data),
    ...createMutationHandlers(queryClient, companyKeys.all, {
      context: 'useCreateCompany',
      successMessage: 'Company created successfully',
    }),
  });
}

/**
 * Update an existing company
 */
export function useUpdateCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => companiesDB.update(id, data),
    ...createMutationHandlers(queryClient, companyKeys.all, {
      context: 'useUpdateCompany',
      successMessage: 'Company updated successfully',
    }),
  });
}

/**
 * Delete a company
 */
export function useDeleteCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: id => companiesDB.delete(id),
    ...createMutationHandlers(queryClient, companyKeys.all, {
      context: 'useDeleteCompany',
      successMessage: 'Company deleted successfully',
    }),
  });
}

/**
 * Update company logo
 */
export function useUpdateCompanyLogo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, attachmentId }) =>
      companiesDB.updateLogo(id, attachmentId),
    ...createMutationHandlers(queryClient, companyKeys.all, {
      context: 'useUpdateCompanyLogo',
      successMessage: 'Company logo updated successfully',
    }),
  });
}

/**
 * Merge two companies
 */
export function useMergeCompanies() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ keepId, mergeId }) =>
      companiesDB.mergeCompanies(keepId, mergeId),
    onSuccess: () => {
      // Invalidate both company and contact queries since contacts may be reassigned
      invalidateQueries(
        queryClient,
        companyKeys.all,
        ['contacts'] // Contact keys
      );
    },
    onError: error => {
      logger.error('useMergeCompanies', 'mutation failed', error);
    },
  });
}
