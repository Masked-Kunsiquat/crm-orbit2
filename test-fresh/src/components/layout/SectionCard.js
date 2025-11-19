import React from 'react';
import { StyleSheet } from 'react-native';
import { Card } from 'react-native-paper';

/**
 * Standard section card with consistent spacing and elevation
 */
export default function SectionCard({
  title,
  subtitle,
  children,
  actions,
  style
}) {
  return (
    <Card style={[styles.card, style]}>
      {(title || subtitle || actions) && (
        <Card.Title
          title={title}
          subtitle={subtitle}
          right={actions}
        />
      )}
      <Card.Content>{children}</Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
    elevation: 2,
  },
});
