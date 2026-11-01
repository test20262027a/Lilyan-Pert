import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../components/Icon';
import {
  AuthCard,
  AuthInput,
  AuthLayout,
  AuthPasswordInput,
  AuthPrimaryButton,
  AuthStatusMessage,
  isEmail,
} from '../components/auth/AuthKit';
import { useI18n } from '../i18n';
import { useAuth } from '../context/AuthContext';
import { beginLoading, endLoading } from '../loading';
import GlobalBrandedLoader from '../components/brand/GlobalBrandedLoader';

export default function Login() {
  const { t } = useI18n();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    const errors = {};
    if (!isEmail(email)) errors.email = t('auth_invalid_email');
    if (!password) errors.password = t('auth_password_required');
    setFieldErrors(errors);
    setError(null);
    if (Object.keys(errors).length) return;

    setBusy(true);
    /* Signing in resolves the session *and* the account's permissions, so it is
       one of the few places that may block the screen. The loader is driven by
       this real request — nothing is reloaded and a rejected password simply
       never reaches the overlay. */
    beginLoading('auth');
    try {
      await login(email, password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.code === 'INVALID_CREDENTIALS' ? t('auth_login_failed') : t('error_generic'));
    } finally {
      endLoading('auth');
      setBusy(false);
    }
  };

  return (
    <AuthLayout>
      {/* Signing in is the one blocking step on this page; it follows the real
          request through the global loading signal. */}
      <GlobalBrandedLoader />
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
          {error ? <AuthStatusMessage>{error}</AuthStatusMessage> : null}
          <AuthPrimaryButton busy={busy}>{t('auth_login')}</AuthPrimaryButton>
        </form>
        <p className="au-note">
          <Icon name="shield" size={13} />
          {t('auth_login_note')}
        </p>
      </AuthCard>
    </AuthLayout>
  );
}
