import React from 'react';
import { useTranslation } from 'react-i18next';

import { SearchBar } from '@/src/components/ui/SearchBar';

type Props = {
  value: string;
  onChangeText: (text: string) => void;
};

export function PropertySearchBar({ value, onChangeText }: Props) {
  const { t } = useTranslation();
  return (
    <SearchBar
      value={value}
      onChangeText={onChangeText}
      placeholder={t('propertySearchPlaceholder')}
    />
  );
}
