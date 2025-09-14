// Danger zone section component for destructive actions
import React from 'react';
import { StyleSheet, Alert } from 'react-native';
import {
  Text,
  Card,
  Button
} from '@ui-kitten/components';
import authService from '../../services/authService';

const DangerZone = ({ onResetComplete }) => {
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
            try {
              await authService.resetAuth();
              onResetComplete?.();
              Alert.alert('Success', 'Authentication settings have been reset');
            } catch (error) {
              console.error('Failed to reset authentication:', error);
              Alert.alert('Error', 'Failed to reset authentication');
            }
          }
        }
      ]
    );
  };

  return (
    <Card style={styles.card}>
      <Text category="h6" style={styles.sectionTitle} status="danger">
        Danger Zone
      </Text>
      <Button
        status="danger"
        appearance="outline"
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