import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { ActivityIndicator, View } from 'react-native';

import {
  setLockSetupBearer,
  setSelectedTenantId,
  setUnauthorizedHandler,
} from '@/src/api/lockSetupClient';
import { initI18n } from '@/src/i18n';
import { clearTenantCaches } from '@/src/services/tenantCache';

const KEYS = {
  token: 'bearer_token',
  tenantId: 'tenant_id',
  tenantDomain: 'tenant_domain',
  lang: 'app_lang',
};

type SessionState = {
  ready: boolean;
  token: string | null;
  tenantId: string | null;
  tenantDomain: string | null;
};

type SessionContextValue = SessionState & {
  signIn: (token: string) => Promise<void>;
  selectTenant: (id: string, domain: string | null) => Promise<void>;
  clearTenant: () => Promise<void>;
  signOut: () => Promise<void>;
  setLanguage: (lang: 'en' | 'ar') => Promise<void>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<SessionState>({
    ready: false,
    token: null,
    tenantId: null,
    tenantDomain: null,
  });

  const signOut = useCallback(async () => {
    clearTenantCaches();
    setLockSetupBearer(null);
    setSelectedTenantId(null);
    await SecureStore.deleteItemAsync(KEYS.token);
    await SecureStore.deleteItemAsync(KEYS.tenantId);
    await SecureStore.deleteItemAsync(KEYS.tenantDomain);
    setState({ ready: true, token: null, tenantId: null, tenantDomain: null });
    router.replace('/(auth)/login');
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      void signOut();
    });
    return () => setUnauthorizedHandler(null);
  }, [signOut]);

  useEffect(() => {
    (async () => {
      const [token, tenantId, tenantDomain, lang] = await Promise.all([
        SecureStore.getItemAsync(KEYS.token),
        SecureStore.getItemAsync(KEYS.tenantId),
        SecureStore.getItemAsync(KEYS.tenantDomain),
        SecureStore.getItemAsync(KEYS.lang),
      ]);
      await initI18n(lang ?? undefined);
      if (token) {
        setLockSetupBearer(token);
      }
      if (tenantId) {
        setSelectedTenantId(tenantId);
      }
      setState({
        ready: true,
        token: token ?? null,
        tenantId: tenantId ?? null,
        tenantDomain: tenantDomain ?? null,
      });
    })();
  }, []);

  const signIn = useCallback(async (token: string) => {
    await SecureStore.setItemAsync(KEYS.token, token);
    setLockSetupBearer(token);
    setState((s) => ({ ...s, token }));
  }, []);

  const selectTenant = useCallback(async (id: string, domain: string | null) => {
    clearTenantCaches();
    await SecureStore.setItemAsync(KEYS.tenantId, id);
    if (domain) {
      await SecureStore.setItemAsync(KEYS.tenantDomain, domain);
    }
    setSelectedTenantId(id);
    setState((s) => ({ ...s, tenantId: id, tenantDomain: domain }));
  }, []);

  const clearTenant = useCallback(async () => {
    clearTenantCaches();
    await SecureStore.deleteItemAsync(KEYS.tenantId);
    await SecureStore.deleteItemAsync(KEYS.tenantDomain);
    setSelectedTenantId(null);
    setState((s) => ({ ...s, tenantId: null, tenantDomain: null }));
  }, []);

  const setLanguage = useCallback(async (lang: 'en' | 'ar') => {
    await SecureStore.setItemAsync(KEYS.lang, lang);
    await initI18n(lang);
  }, []);

  const value = useMemo(
    () => ({
      ...state,
      signIn,
      selectTenant,
      clearTenant,
      signOut,
      setLanguage,
    }),
    [state, signIn, selectTenant, clearTenant, signOut, setLanguage],
  );

  if (!state.ready) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0F1419', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#2DD4BF" size="large" />
      </View>
    );
  }

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession outside provider');
  return ctx;
}
