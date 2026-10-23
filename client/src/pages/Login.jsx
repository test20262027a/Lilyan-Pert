import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Icon from '../components/Icon';
import {
  AuthCard,
  AuthInput,
  AuthLayout,
  AuthPasswordInput,
  AuthPrimaryButton,
  AuthSecondaryLink,
  AuthStatusMessage,
  isEmail,
} from '../components/auth/AuthKit';
import { useI18n } from '../i18n';
import { useAuth } from '../context/AuthContext';
import { applyTheme, DEFAULT_THEME } from '../theme';

const SAMPLES = [
  { email: 'owner@lilyan.app', password: 'lilyan1234', role: 'role_owner' },
  { email: 'manager@lilyan.app', password: 'manager1234', role: 'role_manager' },
  { email: 'staff@lilyan.app', password: 'staff1234', role: 'role_staff' },
  { email: 'admin@lilyan.app', password: 'superadmin1234', role: 'role_super_admin' },
];

export default function Login() {
  const { t } = useI18n();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    applyTheme(DEFAULT_THEME);
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    const errors = {};
    if (!isEmail(email)) errors.email = t('auth_invalid_email');
    if (!password) errors.password = t('auth_password_required');
    setFieldErrors(errors);
    setError(null);
    if (Object.keys(errors).length) return;

    setBusy(true);
    try {
      await login(email, password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.code === 'INVALID_CREDENTIALS' ? t('auth_login_failed') : t('error_generic'));
    } finally {
      setBusy(false);
    }
  };

  const demo = (
    <details className="au-demo">
      <summary>{t('auth_demo_accounts')}</summary>
      <div className="au-demo__list">
        {SAMPLES.map((s) => (
          <button
            key={s.email}
            type="button"
            className="au-demo__item"
            onClick={() => {
              setEmail(s.email);
              setPassword(s.password);
              setFieldErrors({});
            }}
          >
            <Icon name="key" size={13} />
            <span dir="ltr">{s.email}</span>
            <span style={{ opacity: 0.75 }}>· {t(s.role)}</span>
          </button>
        ))}
      </div>
    </details>
  );

  return (
    <AuthLayout footer={demo}>
      <AuthCard title={t('auth_login')} subtitle={t('auth_login_subtitle')}>
        <form className="au-form" onSubmit={submit} noValidate>
          <AuthInput
            label={t('label_email')}
            icon="mail"
            type="email"
            dir="ltr"
            autoComplete="username"
            value={email}
            placeholder={t('auth_email_placeholder')}
            error={fieldErrors.email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <AuthPasswordInput
            label={t('label_password')}
            dir="ltr"
            autoComplete="current-password"
            value={password}
            placeholder="••••••••"
            error={fieldErrors.password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <div className="au-row">
            <AuthSecondaryLink to="/forgot-password">{t('auth_forgot_link')}</AuthSecondaryLink>
          </div>
          {error ? <AuthStatusMessage>{error}</AuthStatusMessage> : null}
          <AuthPrimaryButton busy={busy}>{t('auth_login')}</AuthPrimaryButton>
        </form>
        <p className="au-foot">
          {t('auth_no_account')} <Link to="/register">{t('auth_register')}</Link>
        </p>
      </AuthCard>
    </AuthLayout>
  );
}
