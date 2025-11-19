import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Card, Button } from 'react-native-paper';
import { logger } from '../errors/utils/errorLogger';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error with full stack trace
    console.error('[ErrorBoundary] Caught error:', error);
    console.error('[ErrorBoundary] Error info:', errorInfo);
    console.error('[ErrorBoundary] Component stack:', errorInfo.componentStack);

    logger.error('ErrorBoundary', 'componentDidCatch', error, {
      componentStack: errorInfo.componentStack,
      errorString: error.toString(),
      errorStack: error.stack,
    });

    this.setState({
      error,
      errorInfo,
    });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Card style={styles.card}>
            <Card.Content>
              <Text variant="headlineMedium" style={styles.title}>
                Something Went Wrong
              </Text>
              <Text variant="bodyMedium" style={styles.message}>
                The app encountered an unexpected error. Details have been logged.
              </Text>

              {__DEV__ && this.state.error && (
                <ScrollView style={styles.errorDetails}>
                  <Text variant="titleSmall" style={styles.errorTitle}>
                    Error Details (Dev Mode):
                  </Text>
                  <Text variant="bodySmall" style={styles.errorText}>
                    {this.state.error.toString()}
                  </Text>
                  {this.state.error.stack && (
                    <>
                      <Text variant="titleSmall" style={[styles.errorTitle, { marginTop: 12 }]}>
                        Stack Trace:
                      </Text>
                      <Text variant="bodySmall" style={styles.errorText}>
                        {this.state.error.stack}
                      </Text>
                    </>
                  )}
                  {this.state.errorInfo && this.state.errorInfo.componentStack && (
                    <>
                      <Text variant="titleSmall" style={[styles.errorTitle, { marginTop: 12 }]}>
                        Component Stack:
                      </Text>
                      <Text variant="bodySmall" style={styles.errorText}>
                        {this.state.errorInfo.componentStack}
                      </Text>
                    </>
                  )}
                </ScrollView>
              )}
            </Card.Content>
            <Card.Actions>
              <Button mode="contained" onPress={this.handleReset}>
                Try Again
              </Button>
            </Card.Actions>
          </Card>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  card: {
    padding: 16,
  },
  title: {
    color: '#d32f2f',
    marginBottom: 16,
    textAlign: 'center',
  },
  message: {
    color: '#666',
    marginBottom: 16,
    textAlign: 'center',
  },
  errorDetails: {
    maxHeight: 300,
    marginTop: 16,
    padding: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  errorTitle: {
    fontWeight: 'bold',
    color: '#d32f2f',
    marginBottom: 8,
  },
  errorText: {
    fontFamily: 'monospace',
    color: '#333',
    fontSize: 11,
  },
});

export default ErrorBoundary;
