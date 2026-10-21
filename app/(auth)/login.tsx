import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { formatUserErrorMessage } from '@/src/api/formatApiError';
import { loginLockSetup, normalizeMobileInput } from '@/src/api/lockSetupClient';
import {
  getApiBase,
  isApiBasePreconfigured,
  isEmulatorOnlyApiHost,
  normalizeApiRoot,
} from '@/src/config/env';
import Constants from 'expo-constants';
import { LoginHero } from '@/src/components/auth/LoginHero';
import { Button } from '@/src/components/ui/Button';
import { Screen } from '@/src/components/ui/Screen';
import { TextField } from '@/src/components/ui/TextField';
import { useResponsiveLayout } from '@/src/hooks/useResponsiveLayout';
import { useSession } from '@/src/store/session';
import { colors } from '@/src/theme/colors';
import { elevation, radii, spacing } from '@/src/theme/tokens';

export default function LoginScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { isWideLayout, scrollContentStyle } = useResponsiveLayout();
  const scrollRef = useRef<React.ElementRef<typeof ScrollView>>(null);
  const { signIn, setApiBase } = useSession();
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const apiPreconfigured = isApiBasePreconfigured();
  const [apiUrl, setApiUrl] = useState(getApiBase());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    setApiUrl(getApiBase());
  }, []);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const scrollFocusedFieldIntoView = () => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    });
  };

  const submit = async () => {
    setError(null);
    const trimmed = loginId.trim();
    if (!trimmed || !password) {
      setError(t('loginError'));
      return;
    }
    const base = normalizeApiRoot(apiPreconfigured ? getApiBase() : apiUrl);
    if (!base) {
      setError(t('apiBaseRequired'));
      return;
    }
    const onPhysicalDevice = Constants.isDevice;
    if (onPhysicalDevice && isEmulatorOnlyApiHost(base)) {
      setError(t('apiBaseDevHostOnDevice'));
      return;
    }
    setLoading(true);
    try {
      await setApiBase(base);
      const isEmail = trimmed.includes('@');
      const data = await loginLockSetup({
        password,
        ...(isEmail ? { email: trimmed } : { mobile: normalizeMobileInput(trimmed) }),
      });
      await signIn(data.token);
      router.replace('/(setup)/tenants');
    } catch (e) {
      setError(formatUserErrorMessage(e, t, 'login'));
    } finally {
      setLoading(false);
    }
  };

  const bottomPad = keyboardHeight > 0 ? keyboardHeight + 16 : insets.bottom + 24;

  const formCard = (
    <View style={styles.card}>
      <TextField
        label={t('loginId')}
        autoCapitalize="none"
        keyboardType="email-address"
        value={loginId}
        onChangeText={setLoginId}
        onFocus={scrollFocusedFieldIntoView}
        returnKeyType="next"
      />
      <TextField
        label={t('password')}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        onFocus={scrollFocusedFieldIntoView}
        onSubmitEditing={() => void submit()}
        returnKeyType="done"
      />
      {!apiPreconfigured ? (
        <>
          <TextField
            label={t('apiBaseLabel')}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            value={apiUrl}
            onChangeText={setApiUrl}
            onFocus={scrollFocusedFieldIntoView}
          />
          <Text style={styles.apiHint}>{t('apiBaseHint')}</Text>
        </>
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button label={t('login')} loading={loading} onPress={() => void submit()} />
    </View>
  );

  return (
    <Screen style={styles.screen}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.flex}
          contentContainerStyle={[scrollContentStyle, styles.scroll, { paddingBottom: bottomPad }]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          {isWideLayout ? (
            <View style={styles.splitRow}>
              <View style={styles.splitCol}>
                <LoginHero />
              </View>
              <View style={styles.splitCol}>{formCard}</View>
            </View>
          ) : (
            <>
              <LoginHero />
              {formCard}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { paddingBottom: 0 },
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingTop: spacing.lg,
    justifyContent: 'center',
  },
  splitRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.lg,
    width: '100%',
  },
  splitCol: {
    flex: 1,
    minWidth: 0,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    gap: spacing.xs,
    ...elevation.card,
  },
  error: { color: colors.danger, marginBottom: spacing.sm },
  apiHint: { color: colors.muted, fontSize: 11, marginBottom: spacing.sm, lineHeight: 16 },
});
