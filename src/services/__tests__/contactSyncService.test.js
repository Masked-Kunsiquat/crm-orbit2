// Unit tests for contactSyncService

// Mock expo-contacts before importing
jest.mock('expo-contacts', () => ({
  Fields: {
    Name: 'name',
    PhoneNumbers: 'phoneNumbers',
    Emails: 'emails',
    Addresses: 'addresses',
    Company: 'company',
    JobTitle: 'jobTitle',
    Image: 'image',
  },
  SortTypes: {
    FirstName: 'firstName',
    LastName: 'lastName',
  },
  requestPermissionsAsync: jest.fn(),
  getPermissionsAsync: jest.fn(),
  getContactsAsync: jest.fn(),
  getContactByIdAsync: jest.fn(),
  addContactAsync: jest.fn(),
  updateContactAsync: jest.fn(),
  removeContactAsync: jest.fn(),
}), { virtual: true });

import * as Contacts from 'expo-contacts';
import contactSyncService, { CONTACT_SYNC_ERROR_CODES, CONFLICT_RESOLUTION } from '../contactSyncService';
import db from '../../database';

// Mock the database
jest.mock('../../database');

describe('ContactSyncService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    contactSyncService.permissionsGranted = false;
    contactSyncService.syncInProgress = false;
  });

  describe('permissions', () => {
    test('requestPermissions should request and set permissions status', async () => {
      Contacts.requestPermissionsAsync.mockResolvedValue({ status: 'granted' });

      const result = await contactSyncService.requestPermissions();

      expect(result).toBe(true);
      expect(contactSyncService.permissionsGranted).toBe(true);
      expect(Contacts.requestPermissionsAsync).toHaveBeenCalled();
    });

    test('requestPermissions should handle denied permissions', async () => {
      Contacts.requestPermissionsAsync.mockResolvedValue({ status: 'denied' });

      const result = await contactSyncService.requestPermissions();

      expect(result).toBe(false);
      expect(contactSyncService.permissionsGranted).toBe(false);
    });

    test('checkPermissions should check current permissions status', async () => {
      Contacts.getPermissionsAsync.mockResolvedValue({ status: 'granted' });

      const result = await contactSyncService.checkPermissions();

      expect(result).toBe(true);
      expect(contactSyncService.permissionsGranted).toBe(true);
      expect(Contacts.getPermissionsAsync).toHaveBeenCalled();
    });
  });

  describe('importFromDevice', () => {
    const mockDeviceContacts = [
      {
        id: '1',
        firstName: 'John',
        lastName: 'Doe',
        phoneNumbers: [{ number: '+1234567890', label: 'mobile' }],
        emails: [{ email: 'john.doe@example.com', label: 'work' }],
        company: 'Test Company',
        jobTitle: 'Developer'
      },
      {
        id: '2',
        firstName: 'Jane',
        lastName: 'Smith',
        emails: [{ email: 'jane.smith@example.com', label: 'personal' }]
      }
    ];

    beforeEach(() => {
      Contacts.getPermissionsAsync.mockResolvedValue({ status: 'granted' });
      Contacts.getContactsAsync.mockResolvedValue({ data: mockDeviceContacts });
      db.contacts.findByName = jest.fn().mockResolvedValue([]);
      db.contacts.create = jest.fn().mockImplementation(data => ({ id: 123, ...data }));
      db.contactsInfo.create = jest.fn().mockResolvedValue({ id: 456 });
      db.companies.getAll = jest.fn().mockResolvedValue([]);
      db.companies.create = jest.fn().mockImplementation(data => ({ id: 789, ...data }));
    });

    test('should throw error if permissions not granted', async () => {
      Contacts.getPermissionsAsync.mockResolvedValue({ status: 'denied' });

      await expect(contactSyncService.importFromDevice()).rejects.toThrow();
    });

    test('should throw error if sync already in progress', async () => {
      contactSyncService.syncInProgress = true;

      await expect(contactSyncService.importFromDevice()).rejects.toMatchObject({
        code: CONTACT_SYNC_ERROR_CODES.IMPORT_ERROR
      });
    });

    test('should import contacts successfully with SKIP resolution', async () => {
      const onProgress = jest.fn();

      const result = await contactSyncService.importFromDevice({
        conflictResolution: CONFLICT_RESOLUTION.SKIP,
        onProgress
      });

      expect(result.total).toBe(2);
      expect(result.imported).toBe(2);
      expect(result.skipped).toBe(0);
      expect(result.errors).toHaveLength(0);

      expect(db.contacts.create).toHaveBeenCalledTimes(2);
      expect(db.contactsInfo.create).toHaveBeenCalled();
      expect(onProgress).toHaveBeenCalledWith(
        expect.objectContaining({ stage: 'fetching' })
      );
      expect(onProgress).toHaveBeenCalledWith(
        expect.objectContaining({ stage: 'complete' })
      );
    });

    test('should skip existing contacts with SKIP resolution', async () => {
      // Mock existing contact found
      db.contacts.findByName.mockResolvedValueOnce([
        { id: 1, first_name: 'John', last_name: 'Doe', display_name: 'John Doe' }
      ]);

      const result = await contactSyncService.importFromDevice({
        conflictResolution: CONFLICT_RESOLUTION.SKIP
      });

      expect(result.imported).toBe(1); // Only Jane Smith imported
      expect(result.skipped).toBe(1); // John Doe skipped
      expect(result.conflicts).toHaveLength(1);
      expect(result.conflicts[0].reason).toContain('already exists');
    });

    test('should handle contacts without names gracefully', async () => {
      const contactsWithoutNames = [
        {
          id: '3',
          phoneNumbers: [{ number: '+1111111111', label: 'mobile' }]
        }
      ];

      Contacts.getContactsAsync.mockResolvedValue({ data: contactsWithoutNames });

      const result = await contactSyncService.importFromDevice();

      expect(result.imported).toBe(0);
      expect(result.skipped).toBe(1);
      expect(result.conflicts[0].reason).toBe('Contact has no name');
    });

    test('should create companies when importing contacts', async () => {
      const result = await contactSyncService.importFromDevice();

      expect(db.companies.create).toHaveBeenCalledWith({
        name: 'Test Company'
      });
      expect(result.imported).toBe(2);
    });

    test('should handle import errors gracefully', async () => {
      db.contacts.create.mockRejectedValueOnce(new Error('Database error'));

      const result = await contactSyncService.importFromDevice();

      expect(result.imported).toBe(1); // One succeeds, one fails
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].error).toBe('Database error');
    });
  });

  describe('exportToDevice', () => {
    const mockCrmContacts = [
      {
        id: 1,
        first_name: 'John',
        last_name: 'Doe',
        display_name: 'John Doe',
        contact_info: [
          { type: 'email', value: 'john@example.com', label: 'work' },
          { type: 'phone', value: '+1234567890', label: 'mobile' }
        ]
      },
      {
        id: 2,
        first_name: 'Jane',
        last_name: 'Smith',
        display_name: 'Jane Smith',
        contact_info: [
          { type: 'email', value: 'jane@example.com', label: 'personal' }
        ]
      }
    ];

    beforeEach(() => {
      Contacts.getPermissionsAsync.mockResolvedValue({ status: 'granted' });
      Contacts.addContactAsync.mockResolvedValue('new-device-contact-id');
      db.contactsInfo.getWithContactInfo = jest.fn().mockImplementation(id =>
        mockCrmContacts.find(c => c.id === id)
      );
      db.contactsInfo.getAll = jest.fn().mockResolvedValue(mockCrmContacts);
    });

    test('should throw error if permissions not granted', async () => {
      Contacts.getPermissionsAsync.mockResolvedValue({ status: 'denied' });

      await expect(contactSyncService.exportToDevice()).rejects.toThrow();
    });

    test('should export all contacts successfully', async () => {
      const onProgress = jest.fn();

      const result = await contactSyncService.exportToDevice({ onProgress });

      expect(result.total).toBe(2);
      expect(result.exported).toBe(2);
      expect(result.errors).toHaveLength(0);

      expect(Contacts.addContactAsync).toHaveBeenCalledTimes(2);
      expect(onProgress).toHaveBeenCalledWith(
        expect.objectContaining({ stage: 'fetching' })
      );
      expect(onProgress).toHaveBeenCalledWith(
        expect.objectContaining({ stage: 'complete' })
      );
    });

    test('should export specific contacts by ID', async () => {
      const result = await contactSyncService.exportToDevice({
        contactIds: [1]
      });

      expect(result.total).toBe(1);
      expect(result.exported).toBe(1);
      expect(Contacts.addContactAsync).toHaveBeenCalledTimes(1);
    });

    test('should handle export errors gracefully', async () => {
      Contacts.addContactAsync.mockRejectedValueOnce(new Error('Device error'));

      const result = await contactSyncService.exportToDevice();

      expect(result.exported).toBe(1); // One succeeds, one fails
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].error).toBe('Device error');
    });
  });

  describe('data conversion', () => {
    test('_convertDeviceContactToCRM should map fields correctly', async () => {
      const deviceContact = {
        firstName: 'John',
        lastName: 'Doe',
        middleName: 'William',
        jobTitle: 'Developer',
        company: 'Test Co',
        image: { uri: 'file://avatar.jpg' }
      };

      db.companies.getAll = jest.fn().mockResolvedValue([]);
      db.companies.create = jest.fn().mockResolvedValue({ id: 123 });

      const result = await contactSyncService._convertDeviceContactToCRM(deviceContact, true);

      expect(result).toMatchObject({
        first_name: 'John',
        last_name: 'Doe',
        middle_name: 'William',
        job_title: 'Developer',
        avatar_uri: 'file://avatar.jpg',
        display_name: 'John William Doe'
      });
      expect(result.company_id).toBe(123);
    });

    test('_convertCRMContactToDevice should map fields correctly', () => {
      const crmContact = {
        first_name: 'John',
        last_name: 'Doe',
        middle_name: 'William',
        job_title: 'Developer',
        contact_info: [
          { type: 'email', value: 'john@example.com', label: 'work' },
          { type: 'phone', value: '+1234567890', label: 'mobile' }
        ]
      };

      const result = contactSyncService._convertCRMContactToDevice(crmContact);

      expect(result).toMatchObject({
        firstName: 'John',
        lastName: 'Doe',
        middleName: 'William',
        jobTitle: 'Developer',
        emails: [{ email: 'john@example.com', label: 'work' }],
        phoneNumbers: [{ number: '+1234567890', label: 'mobile' }]
      });
    });
  });

  describe('conflict resolution', () => {
    test('should handle OVERWRITE resolution', async () => {
      const mockExistingContact = {
        id: 1,
        first_name: 'John',
        last_name: 'Doe',
        display_name: 'John Doe'
      };

      const deviceContact = {
        firstName: 'John',
        lastName: 'Doe',
        jobTitle: 'Senior Developer'
      };

      db.contacts.findByName.mockResolvedValue([mockExistingContact]);
      db.contacts.update = jest.fn().mockResolvedValue(mockExistingContact);
      db.companies.getAll = jest.fn().mockResolvedValue([]);
      contactSyncService._updateContactInfo = jest.fn();

      const result = await contactSyncService._importSingleContact(
        deviceContact,
        CONFLICT_RESOLUTION.OVERWRITE,
        false
      );

      expect(result.imported).toBe(true);
      expect(result.updated).toBe(true);
      expect(db.contacts.update).toHaveBeenCalledWith(1, expect.objectContaining({
        job_title: 'Senior Developer'
      }));
    });
  });

  describe('error handling', () => {
    test('should handle device errors properly', async () => {
      Contacts.getPermissionsAsync.mockRejectedValue(new Error('Device unavailable'));

      await expect(contactSyncService.checkPermissions()).rejects.toMatchObject({
        code: CONTACT_SYNC_ERROR_CODES.DEVICE_ERROR
      });
    });

    test('should clean up sync state on import error', async () => {
      Contacts.getPermissionsAsync.mockResolvedValue({ status: 'granted' });
      Contacts.getContactsAsync.mockRejectedValue(new Error('Fetch failed'));

      await expect(contactSyncService.importFromDevice()).rejects.toThrow();
      expect(contactSyncService.syncInProgress).toBe(false);
    });
  });
});