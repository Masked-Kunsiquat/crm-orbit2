const mockSharing = {
  isAvailableAsync: jest.fn(async () => true),
  shareAsync: jest.fn(async () => {})
};

module.exports = mockSharing;