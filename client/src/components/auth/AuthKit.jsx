import { createContext, useContext, useEffect, useId, useState, useSyncExternalStore } from 'react';
import Icon from '../Icon';
import { useI18n } from '../../i18n';
import { applyTheme, cachedTheme } from '../../theme';
import useDocumentMetadata from '../../hooks/useDocumentMetadata';
import { brandLogoSnapshot, loadPublicBrand, subscribeBrandLogo } from '../../brandLogo';
import LanguageMenu from './LanguageMenu';
import '../../auth.css';

/*
 * The shared pieces of the sign-in family (login, register): one cinematic
 * café backdrop, a frosted glass card, the business's own logo, soft 3D inputs
 * and a themed call-to-action. Everything is tinted from `--primary`, so the
 * login page follows whatever appearance the business has selected.
 */

const BrandContext = createContext(null);

/** How long the sign-in screen waits for its own branding before carrying on. */
const BRAND_TIMEOUT_MS = 6000;

/**
 * Business name, logo and theme from the public brand endpoint (no login
 * needed). `undefined` means still loading, `null` means it is unavailable.
 *
 * Branding is decoration, never a gate: this request raises no global loader
 * and its failure or silence is not something the form can wait on. It is also
 * bounded, so a request that never answers cannot leave `undefined` behind.
 */
function useBrand() {
  const [brand, setBrand] = useState(undefined);
  useEffect(() => {
    let live = true;
    const settle = (value) => {
      if (live) setBrand(value);
    };
    const timer = window.setTimeout(() => settle(null), BRAND_TIMEOUT_MS);
    loadPublicBrand()
      .then(settle)
      .catch(() => settle(null))
      .finally(() => window.clearTimeout(timer));
    return () => {
      live = false;
      window.clearTimeout(timer);
    };
  }, []);
  return brand;
}

export function AuthLayout({ children, footer }) {
  const brand = useBrand();
  /*
   * The business's own sign-in backdrop. It is shown only once the picture has
   * decoded, layered over the shipped default behind the same vignette — so a
   * slow request never paints a half-drawn frame, the layout never shifts, and
   * a business that has not chosen one keeps the stock photograph.
   */
  const loginBg = brand?.login_bg_url || '';
  const [bgReady, setBgReady] = useState(false);
  useEffect(() => {
    if (!loginBg) {
      setBgReady(false);
      return undefined;
    }
    let live = true;
    const img = new Image();
    img.onload = () => {
      if (live) setBgReady(true);
    };
    img.onerror = () => {
      if (live) setBgReady(false);
    };
    img.src = loginBg;
    return () => {
      live = false;
    };
  }, [loginBg]);

  // The tab of the sign-in family names this screen and the business, in the
  // language the visitor is reading.
  useDocumentMetadata(brand);

  // The business picked this appearance for its public pages; the sign-in
  // screen is the first thing anyone sees, so it carries the real one from the
  // first frame: the remembered theme (index.html reads it before paint) until
  // the business's own record answers, then that record.
  //
  // With neither, NOTHING is applied on purpose. A stock palette written here
  // would not only tint this screen — it would be mirrored into the cache and
  // painted as if it were the business's own theme on the next boot, which is
  // exactly the previous-theme flash the loader must never show. The neutral
  // tokens in styles.css hold the surface, and the loader keeps its neutral
  // glass disc until a real appearance is known.
  useEffect(() => {
    if (brand === undefined) return;
    // The mirror first, and on purpose: it is exactly what `index.html` painted
    // on the first frame, and it is rewritten every time the app applies an
    // appearance — including a theme the owner just saved. This page's own
    // branding payload is fetched once per page load and is therefore older
    // than the mirror inside the same visit, which is how a sign-out used to
    // repaint the sign-in screen in the theme the owner had just replaced.
    const cached = cachedTheme();
    if (cached) {
      applyTheme(cached, cached.id || undefined, 'cached');
      return;
    }
    // Nothing remembered: the business's own record, if it has one. With
    // neither, nothing is applied — a stock palette written here would tint
    // this screen and be remembered as if it were the business's appearance.
    if (brand?.theme) applyTheme(brand.theme);
  }, [brand]);

  return (
    <BrandContext.Provider value={brand}>
      <div className="au">
        <div className="au__bg" aria-hidden="true" />
        {bgReady && loginBg ? (
          <div
            className="au__bg au__bg--custom"
            style={{ backgroundImage: `url("${loginBg}")` }}
            aria-hidden="true"
          />
        ) : null}
        <div className="au__veil" aria-hidden="true" />
        <LanguageMenu />
        <main className="au__main">
          {/* The form is never held back by branding: the theme is already on
              the document before React runs (index.html), so the first frame is
              correct, and a slow or failed logo request only delays the logo. */}
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
  /* Remembered/arriving logo first, so the sign-in card never depends on this
     page's request having finished. */
  const rememberedLogo = useSyncExternalStore(subscribeBrandLogo, brandLogoSnapshot, brandLogoSnapshot);
  return (
    <section className="au-card">
      {/* The logo sits directly on the glass — no plate, box or tint behind it. */}
      <div className="au-card__logo">
        {brand?.logo_url || rememberedLogo ? (
          <img src={brand?.logo_url || rememberedLogo} alt={brand?.name || t('app_name')} />
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
