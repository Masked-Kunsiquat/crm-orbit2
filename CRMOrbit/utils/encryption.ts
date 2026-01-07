import { gcm } from "@noble/ciphers/aes.js";
import * as SecureStore from "expo-secure-store";
import { fromByteArray, toByteArray } from "base64-js";

const KEY_STORAGE_KEY = "crmorbit.encryption.key.v1";
const ALGORITHM = "AES-GCM";
const KEY_LENGTH = 256;
const KEY_BYTES = KEY_LENGTH / 8;
const IV_LENGTH = 12;
const PAYLOAD_VERSION = 1;

type KeyUsage = "encrypt" | "decrypt";

type CryptoKeyLike = unknown;

type SubtleCryptoLike = {
  generateKey: (
    algorithm: { name: string; length?: number },
    extractable: boolean,
    keyUsages: KeyUsage[],
  ) => Promise<CryptoKeyLike>;
  exportKey: (format: "raw", key: CryptoKeyLike) => Promise<ArrayBuffer>;
  importKey: (
    format: "raw",
    keyData: ArrayBuffer | Uint8Array,
    algorithm: { name: string },
    extractable: boolean,
    keyUsages: KeyUsage[],
  ) => Promise<CryptoKeyLike>;
  encrypt: (
    algorithm: { name: string; iv: ArrayBuffer | Uint8Array },
    key: CryptoKeyLike,
    data: ArrayBuffer | Uint8Array,
  ) => Promise<ArrayBuffer>;
  decrypt: (
    algorithm: { name: string; iv: ArrayBuffer | Uint8Array },
    key: CryptoKeyLike,
    data: ArrayBuffer | Uint8Array,
  ) => Promise<ArrayBuffer>;
};

type CryptoRandomApi = {
  getRandomValues: (array: Uint8Array) => Uint8Array;
};

type WebCryptoApi = CryptoRandomApi & {
  subtle: SubtleCryptoLike;
};

type TextEncoderLike = {
  encode: (input?: string) => Uint8Array;
};

type TextDecoderLike = {
  decode: (input?: Uint8Array) => string;
};

export type EncryptedPayload = {
  v: number;
  iv: string;
  data: string;
};

let cachedKey: CryptoKeyLike | null = null;
let cachedKeyMaterial: Uint8Array | null = null;
let keyInitPromise: Promise<CryptoKeyLike> | null = null;
let keyMaterialInitPromise: Promise<Uint8Array> | null = null;

const getCryptoRandom = (): CryptoRandomApi => {
  const cryptoApi = globalThis.crypto as CryptoRandomApi | undefined;
  if (!cryptoApi?.getRandomValues) {
    throw new Error(
      "crypto.getRandomValues is unavailable. Ensure a secure random polyfill like react-native-get-random-values is loaded.",
    );
  }
  return cryptoApi;
};

const getWebCrypto = (): WebCryptoApi => {
  const cryptoApi = getCryptoRandom() as WebCryptoApi;
  if (!cryptoApi.subtle) {
    throw new Error("Web Crypto API is not available.");
  }
  return cryptoApi;
};

const hasWebCrypto = (): boolean => {
  const cryptoApi = globalThis.crypto as WebCryptoApi | undefined;
  return Boolean(cryptoApi?.getRandomValues && cryptoApi.subtle);
};

const encodeBase64 = (value: Uint8Array): string => fromByteArray(value);

const decodeBase64 = (value: string): Uint8Array => toByteArray(value);

const toArrayBuffer = (value: Uint8Array): ArrayBuffer => {
  if (value.buffer instanceof ArrayBuffer) {
    return value.buffer.slice(
      value.byteOffset,
      value.byteOffset + value.byteLength,
    );
  }
  return value.slice().buffer as ArrayBuffer;
};

const getTextEncoder = (): TextEncoderLike => {
  const Encoder = globalThis.TextEncoder;
  if (!Encoder) {
    throw new Error("TextEncoder is not available.");
  }
  return new Encoder();
};

const getTextDecoder = (): TextDecoderLike => {
  const Decoder = globalThis.TextDecoder;
  if (!Decoder) {
    throw new Error("TextDecoder is not available.");
  }
  return new Decoder();
};

const loadKeyMaterial = async (): Promise<Uint8Array | null> => {
  if (cachedKeyMaterial) {
    return cachedKeyMaterial;
  }

  const stored = await SecureStore.getItemAsync(KEY_STORAGE_KEY);
  if (!stored) {
    return null;
  }

  const decoded = decodeBase64(stored);
  cachedKeyMaterial = decoded;
  return decoded;
};

export const hasEncryptionKey = async (): Promise<boolean> => {
  const material = await loadKeyMaterial();
  return Boolean(material);
};

const storeKeyMaterial = async (keyMaterial: Uint8Array): Promise<void> => {
  cachedKeyMaterial = keyMaterial;
  await SecureStore.setItemAsync(KEY_STORAGE_KEY, encodeBase64(keyMaterial));
};

