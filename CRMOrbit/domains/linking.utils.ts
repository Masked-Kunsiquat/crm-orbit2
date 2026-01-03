import { Alert, Linking, Platform } from "react-native";
import { t } from "@i18n/index";
import { createLogger } from "../utils/logger";

const logger = createLogger("Linking");

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const normalizePhoneNumber = (phoneNumber: string): string => {
  return phoneNumber.replace(/[^\d+]/g, "");
};

const createLinkingError = (messageKey: string): Error => {
  return new Error(t(messageKey));
};

const showLinkingAlert = (messageKey: string): void => {
  Alert.alert(t("common.error"), t(messageKey), [
    { text: t("common.ok") },
  ]);
};

const openMapsUrl = async (
  primaryUrl: string,
  fallbackUrl?: string,
): Promise<void> => {
  try {
    const supported = await Linking.canOpenURL(primaryUrl);
    if (supported) {
      await Linking.openURL(primaryUrl);
      return;
    }

    if (fallbackUrl) {
      await Linking.openURL(fallbackUrl);
      return;
    }

    logger.warn("Maps app not available", { url: primaryUrl });
    showLinkingAlert("no_maps_app");
  } catch (error) {
    logger.error(
      "Failed to open maps",
      { url: primaryUrl, fallbackUrl },
      error,
    );
    showLinkingAlert("maps_open_failed");
  }
};

/**
 * Opens the native phone dialer with the phone number pre-filled
 * @param phoneNumber - The phone number to dial (can include formatting characters)
 */
export const openPhoneDialer = async (phoneNumber: string): Promise<void> => {
  const cleanNumber = normalizePhoneNumber(phoneNumber);
  if (!cleanNumber) {
    logger.warn("Phone number missing for dialer", { phoneNumber });
    throw createLinkingError("phone_number_invalid");
  }

  const url = `tel:${cleanNumber}`;

  let supported = false;
  try {
    supported = await Linking.canOpenURL(url);
  } catch (error) {
    logger.error("Failed to check phone dialer support", { url }, error);
    throw createLinkingError("phone_dialer_failed");
  }

  if (!supported) {
    logger.warn("Phone dialer not available", { url });
    throw createLinkingError("phone_dialer_unavailable");
  }

  try {
    await Linking.openURL(url);
  } catch (error) {
    logger.error("Failed to open phone dialer", { url }, error);
    throw createLinkingError("phone_dialer_failed");
  }
};

/**
 * Opens the native SMS app with the phone number pre-filled
 * @param phoneNumber - The phone number to send SMS to (can include formatting characters)
 */
export const openSMS = async (phoneNumber: string): Promise<void> => {
  const cleanNumber = normalizePhoneNumber(phoneNumber);
  if (!cleanNumber) {
    logger.warn("Phone number missing for SMS", { phoneNumber });
    throw createLinkingError("phone_number_invalid");
  }

  const url = `sms:${cleanNumber}`;

  let supported = false;
  try {
    supported = await Linking.canOpenURL(url);
  } catch (error) {
    logger.error("Failed to check SMS support", { url }, error);
    throw createLinkingError("sms_open_failed");
  }

  if (!supported) {
    logger.warn("Messaging app not available", { url });
    throw createLinkingError("sms_app_unavailable");
  }

  try {
    await Linking.openURL(url);
  } catch (error) {
    logger.error("Failed to open SMS app", { url }, error);
    throw createLinkingError("sms_open_failed");
  }
};

/**
 * Opens the default email app with the email address pre-filled
 * @param email - The email address to send to
 */
export const openEmailComposer = async (email: string): Promise<void> => {
  const trimmedEmail = email.trim();
  if (!EMAIL_REGEX.test(trimmedEmail)) {
    logger.warn("Invalid email address for composer", { email });
    showLinkingAlert("email_invalid");
    return;
  }

  const url = `mailto:${trimmedEmail}`;

  try {
    const supported = await Linking.canOpenURL(url);
    if (!supported) {
      logger.warn("No email app available", { email: trimmedEmail });
      showLinkingAlert("no_email_app");
      return;
    }

    await Linking.openURL(url);
  } catch (error) {
    logger.error(
      "Failed to open email composer",
      { email: trimmedEmail },
      error,
    );
    showLinkingAlert("email_send_failed");
  }
};

/**
 * Opens the native maps app with the address pre-filled
 * Shows app picker with all installed mapping apps
 * @param address - The full address string
 */
export const openMapsWithAddress = async (address: string): Promise<void> => {
  const encodedAddress = encodeURIComponent(address);
  if (Platform.OS === "ios") {
    await openMapsUrl(
      `maps://?q=${encodedAddress}`,
      `https://maps.apple.com/?q=${encodedAddress}`,
    );
    return;
  }

  await openMapsUrl(`geo:0,0?q=${encodedAddress}`);
};

/**
 * Opens the native maps app with coordinates and optional label
 * Shows app picker with all installed mapping apps
 * @param latitude - The latitude coordinate
 * @param longitude - The longitude coordinate
 * @param label - Optional label for the location
 */
export const openMapsWithCoordinates = async (
  latitude: number,
  longitude: number,
  label?: string,
): Promise<void> => {
  const encodedLabel = label ? encodeURIComponent(label) : "";
  const coordinates = `${latitude},${longitude}`;

  if (Platform.OS === "ios") {
    const query = encodedLabel ? `&q=${encodedLabel}` : "";
    await openMapsUrl(
      `maps://?ll=${coordinates}${query}`,
      `https://maps.apple.com/?ll=${coordinates}${query}`,
    );
    return;
  }

  const labelSuffix = encodedLabel ? `(${encodedLabel})` : "";
  await openMapsUrl(`geo:${coordinates}?q=${coordinates}${labelSuffix}`);
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
