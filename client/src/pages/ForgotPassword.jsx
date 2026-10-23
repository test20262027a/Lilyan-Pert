import { useEffect, useState } from 'react';
import Icon from '../components/Icon';
import {
  AuthCard,
  AuthInput,
  AuthLayout,
  AuthPrimaryButton,
  AuthSecondaryLink,
  AuthStatusMessage,
  isEmail,
} from '../components/auth/AuthKit';
import { useI18n } from '../i18n';
import { post } from '../api';
import { applyTheme, DEFAULT_THEME } from '../theme';

export default function ForgotPassword() {
  const { t } = useI18n();
  const [email, setEmail] = useState('');
  const [fieldError, setFieldError] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    applyTheme(DEFAULT_THEME);
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!isEmail(email)) {
      setFieldError(t('auth_invalid_email'));
      return;
    }
    setFieldError(null);
    setBusy(true);
    try {
      await post('/auth/forgot-password', { email: email.trim() });
      setSent(true);
    } catch (err) {
      setError(err.code === 'INVALID_EMAIL' ? t('auth_invalid_email') : t('error_generic'));
    } finally {
      setBusy(false);
    }
  };

  if (sent) {
    return (
      <AuthLayout>
        <AuthCard title={t('auth_sent_title')}>
          <div className="au-done">
            <span className="au-done__icon" aria-hidden="true">
              <Icon name="check" size={34} />
            </span>
            <AuthStatusMessage kind="success">{t('auth_sent_text')}</AuthStatusMessage>
            <AuthSecondaryLink to="/login" icon="arrowLeft">
              {t('auth_back_to_login')}
            </AuthSecondaryLink>
          </div>
        </AuthCard>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <AuthCard title={t('auth_forgot_title')} subtitle={t('auth_forgot_subtitle')}>
        <form className="au-form" onSubmit={submit} noValidate>
          <AuthInput
            label={t('label_email')}
            icon="mail"
            type="email"
            dir="ltr"
            autoComplete="email"
            autoFocus
            value={email}
            placeholder={t('auth_email_placeholder')}
            error={fieldError}
            onChange={(e) => setEmail(e.target.value)}
          />
          {error ? <AuthStatusMessage>{error}</AuthStatusMessage> : null}
          <AuthPrimaryButton busy={busy}>{t('auth_send_link')}</AuthPrimaryButton>
        </form>
        <p className="au-foot">
          <AuthSecondaryLink to="/login" icon="arrowLeft">
            {t('auth_back_to_login')}
          </AuthSecondaryLink>
        </p>
      </AuthCard>
    </AuthLayout>
  );
}
