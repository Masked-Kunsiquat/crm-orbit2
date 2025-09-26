/**
 * Contact synchronization service for device/CRM contacts integration
 * Handles importing, exporting, and syncing contacts with device contact store
 */

import * as Contacts from 'expo-contacts';
import db from '../database';
import { ServiceError } from './errors';

/**
 * Contact sync service error codes
 */
const CONTACT_SYNC_ERROR_CODES = {
  PERMISSION_DENIED: 'CONTACT_SYNC_PERMISSION_DENIED',
  IMPORT_ERROR: 'CONTACT_SYNC_IMPORT_ERROR',
  EXPORT_ERROR: 'CONTACT_SYNC_EXPORT_ERROR',
  DEVICE_ERROR: 'CONTACT_SYNC_DEVICE_ERROR',
  CONFLICT_RESOLUTION_ERROR: 'CONTACT_SYNC_CONFLICT_ERROR',
  VALIDATION_ERROR: 'CONTACT_SYNC_VALIDATION_ERROR',
};

/**
 * Contact field mapping between Expo contacts and CRM fields
 */
const CONTACT_FIELD_MAPPING = {
  // Basic info
  firstName: 'first_name',
  middleName: 'middle_name',
  lastName: 'last_name',
  jobTitle: 'job_title',
  imageUri: 'avatar_uri',
  // Note: company will be mapped to company_id via lookup
};

/**
 * Conflict resolution strategies
 */
const CONFLICT_RESOLUTION = {
  SKIP: 'skip', // Skip conflicting contacts
  OVERWRITE: 'overwrite', // Overwrite existing with device data
  MERGE: 'merge', // Merge device data with existing
  CREATE_NEW: 'create_new', // Create new contact with suffix
};

class ContactSyncService {
  constructor() {
    this.permissionsGranted = false;
    this.syncInProgress = false;
  }

