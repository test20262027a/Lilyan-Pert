import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Icon from '../components/Icon';
import { Alert, Field } from '../components/ui';
import { useI18n, LOCALES } from '../i18n';
import { useAuth } from '../context/AuthContext';
import { applyTheme, DEFAULT_THEME } from '../theme';

const SAMPLES = [
  { email: 'owner@lilyan.app', password: 'lilyan1234', role: 'role_owner' },
  { email: 'manager@lilyan.app', password: 'manager1234', role: 'role_manager' },
  { email: 'staff@lilyan.app', password: 'staff1234', role: 'role_staff' },
  { email: 'admin@lilyan.app', password: 'superadmin1234', role: 'role_super_admin' },
];

export default function Login() {
  const { t, locale, setLocale } = useI18n();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    applyTheme(DEFAULT_THEME);
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(email, password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.code === 'INVALID_CREDENTIALS' ? t('auth_login_failed') : t('error_generic'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-wrap">
      <form className="card card--pad auth-card" onSubmit={submit}>
        <div className="brand" style={{ padding: '0 0 8px' }}>
          <span className="brand__mark">LP</span>
          <span className="brand__text">
            <div className="brand__name">{t('app_name')}</div>
            <div className="brand__sub">{t('tagline')}</div>
          </span>
        </div>

        <h1 style={{ fontSize: 20, marginBottom: 4 }}>{t('auth_login')}</h1>
        <p style={{ color: 'var(--muted)', fontSize: 13.5, marginBottom: 16 }}>{t('auth_login_subtitle')}</p>

        <div className="form-grid" style={{ gridTemplateColumns: '1fr' }}>
          <Field label={t('label_email')}>
            <input
              className="input"
              type="email"
              autoComplete="username"
              required
              value={email}
              placeholder={t('auth_email_placeholder')}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
          <Field label={t('label_password')}>
            <input
              className="input"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              placeholder={t('auth_password_placeholder')}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
        </div>

        {error ? (
          <div style={{ marginTop: 14 }}>
            <Alert kind="error">{error}</Alert>
          </div>
        ) : null}

        <div style={{ marginTop: 16, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <button className="btn btn--primary" type="submit" disabled={busy}>
            {busy ? <span className="spinner" /> : <Icon name="logout" size={16} />}
            {t('auth_login')}
          </button>
          <select
            className="select"
            style={{ width: 'auto', minHeight: 40 }}
            value={locale}
            onChange={(e) => setLocale(e.target.value)}
            aria-label={t('label_language')}
          >
            {LOCALES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.label}
              </option>
            ))}
          </select>
        </div>

        <p style={{ marginTop: 14, fontSize: 13.5 }}>
          {t('auth_no_account')} <Link to="/register">{t('auth_register')}</Link>
        </p>

        <div style={{ marginTop: 18, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
          <div className="field__label" style={{ marginBottom: 8 }}>{t('auth_demo_accounts')}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {SAMPLES.map((s) => (
              <button
                key={s.email}
                type="button"
                className="chip"
                style={{ cursor: 'pointer', justifyContent: 'flex-start', width: '100%', padding: '7px 10px' }}
                onClick={() => {
                  setEmail(s.email);
                  setPassword(s.password);
                }}
              >
                <Icon name="key" size={13} />
                <span dir="ltr">{s.email}</span>
                <span style={{ color: 'var(--muted)' }}>· {t(s.role)}</span>
              </button>
            ))}
          </div>
        </div>
      </form>
    </div>
  );
}
