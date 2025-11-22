import React, { useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import {
  Modal,
  Portal,
  Surface,
  Text,
  IconButton,
  Button,
  useTheme,
  Divider,
} from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

/**
 * BaseModal - Enhanced modal component with modern UX patterns
 *
 * Features:
 * - Bottom sheet style for mobile-first design
 * - Swipe-to-dismiss gesture support
 * - Smooth entry/exit animations
 * - Keyboard avoidance
 * - Consistent header styling
 * - Action button layout
 * - Responsive sizing
 *
 * @param {boolean} visible - Controls modal visibility
 * @param {function} onDismiss - Called when modal is dismissed
 * @param {string} title - Modal title
 * @param {string} subtitle - Optional subtitle
 * @param {React.ReactNode} headerRight - Custom header right content (default: close button)
 * @param {React.ReactNode} children - Modal content
 * @param {Array<{label: string, onPress: function, mode?: string, loading?: boolean, disabled?: boolean, icon?: string}>} actions - Bottom action buttons
 * @param {boolean} bottomSheet - Use bottom sheet style (default: true on mobile)
 * @param {number} maxHeight - Maximum height percentage (0-1, default: 0.9)
 * @param {boolean} scrollable - Enable scrolling (default: true)
 * @param {boolean} dismissable - Allow dismissal via backdrop/gesture (default: true)
 */
export default function BaseModal({
  visible,
  onDismiss,
  title,
  subtitle,
  headerRight,
  children,
  actions = [],
  bottomSheet = Platform.OS !== 'web',
  maxHeight = 0.9,
  scrollable = true,
  dismissable = true,
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Animate modal entry/exit
  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 50,
          friction: 10,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const handleDismiss = () => {
    if (dismissable) {
      onDismiss();
    }
  };

  const maxHeightValue = SCREEN_HEIGHT * maxHeight;

  // Bottom sheet transforms
  const bottomSheetTransform = bottomSheet
    ? {
        transform: [
          {
            translateY: slideAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [SCREEN_HEIGHT, 0],
            }),
          },
        ],
      }
    : {
        transform: [
          {
            scale: slideAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0.9, 1],
            }),
          },
        ],
        opacity: fadeAnim,
      };

  const surfaceStyle = bottomSheet
    ? [
        styles.bottomSheetSurface,
        {
          maxHeight: maxHeightValue,
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
          paddingBottom: insets.bottom || 12,
        },
      ]
    : [
        styles.centeredSurface,
        {
          maxHeight: maxHeightValue,
          borderRadius: 28,
        },
      ];

  const ContentWrapper = scrollable ? ScrollView : View;
  const contentWrapperProps = scrollable
    ? {
        style: styles.scrollContent,
        showsVerticalScrollIndicator: false,
        keyboardShouldPersistTaps: 'handled',
      }
    : { style: styles.content };

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={handleDismiss}
        contentContainerStyle={[
          bottomSheet ? styles.bottomSheetModal : styles.centeredModal,
        ]}
        dismissable={dismissable}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <Surface style={surfaceStyle} elevation={5}>
            <Animated.View style={[styles.animatedContent, bottomSheetTransform]}>
              {/* Drag handle for bottom sheet */}
              {bottomSheet && (
                <View style={styles.dragHandleContainer}>
                  <View
                    style={[
                      styles.dragHandle,
                      { backgroundColor: theme.colors.surfaceVariant },
                    ]}
                  />
                </View>
              )}

              {/* Header */}
              <View style={styles.header}>
                <View style={styles.headerLeft}>
                  <Text variant="headlineSmall" style={styles.title}>
                    {title}
                  </Text>
                  {subtitle && (
                    <Text
                      variant="bodyMedium"
                      style={[
                        styles.subtitle,
                        { color: theme.colors.onSurfaceVariant },
                      ]}
                    >
                      {subtitle}
                    </Text>
                  )}
                </View>
                <View style={styles.headerRight}>
                  {headerRight !== undefined ? (
                    headerRight
                  ) : (
                    <IconButton
                      icon="close"
                      size={24}
                      onPress={handleDismiss}
                      style={styles.closeButton}
                    />
                  )}
                </View>
              </View>

              <Divider />

              {/* Content */}
              <ContentWrapper {...contentWrapperProps}>
                <View style={styles.contentInner}>{children}</View>
              </ContentWrapper>

              {/* Actions */}
              {actions.length > 0 && (
                <>
                  <Divider />
                  <View style={styles.actions}>
                    {actions.map((action, index) => (
                      <Button
                        key={index}
                        mode={action.mode || (index === actions.length - 1 ? 'contained' : 'outlined')}
                        onPress={action.onPress}
                        style={[
                          styles.button,
                          actions.length === 1 && styles.singleButton,
                        ]}
                        disabled={action.disabled}
                        loading={action.loading}
                        icon={action.icon}
                      >
                        {action.label}
                      </Button>
                    ))}
                  </View>
                </>
              )}
            </Animated.View>
          </Surface>
        </KeyboardAvoidingView>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  centeredModal: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  bottomSheetModal: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  keyboardView: {
    width: '100%',
  },
  centeredSurface: {
    width: '100%',
    overflow: 'hidden',
  },
  bottomSheetSurface: {
    width: '100%',
    overflow: 'hidden',
  },
  surface: {
    flex: 1,
    overflow: 'hidden',
  },
  animatedContent: {
    flex: 1,
  },
  dragHandleContainer: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 8,
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 24,
    paddingVertical: 20,
    gap: 16,
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    marginTop: -8,
  },
  title: {
    fontWeight: '600',
    lineHeight: 32,
  },
  subtitle: {
    marginTop: 4,
    lineHeight: 20,
  },
  closeButton: {
    margin: 0,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
  },
  contentInner: {
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
    gap: 12,
  },
  button: {
    flex: 1,
  },
  singleButton: {
    flex: undefined,
    minWidth: 120,
  },
});