const getOrCreateKeyMaterial = async (): Promise<Uint8Array> => {
  if (cachedKeyMaterial) {
    return cachedKeyMaterial;
  }

  if (keyMaterialInitPromise) {
    return keyMaterialInitPromise;
  }

  keyMaterialInitPromise = (async () => {
    const existing = await loadKeyMaterial();
    if (existing) {
      return existing;
    }

    const material = await generateKeyMaterial();
    await storeKeyMaterial(material);
    return material;
  })();

  try {
    return await keyMaterialInitPromise;
  } finally {
    keyMaterialInitPromise = null;
  }
};

const generateKeyMaterial = async (): Promise<Uint8Array> => {
  const cryptoApi = getCryptoRandom();
  const material = new Uint8Array(KEY_BYTES);
  cryptoApi.getRandomValues(material);
  return material;
};

const importKey = async (keyMaterial: Uint8Array): Promise<CryptoKeyLike> => {
  const cryptoApi = getWebCrypto();
  const keyBuffer = toArrayBuffer(keyMaterial);
  return cryptoApi.subtle.importKey(
    "raw",
    keyBuffer,
    { name: ALGORITHM },
    false,
    ["encrypt", "decrypt"],
  );
};

const getOrCreateKey = async (): Promise<CryptoKeyLike> => {
  if (cachedKey) {
    return cachedKey;
  }

  if (keyInitPromise) {
    return keyInitPromise;
  }

  keyInitPromise = (async () => {
    const material = await getOrCreateKeyMaterial();
    cachedKey = await importKey(material);
    return cachedKey;
  })();

  try {
    return await keyInitPromise;
  } finally {
    keyInitPromise = null;
  }
};

const getExistingKey = async (): Promise<CryptoKeyLike> => {
  if (cachedKey) {
    return cachedKey;
  }

  const existing = await loadKeyMaterial();
  if (!existing) {
    throw new Error("Encryption key not found.");
  }

  cachedKey = await importKey(existing);
  return cachedKey;
};

const getExistingKeyMaterial = async (): Promise<Uint8Array> => {
  const existing = await loadKeyMaterial();
  if (!existing) {
    throw new Error("Encryption key not found.");
  }
  return existing;
};

const ensurePayload = (value: unknown): EncryptedPayload => {
  if (typeof value !== "object" || value === null) {
    throw new Error("Invalid encrypted payload.");
  }

  const payload = value as Partial<EncryptedPayload>;
  if (
    payload.v !== PAYLOAD_VERSION ||
    typeof payload.iv !== "string" ||
    typeof payload.data !== "string"
  ) {
    throw new Error("Invalid encrypted payload.");
  }

  return payload as EncryptedPayload;
};

export const exportEncryptionKey = async (): Promise<string> => {
  const material = await getOrCreateKeyMaterial();
  return encodeBase64(material);
};

export const importEncryptionKey = async (base64Key: string): Promise<void> => {
  keyInitPromise = null;
  cachedKey = null;
  keyMaterialInitPromise = null;
  const material = decodeBase64(base64Key.trim());
  if (material.length !== KEY_BYTES) {
    throw new Error("Invalid encryption key length.");
  }
  await storeKeyMaterial(material);
  if (hasWebCrypto()) {
    cachedKey = await importKey(material);
  }
};

export const encryptCode = async (plaintext: string): Promise<string> => {
  const encoded = getTextEncoder().encode(plaintext);
  const cryptoApi = getCryptoRandom();
  const iv = cryptoApi.getRandomValues(new Uint8Array(IV_LENGTH));
  let cipherBytes: Uint8Array;

  if (hasWebCrypto()) {
    const key = await getOrCreateKey();
    const ivBuffer = toArrayBuffer(iv);
    const dataBuffer = toArrayBuffer(encoded);
    const cipherBuffer = await getWebCrypto().subtle.encrypt(
      { name: ALGORITHM, iv: ivBuffer },
      key,
      dataBuffer,
    );
    cipherBytes = new Uint8Array(cipherBuffer);
  } else {
    const keyMaterial = await getOrCreateKeyMaterial();
    cipherBytes = gcm(keyMaterial, iv).encrypt(encoded);
  }

  const payload: EncryptedPayload = {
    v: PAYLOAD_VERSION,
    iv: encodeBase64(iv),
    data: encodeBase64(cipherBytes),
  };

  return JSON.stringify(payload);
};

export const decryptCode = async (ciphertext: string): Promise<string> => {
  const parsed = ensurePayload(JSON.parse(ciphertext));
  const iv = decodeBase64(parsed.iv);
  const data = decodeBase64(parsed.data);
  let plainBytes: Uint8Array;

  if (hasWebCrypto()) {
    const key = await getExistingKey();
    const ivBuffer = toArrayBuffer(iv);
    const dataBuffer = toArrayBuffer(data);
    const plainBuffer = await getWebCrypto().subtle.decrypt(
      { name: ALGORITHM, iv: ivBuffer },
      key,
      dataBuffer,
    );
    plainBytes = new Uint8Array(plainBuffer);
  } else {
    const keyMaterial = await getExistingKeyMaterial();
    plainBytes = gcm(keyMaterial, iv).decrypt(data);
  }

  return getTextDecoder().decode(plainBytes);
};
