// Mock for expo-contacts module
const mockContacts = [
  {
    id: '1',
    firstName: 'John',
    lastName: 'Doe',
    phoneNumbers: [
      { number: '+1234567890', label: 'mobile' }
    ],
    emails: [
      { email: 'john.doe@example.com', label: 'work' }
    ],
    company: 'Test Company',
    jobTitle: 'Developer',
    image: { uri: 'file://path/to/avatar.jpg' }
  },
  {
    id: '2',
    firstName: 'Jane',
    lastName: 'Smith',
    phoneNumbers: [
      { number: '+1987654321', label: 'home' }
    ],
    emails: [
      { email: 'jane.smith@example.com', label: 'personal' }
    ],
    addresses: [
      {
        street: '123 Main St',
        city: 'Anytown',
        region: 'CA',
        postalCode: '12345',
        country: 'US',
        label: 'home'
      }
    ]
  }
];

export const Fields = {
  Name: 'name',
  PhoneNumbers: 'phoneNumbers',
  Emails: 'emails',
  Addresses: 'addresses',
  Company: 'company',
  JobTitle: 'jobTitle',
  Image: 'image',
};

export const SortTypes = {
  FirstName: 'firstName',
  LastName: 'lastName',
};

export const requestPermissionsAsync = jest.fn(async () => ({
  status: 'granted',
  granted: true,
}));

export const getPermissionsAsync = jest.fn(async () => ({
  status: 'granted',
  granted: true,
}));

export const getContactsAsync = jest.fn(async (options = {}) => {
  return {
    data: mockContacts,
    hasNextPage: false,
    hasPreviousPage: false,
  };
});

export const getContactByIdAsync = jest.fn(async (id) => {
  return mockContacts.find(contact => contact.id === id) || null;
});

export const addContactAsync = jest.fn(async (contactData) => {
  return 'new-contact-id-' + Date.now();
});

export const updateContactAsync = jest.fn(async (contactId, contactData) => {
  return contactId;
});

export const removeContactAsync = jest.fn(async (contactId) => {
  return true;
});

// Export as default for compatibility
const Contacts = {
  Fields,
  SortTypes,
  requestPermissionsAsync,
  getPermissionsAsync,
  getContactsAsync,
  getContactByIdAsync,
  addContactAsync,
  updateContactAsync,
  removeContactAsync,
};

export default Contacts;