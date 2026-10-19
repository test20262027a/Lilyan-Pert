import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Icon from '../components/Icon';
import { Alert, Field } from '../components/ui';
import { useI18n } from '../i18n';
import { useAuth } from '../context/AuthContext';
import { applyTheme, DEFAULT_THEME } from '../theme';

export default function Register() {
  const { t } = useI18n();
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ business_name: '', full_name: '', email: '', password: '' });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    applyTheme(DEFAULT_THEME);
  }, []);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await register(form);
      navigate('/', { replace: true });
    } catch (err) {
      const map = {
        EMAIL_TAKEN: t('auth_email_taken'),
        WEAK_PASSWORD: t('auth_weak_password'),
      };
      setError(map[err.code] || t('auth_register_failed'));
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

        <h1 style={{ fontSize: 20, marginBottom: 4 }}>{t('auth_register')}</h1>
        <p style={{ color: 'var(--muted)', fontSize: 13.5, marginBottom: 16 }}>{t('auth_register_subtitle')}</p>

        <div className="form-grid" style={{ gridTemplateColumns: '1fr' }}>
          <Field label={t('label_business_name')}>
            <input className="input" required value={form.business_name} onChange={set('business_name')} />
          </Field>
          <Field label={t('label_full_name')}>
            <input className="input" value={form.full_name} onChange={set('full_name')} />
          </Field>
          <Field label={t('label_email')}>
            <input className="input" type="email" required value={form.email} onChange={set('email')} />
          </Field>
          <Field label={t('label_password')} hint={t('auth_weak_password')}>
            <input className="input" type="password" required minLength={8} value={form.password} onChange={set('password')} />
          </Field>
        </div>

        {error ? (
          <div style={{ marginTop: 14 }}>
            <Alert kind="error">{error}</Alert>
          </div>
        ) : null}

        <div style={{ marginTop: 16 }}>
          <button className="btn btn--primary" type="submit" disabled={busy}>
            {busy ? <span className="spinner" /> : <Icon name="plus" size={16} />}
            {t('auth_register')}
          </button>
        </div>

        <p style={{ marginTop: 14, fontSize: 13.5 }}>
          {t('auth_have_account')} <Link to="/login">{t('auth_login')}</Link>
        </p>
      </form>
    </div>
  );
}
