import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { contactsDB, contactsInfoDB, categoriesRelationsDB, transaction } from '../../database';
import { safeTrim, normalizeTrimLowercase, filterNonEmptyStrings } from '../../utils/stringHelpers';
import { invalidateQueries, createMutationHandlers } from './queryHelpers';

/**
 * Query keys for contact-related queries
 */
export const contactKeys = {
  all: ['contacts'],
  lists: () => [...contactKeys.all, 'list'],
  list: (filters) => [...contactKeys.lists(), filters],
  listsWithInfo: () => [...contactKeys.all, 'list-with-info'],
  details: () => [...contactKeys.all, 'detail'],
  detail: (id) => [...contactKeys.details(), id],
  favorites: () => [...contactKeys.all, 'favorites'],
  search: (query) => [...contactKeys.all, 'search', query],
};

/**
 * Fetch all contacts (basic data only)
 */
export function useContacts(options) {
  return useQuery({
    queryKey: contactKeys.lists(),
    queryFn: () => contactsDB.getAll(options),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    ...options,
  });
}

/**
 * Fetch all contacts enriched with contact_info and categories
 * This replaces the manual useEffect pattern in ContactsList
 */
export function useContactsWithInfo(options) {
  return useQuery({
    queryKey: contactKeys.listsWithInfo(),
    queryFn: async () => {
      const contacts = await contactsDB.getAll(options);

      if (!contacts.length) {
        return [];
      }

      // Batch fetch related data to avoid N+1 queries
      const ids = contacts.map(c => c.id);

      // 1) All contact_info rows for these contacts
      const allInfoRows = await contactsInfoDB.getAllInfoForContacts(ids);
      const infoByContact = new Map();
      for (const row of allInfoRows) {
        const list = infoByContact.get(row.contact_id) || [];
        list.push(row);
        infoByContact.set(row.contact_id, list);
      }

      // 2) All categories for these contacts
      const allCatRows = await categoriesRelationsDB.getCategoriesForContacts(ids);
      const catsByContact = new Map();
      for (const row of allCatRows) {
        const list = catsByContact.get(row.contact_id) || [];
        const { contact_id, ...cat } = row;
        list.push(cat);
        catsByContact.set(row.contact_id, list);
      }

      // Merge and enrich contacts
      return contacts.map(c => {
        const contact_info = infoByContact.get(c.id) || [];
        const phones = contact_info.filter(i => i.type === 'phone');
        const emails = contact_info.filter(i => i.type === 'email');
        const phone = phones.find(p => p.is_primary)?.value || phones[0]?.value || null;
        const email = emails.find(e => e.is_primary)?.value || emails[0]?.value || null;
        const categories = catsByContact.get(c.id) || [];

        return { ...c, contact_info, phone, email, categories };
      });
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    ...options,
  });
}

/**
 * Fetch single contact with details (contact info, categories, etc.)
 */
export function useContact(id, options = {}) {
  return useQuery({
    queryKey: contactKeys.detail(id),
    queryFn: () => contactsInfoDB.getWithContactInfo(id),
    enabled: !!id,
    ...options,
  });
}

/**
 * Fetch favorite contacts
 */
export function useFavoriteContacts(options = {}) {
  return useQuery({
    queryKey: contactKeys.favorites(),
    queryFn: () => contactsDB.getFavorites(),
    ...options,
  });
}

/**
 * Search contacts
 */
export function useContactSearch(query, options = {}) {
  return useQuery({
    queryKey: contactKeys.search(query),
    queryFn: () => contactsDB.search(query),
    enabled: query.length >= 2, // Only search with 2+ characters
    ...options,
  });
}

/**
 * Create contact mutation (basic - just contact data)
 */
export function useCreateContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (contactData) => contactsDB.create(contactData),
    ...createMutationHandlers(
      queryClient,
      [contactKeys.lists(), contactKeys.listsWithInfo()],
      { context: 'useCreateContact' }
    ),
  });
}

/**
 * Create contact with full details (contact_info, categories) in a transaction
 * Replaces the complex logic in AddContactModal
 */