  /**
   * Request permissions to access device contacts
   * @returns {Promise<boolean>} Whether permissions were granted
   */
  async requestPermissions() {
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      this.permissionsGranted = status === 'granted';
      return this.permissionsGranted;
    } catch (error) {
      throw new ServiceError(
        'contactSyncService',
        'requestPermissions',
        error,
        CONTACT_SYNC_ERROR_CODES.DEVICE_ERROR
      );
    }
  }

  /**
   * Check if permissions are already granted
   * @returns {Promise<boolean>} Current permissions status
   */
  async checkPermissions() {
    try {
      const { status } = await Contacts.getPermissionsAsync();
      this.permissionsGranted = status === 'granted';
      return this.permissionsGranted;
    } catch (error) {
      throw new ServiceError(
        'contactSyncService',
        'checkPermissions',
        error,
        CONTACT_SYNC_ERROR_CODES.DEVICE_ERROR
      );
    }
  }

  /**
   * Import contacts from device to CRM
   * @param {Object} options - Import options
   * @param {string} [options.conflictResolution=CONFLICT_RESOLUTION.SKIP] - How to handle conflicts
   * @param {Function} [options.onProgress] - Progress callback
   * @param {boolean} [options.importImages=true] - Whether to import contact images
   * @returns {Promise<Object>} Import summary
   */
  async importFromDevice(options = {}) {
    const {
      conflictResolution = CONFLICT_RESOLUTION.SKIP,
      onProgress,
      importImages = true,
    } = options;

    if (this.syncInProgress) {
      throw new ServiceError(
        'contactSyncService',
        'importFromDevice',
        new Error('Sync operation already in progress'),
        CONTACT_SYNC_ERROR_CODES.IMPORT_ERROR
      );
    }

    if (!(await this.checkPermissions())) {
      throw new ServiceError(
        'contactSyncService',
        'importFromDevice',
        new Error('Contacts permission required'),
        CONTACT_SYNC_ERROR_CODES.PERMISSION_DENIED
      );
    }

    this.syncInProgress = true;

    try {
      onProgress?.({
        stage: 'fetching',
        message: 'Fetching device contacts...',
      });

      // Get all device contacts with fields we need
      const { data: deviceContacts } = await Contacts.getContactsAsync({
        fields: [
          Contacts.Fields.Name,
          Contacts.Fields.PhoneNumbers,
          Contacts.Fields.Emails,
          Contacts.Fields.Addresses,
          Contacts.Fields.Company,
          Contacts.Fields.JobTitle,
          Contacts.Fields.Image,
        ],
        sort: Contacts.SortTypes.FirstName,
      });

      onProgress?.({
        stage: 'processing',
        message: `Processing ${deviceContacts.length} device contacts...`,
        total: deviceContacts.length,
      });

      const importResults = {
        total: deviceContacts.length,
        imported: 0,
        skipped: 0,
        errors: [],
        conflicts: [],
      };

      // Process contacts in batches for better performance
      const BATCH_SIZE = 50;
      for (let i = 0; i < deviceContacts.length; i += BATCH_SIZE) {
        const batch = deviceContacts.slice(i, i + BATCH_SIZE);

        for (const [index, deviceContact] of batch.entries()) {
          const overallIndex = i + index;

          try {
            const result = await this._importSingleContact(
              deviceContact,
              conflictResolution,
              importImages
            );

            if (result.imported) {
              importResults.imported++;
            } else if (result.skipped) {
              importResults.skipped++;
              if (result.reason) {
                importResults.conflicts.push({
                  contact: this._getContactDisplayInfo(deviceContact),
                  reason: result.reason,
                });
              }
            }
          } catch (error) {
            importResults.errors.push({
              contact: this._getContactDisplayInfo(deviceContact),
              error: error.message,
            });
          }

          onProgress?.({
            stage: 'processing',
            current: overallIndex + 1,
            total: deviceContacts.length,
            message: `Processed ${overallIndex + 1} of ${deviceContacts.length} contacts`,
          });
        }
      }

      onProgress?.({ stage: 'complete', results: importResults });

      return importResults;
    } catch (error) {
      throw new ServiceError(
        'contactSyncService',
        'importFromDevice',
        error,
        CONTACT_SYNC_ERROR_CODES.IMPORT_ERROR
      );
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Export CRM contacts to device contacts
   * @param {Object} options - Export options
   * @param {Array<number>} [options.contactIds] - Specific contact IDs to export (all if not specified)
   * @param {Function} [options.onProgress] - Progress callback
   * @returns {Promise<Object>} Export summary
   */
  async exportToDevice(options = {}) {
    const { contactIds, onProgress } = options;

    if (!(await this.checkPermissions())) {
      throw new ServiceError(
        'contactSyncService',
        'exportToDevice',
        new Error('Contacts permission required'),
        CONTACT_SYNC_ERROR_CODES.PERMISSION_DENIED
      );
    }

    try {
      onProgress?.({ stage: 'fetching', message: 'Fetching CRM contacts...' });

      // Get contacts to export
      const crmContacts = contactIds
        ? await Promise.all(
            contactIds.map(id => db.contactsInfo.getWithContactInfo(id))
          )
        : await db.contactsInfo.getAll();

      const validContacts = crmContacts.filter(Boolean);

      onProgress?.({
        stage: 'exporting',
        message: `Exporting ${validContacts.length} contacts to device...`,
        total: validContacts.length,
      });

      const exportResults = {
        total: validContacts.length,
        exported: 0,
        errors: [],
      };

      for (const [index, crmContact] of validContacts.entries()) {
        try {
          await this._exportSingleContact(crmContact);
          exportResults.exported++;
        } catch (error) {
          exportResults.errors.push({
            contact:
              crmContact.display_name ||
              `${crmContact.first_name} ${crmContact.last_name}`,
            error: error.message,
          });
        }

        onProgress?.({
          stage: 'exporting',
          current: index + 1,
          total: validContacts.length,
          message: `Exported ${index + 1} of ${validContacts.length} contacts`,
        });
      }

      onProgress?.({ stage: 'complete', results: exportResults });

      return exportResults;
    } catch (error) {
      throw new ServiceError(
        'contactSyncService',
        'exportToDevice',
        error,
        CONTACT_SYNC_ERROR_CODES.EXPORT_ERROR
      );
    }
  }

  /**
   * Import a single contact from device to CRM
   * @private
   * @param {Object} deviceContact - Device contact object
   * @param {string} conflictResolution - Conflict resolution strategy
   * @param {boolean} importImages - Whether to import contact images
   * @returns {Promise<Object>} Import result
   */
  async _importSingleContact(deviceContact, conflictResolution, importImages) {
    // Convert device contact to CRM format
    const crmContactData = await this._convertDeviceContactToCRM(
      deviceContact,
      importImages
    );

    if (!crmContactData.first_name && !crmContactData.last_name) {
      return { skipped: true, reason: 'Contact has no name' };
    }

    // Check for existing contact
    const existingContact = await this._findExistingContact(crmContactData);

    if (existingContact) {
      switch (conflictResolution) {
        case CONFLICT_RESOLUTION.SKIP:
          return {
            skipped: true,
            reason: `Contact already exists: ${existingContact.display_name}`,
          };

        case CONFLICT_RESOLUTION.OVERWRITE:
          await db.contacts.update(existingContact.id, crmContactData);
          await this._updateContactInfo(existingContact.id, deviceContact);
          return { imported: true, updated: true };

        case CONFLICT_RESOLUTION.MERGE:
          const mergedData = this._mergeContactData(
            existingContact,
            crmContactData
          );
          await db.contacts.update(existingContact.id, mergedData);
          await this._mergeContactInfo(existingContact.id, deviceContact);
          return { imported: true, merged: true };

        case CONFLICT_RESOLUTION.CREATE_NEW:
          crmContactData.display_name = `${crmContactData.display_name} (Imported)`;
          break;

        default:
          throw new Error(
            `Invalid conflict resolution strategy: ${conflictResolution}`
          );
      }
    }

    // Create new contact
    const newContact = await db.contacts.create(crmContactData);
    await this._createContactInfo(newContact.id, deviceContact);

    return { imported: true, created: true };
  }

  /**
   * Export a single CRM contact to device contacts
   * @private
   * @param {Object} crmContact - CRM contact with contact_info
   * @returns {Promise<string>} Device contact ID
   */
  async _exportSingleContact(crmContact) {
    const deviceContactData = this._convertCRMContactToDevice(crmContact);
    const deviceContactId = await Contacts.addContactAsync(deviceContactData);
    return deviceContactId;
  }

  /**
   * Convert device contact to CRM format
   * @private
   * @param {Object} deviceContact - Device contact object
   * @param {boolean} importImages - Whether to import contact images
   * @returns {Promise<Object>} CRM contact data
   */
  async _convertDeviceContactToCRM(deviceContact, importImages) {
    const crmContact = {};

    // Map basic fields
    if (deviceContact.firstName)
      crmContact.first_name = deviceContact.firstName;
    if (deviceContact.middleName)
      crmContact.middle_name = deviceContact.middleName;
    if (deviceContact.lastName) crmContact.last_name = deviceContact.lastName;
    if (deviceContact.jobTitle) crmContact.job_title = deviceContact.jobTitle;

    // Handle company - we'll need to look up or create company record
    if (deviceContact.company) {
      crmContact.company_id = await this._getOrCreateCompany(
        deviceContact.company
      );
    }

    // Handle avatar/image
    if (importImages && deviceContact.image && deviceContact.image.uri) {
      crmContact.avatar_uri = deviceContact.image.uri;
    }

    // Compute display name if not set
    if (!crmContact.display_name) {
      const nameParts = [
        crmContact.first_name,
        crmContact.middle_name,
        crmContact.last_name,
      ].filter(Boolean);

      crmContact.display_name =
        nameParts.length > 0 ? nameParts.join(' ') : 'Unknown Contact';
    }

    return crmContact;
  }

  /**
   * Convert CRM contact to device contact format
   * @private
   * @param {Object} crmContact - CRM contact with contact_info
   * @returns {Object} Device contact data
   */
  _convertCRMContactToDevice(crmContact) {
    const deviceContact = {};

    // Map basic fields
    if (crmContact.first_name) deviceContact.firstName = crmContact.first_name;
    if (crmContact.middle_name)
      deviceContact.middleName = crmContact.middle_name;
    if (crmContact.last_name) deviceContact.lastName = crmContact.last_name;
    if (crmContact.job_title) deviceContact.jobTitle = crmContact.job_title;

    // Handle contact info
    if (crmContact.contact_info && crmContact.contact_info.length > 0) {
      const emails = crmContact.contact_info
        .filter(info => info.type === 'email')
        .map(info => ({ email: info.value, label: info.label || 'other' }));

      const phones = crmContact.contact_info
        .filter(info => info.type === 'phone')
        .map(info => ({ number: info.value, label: info.label || 'other' }));

      if (emails.length > 0) deviceContact.emails = emails;
      if (phones.length > 0) deviceContact.phoneNumbers = phones;
    }

    return deviceContact;
  }

  /**
   * Create contact info records for imported contact
   * @private
   * @param {number} contactId - CRM contact ID
   * @param {Object} deviceContact - Device contact object
   */
  async _createContactInfo(contactId, deviceContact) {
    const contactInfoRecords = [];

    // Add emails
    if (deviceContact.emails && deviceContact.emails.length > 0) {
      deviceContact.emails.forEach((email, index) => {
        contactInfoRecords.push({
          contact_id: contactId,
          type: 'email',
          value: email.email,
          label: email.label || 'other',
          is_primary: index === 0, // First email is primary
        });
      });
    }

    // Add phone numbers
    if (deviceContact.phoneNumbers && deviceContact.phoneNumbers.length > 0) {
      deviceContact.phoneNumbers.forEach((phone, index) => {
        contactInfoRecords.push({
          contact_id: contactId,
          type: 'phone',
          value: phone.number,
          label: phone.label || 'other',
          is_primary: index === 0, // First phone is primary
        });
      });
    }

    // Add addresses
    if (deviceContact.addresses && deviceContact.addresses.length > 0) {
      deviceContact.addresses.forEach((address, index) => {
        // Format address as single string
        const addressParts = [
          address.street,
          address.city,
          address.region,
          address.postalCode,
          address.country,
        ].filter(Boolean);

        if (addressParts.length > 0) {
          contactInfoRecords.push({
            contact_id: contactId,
            type: 'address',
            value: addressParts.join(', '),
            label: address.label || 'other',
            is_primary: index === 0, // First address is primary
          });
        }
      });
    }

    // Bulk create contact info records
    if (contactInfoRecords.length > 0) {
      await Promise.all(
        contactInfoRecords.map(record => db.contactsInfo.create(record))
      );
    }
  }

  /**
   * Find existing contact that might match the device contact
   * @private
   * @param {Object} crmContactData - CRM contact data
   * @returns {Promise<Object|null>} Existing contact or null
   */
  async _findExistingContact(crmContactData) {
    // Try to find by exact name match first
    if (crmContactData.first_name && crmContactData.last_name) {
      const contacts = await db.contacts.findByName(
        crmContactData.first_name,
        crmContactData.last_name,
        true // exact match
      );

      return contacts.length > 0 ? contacts[0] : null;
    }

    // Try partial match if we only have one name
    if (crmContactData.first_name || crmContactData.last_name) {
      const contacts = await db.contacts.findByName(
        crmContactData.first_name || '',
        crmContactData.last_name || '',
        false // fuzzy match
      );

      return contacts.length > 0 ? contacts[0] : null;
    }

    return null;
  }

  /**
   * Get or create company record for device contact
   * @private
   * @param {string} companyName - Company name from device contact
   * @returns {Promise<number|null>} Company ID or null
   */
  async _getOrCreateCompany(companyName) {
    if (!companyName || typeof companyName !== 'string') {
      return null;
    }

    try {
      // Try to find existing company
      const companies = await db.companies.getAll({ limit: 50 });
      const existingCompany = companies.find(
        company => company.name.toLowerCase() === companyName.toLowerCase()
      );

      if (existingCompany) {
        return existingCompany.id;
      }

      // Create new company
      const newCompany = await db.companies.create({
        name: companyName.trim(),
        // Add minimal company data - user can enhance later
      });

      return newCompany.id;
    } catch (error) {
      console.warn('Failed to create/lookup company:', error);
      return null;
    }
  }

  /**
   * Get display info for a device contact (for error reporting)
   * @private
   * @param {Object} deviceContact - Device contact
   * @returns {string} Display name
   */
  _getContactDisplayInfo(deviceContact) {
    const nameParts = [
      deviceContact.firstName,
      deviceContact.middleName,
      deviceContact.lastName,
    ].filter(Boolean);

    return nameParts.length > 0
      ? nameParts.join(' ')
      : deviceContact.id || 'Unknown Contact';
  }

  /**
   * Merge contact data (existing CRM + device data)
   * @private
   * @param {Object} existingContact - Existing CRM contact
   * @param {Object} newContactData - New contact data from device
   * @returns {Object} Merged contact data
   */
  _mergeContactData(existingContact, newContactData) {
    const merged = { ...existingContact };

    // Only update fields that are empty in existing contact
    Object.keys(newContactData).forEach(key => {
      if (!merged[key] && newContactData[key]) {
        merged[key] = newContactData[key];
      }
    });

    return merged;
  }

  // Additional helper methods would go here for:
  // - _updateContactInfo
  // - _mergeContactInfo
  // - Batch processing optimizations
  // - Sync status tracking
}

// Create singleton instance
const contactSyncService = new ContactSyncService();

export { CONTACT_SYNC_ERROR_CODES, CONFLICT_RESOLUTION };
export default contactSyncService;
