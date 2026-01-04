import * as SecureStore from "expo-secure-store";
import { fromByteArray, toByteArray } from "base64-js";

const KEY_STORAGE_KEY = "crmorbit.encryption.key.v1";
const ALGORITHM = "AES-GCM";
const KEY_LENGTH = 256;
const IV_LENGTH = 12;
const PAYLOAD_VERSION = 1;

type CryptoApi = {
  subtle: SubtleCrypto;
  getRandomValues: (array: Uint8Array) => Uint8Array;
};

export type EncryptedPayload = {
  v: number;
  iv: string;
  data: string;
};

let cachedKey: CryptoKey | null = null;
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

const getTextEncoder = (): TextEncoder => {
  if (typeof TextEncoder === "undefined") {
    throw new Error("TextEncoder is not available.");
  }
  return new TextEncoder();
};

const getTextDecoder = (): TextDecoder => {
  if (typeof TextDecoder === "undefined") {
    throw new Error("TextDecoder is not available.");
  }
  return new TextDecoder();
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

const importKey = async (keyMaterial: Uint8Array): Promise<CryptoKey> => {
  const cryptoApi = getCrypto();
  return cryptoApi.subtle.importKey(
    "raw",
    keyMaterial,
    { name: ALGORITHM },
    false,
    ["encrypt", "decrypt"],
  );
};

const getOrCreateKey = async (): Promise<CryptoKey> => {
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
  const cipherBuffer = await cryptoApi.subtle.encrypt(
    { name: ALGORITHM, iv },
    key,
    encoded,
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
  const key = await getOrCreateKey();
  const iv = decodeBase64(parsed.iv);
  const data = decodeBase64(parsed.data);
  const plainBuffer = await cryptoApi.subtle.decrypt(
    { name: ALGORITHM, iv },
    key,
    data,
  );

  return getTextDecoder().decode(new Uint8Array(plainBuffer));
};
