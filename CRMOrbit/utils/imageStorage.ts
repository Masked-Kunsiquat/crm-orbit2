import { Directory, File, Paths } from "expo-file-system";

import { createLogger } from "./logger";

const logger = createLogger("ImageStorage");

const SAFE_EXTENSION_SET = new Set([
  "jpg",
  "jpeg",
  "png",
  "webp",
  "gif",
  "heic",
  "heif",
]);
const MAX_FILENAME_LENGTH = 64;

const sanitizeEntityId = (entityId: string): string => {
  const trimmed = entityId.trim();
  const safe = trimmed
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .slice(0, MAX_FILENAME_LENGTH);

  if (!safe) {
    throw new Error("Invalid entityId for image storage.");
  }

  return safe;
};

const extractExtension = (tempUri: string): string => {
  const cleanedUri = tempUri.split(/[?#]/, 1)[0] ?? tempUri;
  const fileName = cleanedUri.split("/").pop() ?? "";
  const dotIndex = fileName.lastIndexOf(".");

  if (dotIndex === -1 || dotIndex === fileName.length - 1) {
    return "jpg";
  }

  const extension = fileName.slice(dotIndex + 1).toLowerCase();
  return SAFE_EXTENSION_SET.has(extension) ? extension : "jpg";
};

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
    const directory = new Directory(Paths.document, `${entityType}-logos`);
    directory.create({ intermediates: true, idempotent: true });

    if (!tempUri.trim()) {
      throw new Error("Temporary image URI is required.");
    }

    const sourceFile = new File(tempUri);
    const sourceInfo = sourceFile.info();
    if (!sourceInfo.exists) {
      throw new Error(`Temporary image not found at ${tempUri}`);
    }

    const safeEntityId = sanitizeEntityId(entityId);
    const extension = extractExtension(tempUri);

    // Create permanent file path
    const fileName = `${safeEntityId}.${extension}`;
    const destination = new File(directory, fileName);
    if (destination.exists) {
      destination.delete();
    }

    // Copy file to permanent location
    sourceFile.copy(destination);

    return destination.uri;
  } catch (error) {
    logger.error(
      "Failed to persist image",
      { tempUri, entityType, entityId },
      error,
    );
    throw error;
  }
};

/**
 * Delete a persisted image
 */
export const deletePersistedImage = async (uri: string): Promise<void> => {
  try {
    const file = new File(uri);
    const info = file.info();
    if (info.exists) {
      file.delete();
    }
  } catch (error) {
    logger.error("Failed to delete image", { uri }, error);
    // Don't throw - deletion failure shouldn't block other operations
  }
};
