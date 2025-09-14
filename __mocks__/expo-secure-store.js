// Mock implementation of expo-secure-store for testing
const storage = {};

export const setItemAsync = jest.fn(async (key, value) => {
  storage[key] = value;
  return Promise.resolve();
});

export const getItemAsync = jest.fn(async (key) => {
  return Promise.resolve(storage[key] || null);
});

export const deleteItemAsync = jest.fn(async (key) => {
  delete storage[key];
  return Promise.resolve();
});

// Clear storage for tests
export const clearMockStorage = () => {
  Object.keys(storage).forEach(key => delete storage[key]);
};

export default {
  setItemAsync,
  getItemAsync,
  deleteItemAsync,
  clearMockStorage
};