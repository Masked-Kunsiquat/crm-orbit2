import * as FileSystem from "expo-file-system";

/**
 * Copy an image from a temporary location to permanent storage
 * Returns the permanent file URI
 */
export const persistImage = async (
  tempUri: string,
  entityType: "organization" | "contact",
  entityId: string,
): Promise<string> => {
  try {
    // Create directory if it doesn't exist
    const dirUri = `${FileSystem.documentDirectory}${entityType}-logos/`;
    const dirInfo = await FileSystem.getInfoAsync(dirUri);

    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(dirUri, { intermediates: true });
    }

    // Extract file extension from temp URI
    const extension = tempUri.split(".").pop() || "jpg";

    // Create permanent file path
    const fileName = `${entityId}.${extension}`;
    const permanentUri = `${dirUri}${fileName}`;

    // Copy file to permanent location
    await FileSystem.copyAsync({
      from: tempUri,
      to: permanentUri,
    });

    return permanentUri;
  } catch (error) {
    console.error("Failed to persist image:", error);
    throw error;
  }
};

/**
 * Delete a persisted image
 */
export const deletePersistedImage = async (uri: string): Promise<void> => {
  try {
    const fileInfo = await FileSystem.getInfoAsync(uri);
    if (fileInfo.exists) {
      await FileSystem.deleteAsync(uri);
    }
  } catch (error) {
    console.error("Failed to delete image:", error);
    // Don't throw - deletion failure shouldn't block other operations
  }
};
