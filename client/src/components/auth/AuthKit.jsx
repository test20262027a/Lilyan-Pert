import { useEffect, useId, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../Icon';
import { useI18n, LOCALES } from '../../i18n';
import { get } from '../../api';
import '../../auth.css';

/*
 * The shared pieces of the sign-in family (login, forgot password): a full
 * screen café backdrop, one cream card, the business's own logo, soft 3D
 * inputs and a green call-to-action. Every page composes these so they always
 * read as one set.
 */

/** Business name + logo from the public brand endpoint (no login needed). */
function useBrand() {
  const [brand, setBrand] = useState(null);
  useEffect(() => {
    let live = true;
    get('/public/brand')
      .then((b) => live && setBrand(b))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);
  return brand;
}

export function AuthLayout({ children, footer }) {
  const { t, locale, setLocale } = useI18n();
  return (
    <div className="au">
      <div className="au__bg" aria-hidden="true" />
      <div className="au__veil" aria-hidden="true" />
      <div className="au__lang">
        <Icon name="globe" size={15} />
        <select value={locale} onChange={(e) => setLocale(e.target.value)} aria-label={t('label_language')}>
          {LOCALES.map((l) => (
            <option key={l.code} value={l.code}>
              {l.label}
            </option>
          ))}
        </select>
      </div>
      <main className="au__main">
        {children}
        {footer}
      </main>
    </div>
  );
}

export function AuthCard({ title, subtitle, children }) {
  const { t } = useI18n();
  const brand = useBrand();
  return (
    <section className="au-card">
      <div className="au-card__logo">
        {brand?.logo_url ? (
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

export function AuthSecondaryLink({ to, icon, children }) {
  return (
    <Link className="au-link" to={to}>
      {icon ? <Icon name={icon} size={16} /> : null}
      {children}
    </Link>
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
