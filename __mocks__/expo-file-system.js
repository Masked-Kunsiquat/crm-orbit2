const documentDirectory = '/test/directory/';

const mockFileSystem = {
  documentDirectory,
  writeAsStringAsync: jest.fn(async () => {}),
  readAsStringAsync: jest.fn(async () => '{}'),
  deleteAsync: jest.fn(async () => {}),
  makeDirectoryAsync: jest.fn(async () => {}),
  readDirectoryAsync: jest.fn(async () => []),
  getInfoAsync: jest.fn(async () => ({
    size: 1024,
    modificationTime: Date.now() / 1000,
  })),
  EncodingType: {
    Base64: 'base64',
  }
};

module.exports = mockFileSystem;