export function useCreateContactWithDetails() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ firstName, lastName, phones = [], emails = [], categoryIds = [] }) => {
      if (typeof transaction === 'function') {
        // Use transaction for atomic writes
        let contactId;
        await transaction(async (tx) => {
          const displayName = filterNonEmptyStrings([firstName, lastName]).join(' ') || 'Unnamed Contact';

          // Create contact
          const insertContact = await tx.execute(
            'INSERT INTO contacts (first_name, last_name, display_name) VALUES (?, ?, ?);',
            [safeTrim(firstName), safeTrim(lastName), displayName]
          );

          // Validate insertId exists (allowing 0 as valid ID)
          if (typeof insertContact.insertId === 'undefined' || insertContact.insertId === null) {
            throw new Error('Failed to create contact: insertId is missing from database response');
          }
          contactId = insertContact.insertId;

          // Insert phones
          for (let i = 0; i < phones.length; i++) {
            const phone = phones[i];
            await tx.execute(
              'INSERT INTO contact_info (type, label, value, is_primary, contact_id, created_at) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP);',
              ['phone', phone.label, safeTrim(phone.value), i === 0 ? 1 : 0, contactId]
            );
          }

          // Insert emails
          for (let i = 0; i < emails.length; i++) {
            const email = emails[i];
            const isPrimary = phones.length === 0 && i === 0 ? 1 : 0;
            await tx.execute(
              'INSERT INTO contact_info (type, label, value, is_primary, contact_id, created_at) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP);',
              ['email', email.label, normalizeTrimLowercase(email.value), isPrimary, contactId]
            );
          }

          // Insert category relations
          const uniqueCats = Array.from(new Set(categoryIds));
          for (const categoryId of uniqueCats) {
            try {
              await tx.execute(
                'INSERT INTO contact_categories (contact_id, category_id) VALUES (?, ?);',
                [contactId, categoryId]
              );
            } catch (e) {
              const msg = String(e?.message || e?.originalError?.message || '');
              if (!msg.includes('UNIQUE constraint failed')) throw e;
            }
          }
        });
        return { id: contactId };
      } else {
        // Fallback without transaction
        const contact = await contactsDB.create({
          first_name: safeTrim(firstName),
          last_name: safeTrim(lastName),
        });

        const contactInfoItems = [];
        phones.forEach((phone, index) => {
          contactInfoItems.push({
            type: 'phone',
            label: phone.label,
            value: safeTrim(phone.value),
            is_primary: index === 0,
          });
        });
        emails.forEach((email, index) => {
          contactInfoItems.push({
            type: 'email',
            label: email.label,
            value: normalizeTrimLowercase(email.value),
            is_primary: phones.length === 0 && index === 0,
          });
        });

        await contactsInfoDB.addContactInfo(contact.id, contactInfoItems);

        for (const categoryId of categoryIds) {
          await categoriesRelationsDB.addContactToCategory(contact.id, categoryId);
        }

        return contact;
      }
    },
    ...createMutationHandlers(
      queryClient,
      [contactKeys.lists(), contactKeys.listsWithInfo()],
      { context: 'useCreateContactWithDetails' }
    ),
  });
}

/**
 * Update contact mutation
 */
export function useUpdateContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => contactsDB.update(id, data),
    ...createMutationHandlers(
      queryClient,
      [contactKeys.details(), contactKeys.lists(), contactKeys.listsWithInfo()],
      {
        context: 'useUpdateContact',
        onSuccess: (_, { id }) => {
          // Additional invalidation for specific contact detail
          invalidateQueries(queryClient, contactKeys.detail(id));
        }
      }
    ),
  });
}

/**
 * Delete contact mutation
 */
export function useDeleteContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => contactsDB.delete(id),
    ...createMutationHandlers(
      queryClient,
      contactKeys.all,
      { context: 'useDeleteContact' }
    ),
  });
}

/**
 * Toggle favorite mutation with optimistic update
 */
export function useToggleFavorite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => contactsDB.toggleFavorite(id),

    // Optimistic update
    onMutate: async (id) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: contactKeys.detail(id) });

      // Snapshot previous value
      const previousContact = queryClient.getQueryData(contactKeys.detail(id));

      // Optimistically update
      if (previousContact) {
        queryClient.setQueryData(contactKeys.detail(id), {
          ...previousContact,
          is_favorite: !previousContact.is_favorite,
        });
      }

      return { previousContact };
    },

    // Rollback on error
    onError: (err, id, context) => {
      if (context?.previousContact) {
        queryClient.setQueryData(contactKeys.detail(id), context.previousContact);
      }
    },

    // Refetch on success or error
    onSettled: (_, __, id) => {
      invalidateQueries(queryClient, contactKeys.detail(id), contactKeys.favorites());
    },
  });
}
