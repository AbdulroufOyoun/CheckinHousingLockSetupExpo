import { router } from 'expo-router';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { loginLockSetup } from '@/src/api/lockSetupClient';
import { Button } from '@/src/components/ui/Button';
import { Screen } from '@/src/components/ui/Screen';
import { TextField } from '@/src/components/ui/TextField';
import { useSession } from '@/src/store/session';
import { colors } from '@/src/theme/colors';

export default function LoginScreen() {
  const { t } = useTranslation();
  const { signIn } = useSession();
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    const trimmed = loginId.trim();
    if (!trimmed || !password) {
      setError(t('loginError'));
      return;
    }
    setLoading(true);
    try {
      const isEmail = trimmed.includes('@');
      const data = await loginLockSetup({
        password,
        ...(isEmail ? { email: trimmed } : { mobile: trimmed }),
      });
      await signIn(data.token);
      router.replace('/(setup)/tenants');
    } catch (e) {
      setError(e instanceof Error ? e.message : t('loginError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.hero}>
            <Text style={styles.brand}>{t('appName')}</Text>
            <Text style={styles.sub}>{t('loginTitle')}</Text>
          </View>
          <View style={styles.card}>
            <TextField
              label={t('loginId')}
              autoCapitalize="none"
              keyboardType="email-address"
              value={loginId}
              onChangeText={setLoginId}
            />
            <TextField
              label={t('password')}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              onSubmitEditing={() => void submit()}
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Button label={t('login')} loading={loading} onPress={() => void submit()} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  hero: { marginBottom: 28 },
  brand: { color: colors.accent, fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  sub: { color: colors.muted, fontSize: 16, marginTop: 8, lineHeight: 22 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 4,
  },
  error: { color: colors.danger, marginBottom: 8 },
});
