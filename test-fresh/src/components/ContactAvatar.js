import React from 'react';
import { Avatar } from 'react-native-paper';

/**
 * Reusable ContactAvatar component
 * Displays contact avatar image or initials fallback
 */
export default function ContactAvatar({ contact, size = 48, style }) {
  const getInitials = (firstName, lastName) => {
    const first = firstName ? firstName.charAt(0).toUpperCase() : '';
    const last = lastName ? lastName.charAt(0).toUpperCase() : '';
    return first + last || '?';
  };

  if (contact?.avatar_uri) {
    return (
      <Avatar.Image
        size={size}
        source={{ uri: contact.avatar_uri }}
        style={style}
      />
    );
  }

  return (
    <Avatar.Text
      size={size}
      label={getInitials(contact?.first_name, contact?.last_name)}
      style={style}
    />
  );
}
