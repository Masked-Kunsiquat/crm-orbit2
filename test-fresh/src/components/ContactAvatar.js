import React, { useState, useEffect } from 'react';
import { Avatar } from 'react-native-paper';
import { fileService } from '../services/fileService';
import { logger } from '../errors';
import { getInitials } from '../utils/contactHelpers';

/**
 * Reusable ContactAvatar component
 * Displays contact avatar image (from attachment or URI) or initials fallback
 *
 * Priority order:
 * 1. avatar_attachment_id (modern, managed by fileService)
 * 2. avatar_uri (legacy, direct URI)
 * 3. Initials fallback
 */
export default function ContactAvatar({ contact, size = 48, style }) {
  const [avatarUri, setAvatarUri] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadAvatar = async () => {
      // Priority 1: Load from attachment
      if (contact?.avatar_attachment_id) {
        setLoading(true);
        try {
          const uri = await fileService.getFileUri(contact.avatar_attachment_id);
          if (mounted) {
            setAvatarUri(uri);
          }
        } catch (error) {
          logger.warn('ContactAvatar', 'Failed to load avatar from attachment', { attachmentId: contact.avatar_attachment_id, error: error.message, stack: error.stack });
          if (mounted) {
            setAvatarUri(null);
          }
        } finally {
          if (mounted) {
            setLoading(false);
          }
        }
      }
      // Priority 2: Use legacy avatar_uri
      else if (contact?.avatar_uri) {
        setAvatarUri(contact.avatar_uri);
      }
      // Priority 3: Clear avatar (will show initials)
      else {
        setAvatarUri(null);
      }
    };

    loadAvatar();

    return () => {
      mounted = false;
    };
  }, [contact?.avatar_attachment_id, contact?.avatar_uri]);

  // Show avatar image if we have a URI
  if (avatarUri) {
    return (
      <Avatar.Image
        size={size}
        source={{ uri: avatarUri }}
        style={style}
      />
    );
  }

  // Fallback to initials
  return (
    <Avatar.Text
      size={size}
      label={getInitials(contact?.first_name, contact?.last_name)}
      style={style}
    />
  );
}
