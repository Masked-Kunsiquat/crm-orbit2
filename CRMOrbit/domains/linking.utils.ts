import { Linking } from "react-native";
import { createLogger } from "../utils/logger";

const logger = createLogger("Linking");

const normalizePhoneNumber = (phoneNumber: string): string => {
  return phoneNumber.replace(/[^\d+]/g, "");
};

const openLinkingUrl = async (
  url: string,
  description: string,
): Promise<boolean> => {
  try {
    const supported = await Linking.canOpenURL(url);
    if (!supported) {
      logger.warn(`${description} not available`, { url });
      return false;
    }

    await Linking.openURL(url);
    return true;
  } catch (error) {
    logger.error(`Failed to open ${description}`, { url }, error);
    return false;
  }
};

/**
 * Opens the native phone dialer with the phone number pre-filled
 * @param phoneNumber - The phone number to dial (can include formatting characters)
 */
export const openPhoneDialer = async (
  phoneNumber: string,
): Promise<boolean> => {
  const cleanNumber = normalizePhoneNumber(phoneNumber);
  if (!cleanNumber) {
    logger.warn("Phone number missing for dialer", { phoneNumber });
    return false;
  }

  return openLinkingUrl(`tel:${cleanNumber}`, "phone dialer");
};

/**
 * Opens the native SMS app with the phone number pre-filled
 * @param phoneNumber - The phone number to send SMS to (can include formatting characters)
 */
export const openSMS = async (phoneNumber: string): Promise<boolean> => {
  const cleanNumber = normalizePhoneNumber(phoneNumber);
  if (!cleanNumber) {
    logger.warn("Phone number missing for SMS", { phoneNumber });
    return false;
  }

  return openLinkingUrl(`sms:${cleanNumber}`, "SMS");
};

/**
 * Opens the default email app with the email address pre-filled
 * @param email - The email address to send to
 */
export const openEmailComposer = (email: string): void => {
  Linking.openURL(`mailto:${email}`);
};

/**
 * Opens the native maps app with the address pre-filled
 * Shows app picker with all installed mapping apps
 * @param address - The full address string
 */
export const openMapsWithAddress = (address: string): void => {
  const encodedAddress = encodeURIComponent(address);
  Linking.openURL(`geo:0,0?q=${encodedAddress}`);
};

/**
 * Opens the native maps app with coordinates and optional label
 * Shows app picker with all installed mapping apps
 * @param latitude - The latitude coordinate
 * @param longitude - The longitude coordinate
 * @param label - Optional label for the location
 */
export const openMapsWithCoordinates = (
  latitude: number,
  longitude: number,
  label?: string,
): void => {
  const labelParam = label ? `(${encodeURIComponent(label)})` : "";
  Linking.openURL(
    `geo:${latitude},${longitude}?q=${latitude},${longitude}${labelParam}`,
  );
};

/**
 * Formats an address object into a single string for maps
 * @param address - Address object with street, city, state, zipCode
 */
export const formatAddressForMaps = (address: {
  street: string;
  city: string;
  state: string;
  zipCode: string;
}): string => {
  return `${address.street}, ${address.city}, ${address.state} ${address.zipCode}`;
};
