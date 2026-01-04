import * as SecureStore from "expo-secure-store";
import { fromByteArray, toByteArray } from "base64-js";

const KEY_STORAGE_KEY = "crmorbit.encryption.key.v1";
const ALGORITHM = "AES-GCM";
const KEY_LENGTH = 256;
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

type CryptoApi = {
  subtle: SubtleCryptoLike;
  getRandomValues: (array: Uint8Array) => Uint8Array;
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

const getCrypto = (): CryptoApi => {
  const cryptoApi = globalThis.crypto as CryptoApi | undefined;
  if (!cryptoApi?.subtle || !cryptoApi.getRandomValues) {
    throw new Error("Web Crypto API is not available.");
  }
  return cryptoApi;
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

const generateKeyMaterial = async (): Promise<Uint8Array> => {
  const cryptoApi = getCrypto();
  const key = await cryptoApi.subtle.generateKey(
    { name: ALGORITHM, length: KEY_LENGTH },
    true,
    ["encrypt", "decrypt"],
  );
  const raw = await cryptoApi.subtle.exportKey("raw", key);
  return new Uint8Array(raw);
};

const importKey = async (keyMaterial: Uint8Array): Promise<CryptoKeyLike> => {
  const cryptoApi = getCrypto();
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

  const existing = await loadKeyMaterial();
  if (existing) {
    cachedKey = await importKey(existing);
    return cachedKey;
  }

  const material = await generateKeyMaterial();
  await storeKeyMaterial(material);
  cachedKey = await importKey(material);
  return cachedKey;
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
  const material = (await loadKeyMaterial()) ?? (await generateKeyMaterial());
  if (!cachedKeyMaterial) {
    await storeKeyMaterial(material);
  }
  return encodeBase64(material);
};

export const importEncryptionKey = async (base64Key: string): Promise<void> => {
  const material = decodeBase64(base64Key.trim());
  if (material.length !== KEY_LENGTH / 8) {
    throw new Error("Invalid encryption key length.");
  }
  await storeKeyMaterial(material);
  cachedKey = await importKey(material);
};

export const encryptCode = async (plaintext: string): Promise<string> => {
  const cryptoApi = getCrypto();
  const key = await getOrCreateKey();
  const iv = cryptoApi.getRandomValues(new Uint8Array(IV_LENGTH));
  const encoded = getTextEncoder().encode(plaintext);
  const ivBuffer = toArrayBuffer(iv);
  const dataBuffer = toArrayBuffer(encoded);
  const cipherBuffer = await cryptoApi.subtle.encrypt(
    { name: ALGORITHM, iv: ivBuffer },
    key,
    dataBuffer,
  );

  const payload: EncryptedPayload = {
    v: PAYLOAD_VERSION,
    iv: encodeBase64(iv),
    data: encodeBase64(new Uint8Array(cipherBuffer)),
  };

  return JSON.stringify(payload);
};

export const decryptCode = async (ciphertext: string): Promise<string> => {
  const cryptoApi = getCrypto();
  const parsed = ensurePayload(JSON.parse(ciphertext));
  const key = await getExistingKey();
  const iv = decodeBase64(parsed.iv);
  const data = decodeBase64(parsed.data);
  const ivBuffer = toArrayBuffer(iv);
  const dataBuffer = toArrayBuffer(data);
  const plainBuffer = await cryptoApi.subtle.decrypt(
    { name: ALGORITHM, iv: ivBuffer },
    key,
    dataBuffer,
  );

  return getTextDecoder().decode(new Uint8Array(plainBuffer));
};
