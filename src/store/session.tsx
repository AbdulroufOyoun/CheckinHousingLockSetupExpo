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
  setTenantAccessDeniedHandler,
  setUnauthorizedHandler,
} from '@/src/api/lockSetupClient';
import { setApiBaseOverride } from '@/src/config/apiBaseOverride';
import { normalizeApiRoot } from '@/src/config/env';
import { initI18n } from '@/src/i18n';
import { colors } from '@/src/theme/colors';
import { clearTenantCaches } from '@/src/services/tenantCache';

const KEYS = {
  token: 'bearer_token',
  tenantId: 'tenant_id',
  tenantDomain: 'tenant_domain',
  lang: 'app_lang',
  apiBase: 'api_base_override',
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
  setApiBase: (url: string) => Promise<void>;
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

  const clearTenant = useCallback(async () => {
    clearTenantCaches();
    await SecureStore.deleteItemAsync(KEYS.tenantId);
    await SecureStore.deleteItemAsync(KEYS.tenantDomain);
    setSelectedTenantId(null);
    setState((s) => ({ ...s, tenantId: null, tenantDomain: null }));
    router.replace('/(setup)/tenants');
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      void signOut();
    });
    setTenantAccessDeniedHandler(() => {
      void clearTenant();
    });
    return () => {
      setUnauthorizedHandler(null);
      setTenantAccessDeniedHandler(null);
    };
  }, [signOut, clearTenant]);

  useEffect(() => {
    (async () => {
      try {
        const [token, tenantId, tenantDomain, lang, apiBase] = await Promise.all([
          SecureStore.getItemAsync(KEYS.token),
          SecureStore.getItemAsync(KEYS.tenantId),
          SecureStore.getItemAsync(KEYS.tenantDomain),
          SecureStore.getItemAsync(KEYS.lang),
          SecureStore.getItemAsync(KEYS.apiBase),
        ]);
        if (apiBase) {
          setApiBaseOverride(normalizeApiRoot(apiBase));
        }
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
      } catch {
        setState((s) => ({ ...s, ready: true }));
      }
    })();
  }, []);

  const signIn = useCallback(async (token: string) => {
    clearTenantCaches();
    setSelectedTenantId(null);
    await SecureStore.deleteItemAsync(KEYS.tenantId);
    await SecureStore.deleteItemAsync(KEYS.tenantDomain);
    await SecureStore.setItemAsync(KEYS.token, token);
    setLockSetupBearer(token);
    setState((s) => ({ ...s, token, tenantId: null, tenantDomain: null }));
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

  const setLanguage = useCallback(async (lang: 'en' | 'ar') => {
    await SecureStore.setItemAsync(KEYS.lang, lang);
    await initI18n(lang);
  }, []);

  const setApiBase = useCallback(async (url: string) => {
    const normalized = normalizeApiRoot(url);
    setApiBaseOverride(normalized);
    await SecureStore.setItemAsync(KEYS.apiBase, normalized);
  }, []);

  const value = useMemo(
    () => ({
      ...state,
      signIn,
      selectTenant,
      clearTenant,
      signOut,
      setLanguage,
      setApiBase,
    }),
    [state, signIn, selectTenant, clearTenant, signOut, setLanguage, setApiBase],
  );

  if (!state.ready) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.surface,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ActivityIndicator color={colors.accent} size="large" />
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
