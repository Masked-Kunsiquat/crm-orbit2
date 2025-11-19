import React from 'react';
import { StyleSheet, View, ScrollView, RefreshControl } from 'react-native';
import { Appbar, useTheme } from 'react-native-paper';

/**
 * Standard screen container with header and scrollable content
 * Provides consistent layout across all screens
 */
export default function ScreenContainer({
  title,
  children,
  navigation,
  headerActions = [],
  showBackButton = false,
  refreshing = false,
  onRefresh,
  scrollable = true,
}) {
  const theme = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Appbar.Header elevated>
        {showBackButton && navigation && (
          <Appbar.BackAction onPress={() => navigation.goBack()} />
        )}
        <Appbar.Content title={title} />
        {headerActions.map((action, index) => (
          <Appbar.Action
            key={index}
            icon={action.icon}
            onPress={action.onPress}
            disabled={action.disabled}
          />
        ))}
      </Appbar.Header>

      {scrollable ? (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            onRefresh ? (
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            ) : undefined
          }
        >
          {children}
        </ScrollView>
      ) : (
        <View style={styles.content}>{children}</View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  content: {
    flex: 1,
    padding: 16,
  },
});
