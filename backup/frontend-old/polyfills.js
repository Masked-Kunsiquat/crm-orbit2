// Polyfills for React Native environment
import 'react-native-url-polyfill/auto';

console.log('Starting polyfill setup...');

// More complete FormData polyfill
class FormDataPolyfill {
  constructor(form) {
    this._boundary = Math.random().toString().substr(2);
    this._data = [];

    if (form) {
      // Handle form element if provided
      const elements = form.elements || [];
      for (let i = 0; i < elements.length; i++) {
        const element = elements[i];
        if (element.name) {
          this.append(element.name, element.value);
        }
      }
    }
  }

  append(name, value, filename) {
    this._data.push([name, value, filename]);
  }

  set(name, value, filename) {
    const index = this._data.findIndex(([key]) => key === name);
    if (index !== -1) {
      this._data[index] = [name, value, filename];
    } else {
      this.append(name, value, filename);
    }
  }

  get(name) {
    const entry = this._data.find(([key]) => key === name);
    return entry ? entry[1] : null;
  }

  getAll(name) {
    return this._data.filter(([key]) => key === name).map(([, value]) => value);
  }

  has(name) {
    return this._data.some(([key]) => key === name);
  }

  delete(name) {
    this._data = this._data.filter(([key]) => key !== name);
  }

  entries() {
    return this._data.map(([name, value]) => [name, value])[Symbol.iterator]();
  }

  keys() {
    return this._data.map(([name]) => name)[Symbol.iterator]();
  }

  values() {
    return this._data.map(([, value]) => value)[Symbol.iterator]();
  }

  forEach(callback, thisArg) {
    this._data.forEach(([name, value]) => {
      callback.call(thisArg, value, name, this);
    });
  }

  [Symbol.iterator]() {
    return this.entries();
  }
}

// Set up FormData globally before anything else can use it
if (typeof global.FormData === 'undefined') {
  global.FormData = FormDataPolyfill;
  console.log('FormData polyfill installed');
}

// Also set it on window if it exists
if (typeof window !== 'undefined' && typeof window.FormData === 'undefined') {
  window.FormData = FormDataPolyfill;
  console.log('FormData polyfill installed on window');
}

// Additional polyfills
if (typeof global.File === 'undefined') {
  global.File = class File {
    constructor(bits, name, options = {}) {
      this.bits = bits;
      this.name = name;
      this.type = options.type || '';
      this.lastModified = options.lastModified || Date.now();
    }
  };
}

if (typeof global.Blob === 'undefined') {
  global.Blob = class Blob {
    constructor(parts = [], options = {}) {
      this.parts = parts;
      this.type = options.type || '';
    }
  };
}

console.log('All polyfills loaded successfully');