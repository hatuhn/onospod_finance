import en from '../../messages/en.json';
import vi from '../../messages/vi.json';
import type {Locale} from './views';

const bundles = {en, vi};
const keyOf = (key: string) => key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());

export function language(locale: Locale) {
  const bundle = bundles[locale];
  const lookup = (section: Record<string, string>, key: string) => section[key] ?? section[keyOf(key)];
  const t = (key: string, values: Record<string, string | number> = {}) => {
    const message = [bundle.ui, bundle.kpi, bundle.actions, bundle.misc, bundle.statuses, bundle.charts].map(section => lookup(section, key)).find(Boolean) ?? key;
    return message.replace(/\{(\w+)\}/g, (token, name: string) => String(values[name] ?? token));
  };
  const formatLocale = locale === 'vi' ? 'vi-VN' : 'en-US';
  const cash = new Intl.NumberFormat(formatLocale, {style: 'currency', currency: 'USD'});
  const count = new Intl.NumberFormat(formatLocale);
  const compact = new Intl.NumberFormat(formatLocale, {notation: 'compact', maximumFractionDigits: 1});
  const signedPercent = new Intl.NumberFormat(formatLocale, {style: 'percent', maximumFractionDigits: 1, signDisplay: 'exceptZero'});
  const percent = new Intl.NumberFormat(formatLocale, {style: 'percent', minimumFractionDigits: 2, maximumFractionDigits: 2});
  const date = new Intl.DateTimeFormat(formatLocale, locale === 'vi'
    ? {day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Asia/Bangkok'}
    : {dateStyle: 'medium', timeZone: 'Asia/Bangkok'});
  const short = new Intl.DateTimeFormat(formatLocale, {day: '2-digit', month: '2-digit', timeZone: 'UTC'});
  const time = new Intl.DateTimeFormat(formatLocale, {dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Bangkok'});
  return {
    ...bundle, t, cash: (cents: number) => cash.format(cents / 100), count: (value: number) => count.format(value),
    compact: (value: number) => compact.format(value),
    signedPercent: (ratio: number) => signedPercent.format(ratio),
    percent: (value: number) => percent.format(value / 100),
    date: (value: string) => {
      const parsed = Date.parse(value.length === 7 ? value + '-01' : value);
      if (!Number.isFinite(parsed)) return value;
      if (value.length === 7) return new Intl.DateTimeFormat(formatLocale, {month: 'short', year: 'numeric', timeZone: 'UTC'}).format(parsed);
      return (value.includes('T') ? time : date).format(parsed);
    },
    shortDate: (value: string) => short.format(Date.parse(value)),
    status: (key: string) => lookup(bundle.statuses, key) ?? t(key),
  };
}
export type Language = ReturnType<typeof language>;
