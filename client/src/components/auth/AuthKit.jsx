import { createContext, useContext, useEffect, useId, useState } from 'react';
import Icon from '../Icon';
import { useI18n } from '../../i18n';
import { get } from '../../api';
import { applyTheme, DEFAULT_THEME } from '../../theme';
import useDocumentMetadata from '../../hooks/useDocumentMetadata';
import LanguageMenu from './LanguageMenu';
import '../../auth.css';

/*
 * The shared pieces of the sign-in family (login, register): one cinematic
 * café backdrop, a frosted glass card, the business's own logo, soft 3D inputs
 * and a themed call-to-action. Everything is tinted from `--primary`, so the
 * login page follows whatever appearance the business has selected.
 */

const BrandContext = createContext(null);

/**
 * Business name, logo and theme from the public brand endpoint (no login
 * needed). `undefined` means still loading, `null` means the request failed.
 */
function useBrand() {
  const [brand, setBrand] = useState(undefined);
  useEffect(() => {
    let live = true;
    get('/public/brand')
      .then((b) => live && setBrand(b))
      .catch(() => live && setBrand(null));
    return () => {
      live = false;
    };
  }, []);
  return brand;
}

export function AuthLayout({ children, footer }) {
  const brand = useBrand();

  // The tab of the sign-in family names this screen and the business, in the
  // language the visitor is reading.
  useDocumentMetadata(brand);

  // The business picked this appearance for its public pages; the sign-in
  // screen is the first thing anyone sees, so it must not fall back to a
  // stock palette. Nothing is painted until the brand answers, which avoids a
  // flash of the default theme on the way in.
  useEffect(() => {
    if (brand === undefined) return;
    applyTheme(brand?.theme || DEFAULT_THEME);
  }, [brand]);

  return (
    <BrandContext.Provider value={brand}>
      <div className="au">
        <div className="au__bg" aria-hidden="true" />
        <div className="au__veil" aria-hidden="true" />
        <LanguageMenu />
        <main className="au__main">
          {children}
          {footer}
        </main>
      </div>
    </BrandContext.Provider>
  );
}

export function AuthCard({ title, subtitle, children }) {
  const { t } = useI18n();
  const brand = useContext(BrandContext);
  return (
    <section className="au-card">
      {/* The logo sits directly on the glass — no plate, box or tint behind it. */}
      <div className="au-card__logo">
        {brand === undefined ? null : brand?.logo_url ? (
          <img src={brand.logo_url} alt={brand.name || t('app_name')} />
        ) : (
          <span className="au-card__mark" aria-hidden="true">LP</span>
        )}
      </div>
      <h1 className="au-card__title">{title}</h1>
      {subtitle ? <p className="au-card__sub">{subtitle}</p> : null}
      {children}
    </section>
  );
}

export function AuthInput({ label, icon, error, action, className = '', ...props }) {
  const id = useId();
  return (
    <div className={`au-field ${error ? 'is-invalid' : ''} ${className}`.trim()}>
      <label className="au-field__label" htmlFor={id}>
        {label}
      </label>
      <div className="au-field__box">
        {icon ? <Icon name={icon} size={18} /> : null}
        <input id={id} aria-invalid={error ? 'true' : undefined} aria-describedby={error ? `${id}-e` : undefined} {...props} />
        {action}
      </div>
      {error ? (
        <p className="au-field__error" id={`${id}-e`}>
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function AuthPasswordInput({ label, error, ...props }) {
  const { t } = useI18n();
  const [shown, setShown] = useState(false);
  return (
    <AuthInput
      label={label}
      icon="lock"
      error={error}
      type={shown ? 'text' : 'password'}
      action={
        <button
          type="button"
          className="au-field__toggle"
          onClick={() => setShown((v) => !v)}
          aria-label={shown ? t('auth_hide_password') : t('auth_show_password')}
          aria-pressed={shown}
        >
          <Icon name={shown ? 'eyeOff' : 'eye'} size={18} />
        </button>
      }
      {...props}
    />
  );
}

export function AuthPrimaryButton({ busy, children, ...props }) {
  return (
    <button className="au-btn" type="submit" disabled={busy} aria-busy={busy || undefined} {...props}>
      {busy ? <span className="spinner" aria-hidden="true" /> : null}
      <span>{children}</span>
    </button>
  );
}

export function AuthStatusMessage({ kind = 'error', children }) {
  return (
    <div className={`au-status au-status--${kind}`} role={kind === 'error' ? 'alert' : 'status'}>
      <Icon name={kind === 'error' ? 'alert' : 'checkCircle'} size={18} />
      <span>{children}</span>
    </div>
  );
}

export const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v).trim());
