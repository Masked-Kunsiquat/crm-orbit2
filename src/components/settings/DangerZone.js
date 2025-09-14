// Danger zone section component for destructive actions
import React, { useRef } from 'react';
import { StyleSheet, Alert } from 'react-native';
import { Text, Card, Button, useTheme } from 'react-native-paper';
import authService from '../../services/authService';

const DangerZone = ({ onResetComplete }) => {
  const isResettingRef = useRef(false);
  const handleResetAuth = () => {
    Alert.alert(
      'Reset Authentication',
      'This will remove all authentication settings. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            if (isResettingRef.current) return;
            isResettingRef.current = true;
            try {
              await authService.resetAuth();
              onResetComplete?.();
              Alert.alert('Success', 'Authentication settings have been reset');
            } catch (error) {
              console.error('Failed to reset authentication:', error);
              Alert.alert('Error', 'Failed to reset authentication');
            } finally {
              isResettingRef.current = false;
            }
          }
        }
      ]
    );
  };

  const theme = useTheme();

  return (
    <Card style={styles.card}>
      <Text
        variant="titleMedium"
        style={[styles.sectionTitle, { color: theme.colors.error }]}
      >
        Danger Zone
      </Text>
      <Button
        mode="contained"
        buttonColor={theme.colors?.error}
        textColor={theme.colors?.onError || 'white'}
        onPress={handleResetAuth}
      >
        Reset All Authentication Settings
      </Button>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
  },
  sectionTitle: {
    marginBottom: 16,
  },
});

export default DangerZone;
