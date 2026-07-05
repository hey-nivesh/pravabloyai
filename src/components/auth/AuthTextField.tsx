/**
 * AuthTextField — pill-shaped input field for auth screens.
 *
 * Features:
 *  - 24px border radius "pill" shape
 *  - Leading SymbolView icon in Brand.primary
 *  - Optional trailing action (show/hide password toggle)
 *  - Soft purple-tinted shadow on white card background
 *  - grayText placeholder color
 *  - Focus ring in Brand.primary
 */

import React, { type ComponentProps, forwardRef, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  TextInput,
  type TextInputProps,
  View,
} from 'react-native';
import { SymbolView } from 'expo-symbols';

import { Brand, Radius, Spacing } from '@/constants/theme';

// ─── Types ────────────────────────────────────────────────────────────────────

type SymbolName = ComponentProps<typeof SymbolView>['name'];

type AuthTextFieldProps = TextInputProps & {
  /** Platform-adaptive icon shown on the left */
  leadingIcon: SymbolName;
  /** If true, shows a show/hide password toggle on the right */
  isPassword?: boolean;
};

// ─── Component ────────────────────────────────────────────────────────────────

export const AuthTextField = forwardRef<TextInput, AuthTextFieldProps>(
  function AuthTextField(
    { leadingIcon, isPassword = false, secureTextEntry, style, ...rest },
    ref,
  ) {
    const [focused, setFocused] = useState(false);
    const [hidden, setHidden] = useState(isPassword);

    const showEyeIcon: SymbolName = {
      ios: 'eye.fill',
      android: 'visibility',
      web: 'visibility',
    };
    const hideEyeIcon: SymbolName = {
      ios: 'eye.slash.fill',
      android: 'visibility_off',
      web: 'visibility_off',
    };

    return (
      <View
        style={[
          styles.container,
          focused && styles.containerFocused,
        ]}
      >
        {/* Leading icon */}
        <View style={styles.leadingIconWrapper}>
          <SymbolView
            name={leadingIcon}
            size={18}
            tintColor={focused ? Brand.primary : Brand.grayText}
          />
        </View>

        {/* Text input */}
        <TextInput
          ref={ref}
          style={[styles.input, style]}
          placeholderTextColor={Brand.grayText}
          secureTextEntry={isPassword ? hidden : secureTextEntry}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          autoCapitalize="none"
          autoCorrect={false}
          {...rest}
        />

        {/* Show/hide toggle for password fields */}
        {isPassword && (
          <Pressable
            onPress={() => setHidden((h) => !h)}
            style={styles.trailingBtn}
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Show password' : 'Hide password'}
            hitSlop={8}
          >
            <SymbolView
              name={hidden ? showEyeIcon : hideEyeIcon}
              size={18}
              tintColor={Brand.grayText}
            />
          </Pressable>
        )}
      </View>
    );
  },
);

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.lg, // 24px — pill shape
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    paddingHorizontal: Spacing.three,
    height: 54,
    shadowColor: Brand.shadowColor,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    gap: Spacing.two,
  },
  containerFocused: {
    borderColor: Brand.primary,
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  leadingIconWrapper: {
    width: 24,
    alignItems: 'center',
    flexShrink: 0,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: Brand.primaryDark,
    paddingVertical: 0, // android adds extra padding otherwise
  },
  trailingBtn: {
    padding: Spacing.one,
    flexShrink: 0,
  },
});
