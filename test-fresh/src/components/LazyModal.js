import React, { useState, useEffect } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';

/**
 * LazyModal - Defers loading of modal content until first open
 *
 * This optimization prevents heavy modal components from being loaded
 * at app startup, improving initial load time.
 *
 * Usage:
 * <LazyModal
 *   visible={showModal}
 *   loader={() => import('./AddContactModal')}
 * >
 *   {(Component) => (
 *     <Component
 *       visible={showModal}
 *       onDismiss={handleDismiss}
 *       onSave={handleSave}
 *     />
 *   )}
 * </LazyModal>
 */
export default function LazyModal({ visible, loader, children }) {
  const [Component, setComponent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    // Only load component when modal becomes visible for the first time
    if (visible && !hasLoaded && !loading) {
      setLoading(true);
      loader()
        .then(module => {
          setComponent(() => module.default || module);
          setHasLoaded(true);
          setLoading(false);
        })
        .catch(error => {
          console.error('LazyModal: Failed to load component', error);
          setLoading(false);
        });
    }
  }, [visible, hasLoaded, loading, loader]);

  // Don't render anything if never opened
  if (!hasLoaded && !loading) {
    return null;
  }

  // Show loading indicator while component loads
  if (loading && !Component) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // Render the loaded component
  if (Component) {
    return children(Component);
  }

  return null;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
