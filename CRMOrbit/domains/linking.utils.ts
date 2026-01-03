import { Linking } from "react-native";

/**
 * Opens the native phone dialer with the phone number pre-filled
 * @param phoneNumber - The phone number to dial (can include formatting characters)
 */
export const openPhoneDialer = (phoneNumber: string): void => {
  // Remove all non-numeric characters except + for international numbers
  const cleanNumber = phoneNumber.replace(/[^\d+]/g, "");
  Linking.openURL(`tel:${cleanNumber}`);
};

/**
 * Opens the native SMS app with the phone number pre-filled
 * @param phoneNumber - The phone number to send SMS to (can include formatting characters)
 */
export const openSMS = (phoneNumber: string): void => {
  // Remove all non-numeric characters except + for international numbers
  const cleanNumber = phoneNumber.replace(/[^\d+]/g, "");
  Linking.openURL(`sms:${cleanNumber}`);
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
