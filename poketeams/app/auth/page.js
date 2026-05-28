"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '../../lib/authService';
import styles from './page.module.css';

const MODE = {
  LOGIN: 'login',
  SIGNUP: 'signup',
};
const MODE_CONFIG = {
  [MODE.LOGIN]: {
    title: 'Entrar',
    submitLabel: 'Entrar',
    loadingLabel: 'Entrando...',
    switchLabel: 'Nao tem conta? Cadastrar',
    action: authService.signIn,
  },
  [MODE.SIGNUP]: {
    title: 'Cadastrar',
    submitLabel: 'Cadastrar',
    loadingLabel: 'Cadastrando...',
    switchLabel: 'Ja tem conta? Entrar',
    action: authService.signUp,
  },
};

const MIN_PASSWORD_LENGTH = 6;
const MIN_DISPLAY_NAME_LENGTH = 3;
const EMAIL_REGEX = /^(?=.{1,254}$)(?=.{1,64}@)[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

function getFieldError(field, value, formData, mode) {
  const trimmedEmail = formData.email.trim();
  const trimmedUsername = formData.username.trim();

  if (field === 'email') {
    if (!trimmedEmail) return 'Informe seu email.';
    if (!EMAIL_REGEX.test(trimmedEmail)) return 'Informe um email valido.';
    return '';
  }

  if (field === 'password') {
    if (!value) return 'Informe sua senha.';
    if (value.length < MIN_PASSWORD_LENGTH) {
      return `A senha deve ter no minimo ${MIN_PASSWORD_LENGTH} caracteres.`;
    }
    return '';
  }

  if (field === 'username' && mode === MODE.SIGNUP) {
    if (!trimmedUsername) return '';
    if (trimmedUsername.length < MIN_DISPLAY_NAME_LENGTH) {
      return `O nome de usuario deve ter no minimo ${MIN_DISPLAY_NAME_LENGTH} caracteres.`;
    }
    return '';
  }

  if (field === 'confirmPassword' && mode === MODE.SIGNUP) {
    if (!value) return 'Confirme sua senha.';
    if (value !== formData.password) return 'As senhas nao coincidem.';
    return '';
  }

  return '';
}

function validateForm(formData, mode) {
  const fields = ['email', 'password'];
  if (mode === MODE.SIGNUP) fields.push('username', 'confirmPassword');

  return fields.reduce((acc, field) => {
    const message = getFieldError(field, formData[field], formData, mode);
    if (message) acc[field] = message;
    return acc;
  }, {});
}

function AuthField({
  id,
  label,
  type,
  value,
  onChange,
  onBlur,
  disabled,
  autoComplete,
  error,
  showState,
  required = true,
}) {
  const fieldStatusClass = showState
    ? error
      ? styles.inputError
      : value
        ? styles.inputSuccess
        : ''
    : '';

  return (
    <div className={styles.inputGroup}>
      <label htmlFor={id} className={styles.label}>{label}</label>
      <input
        type={type}
        id={id}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        className={`${styles.input} ${fieldStatusClass}`.trim()}
        disabled={disabled}
        autoComplete={autoComplete}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        required={required}
      />
      {showState && error && (
        <p id={`${id}-error`} className={styles.fieldError} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export default function Auth() {
  const [mode, setMode] = useState(MODE.LOGIN);
  const [formData, setFormData] = useState({ username: '', email: '', password: '', confirmPassword: '' });
  const [fieldErrors, setFieldErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();

  const { title, submitLabel, loadingLabel, switchLabel, action } = MODE_CONFIG[mode];
  const { username, email, password, confirmPassword } = formData;
  const isSignup = mode === MODE.SIGNUP;

  const shouldShowFieldError = (field) => submitAttempted || touched[field];

  useEffect(() => {
    let isMounted = true;

    const checkSession = async () => {
      const {
        data: { user }
      } = await authService.getCurrentUser();

      if (!isMounted) return;

      if (user) {
        router.replace('/');
        return;
      }

      setSessionLoading(false);
    };

    checkSession();

    const { data: authListener } = authService.onAuthStateChange((event, session) => {
      if (!isMounted) return;

      if (session?.user) {
        router.replace('/');
        return;
      }

      setSessionLoading(false);
    });

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [router]);

  const getVisibleFieldError = (field) => (shouldShowFieldError(field) ? fieldErrors[field] : '');

  const refreshFieldError = (field, nextFormData) => {
    const nextError = getFieldError(field, nextFormData[field], nextFormData, mode);
    setFieldErrors((prev) => {
      const updated = { ...prev };
      if (nextError) updated[field] = nextError;
      else delete updated[field];
      return updated;
    });
  };

  const handleInputChange = (field) => (event) => {
    const { value } = event.target;
    const nextFormData = { ...formData, [field]: value };
    setFormData(nextFormData);

    if (shouldShowFieldError(field)) refreshFieldError(field, nextFormData);
    if (isSignup && field === 'password' && shouldShowFieldError('confirmPassword')) {
      refreshFieldError('confirmPassword', nextFormData);
    }
  };

  const handleBlur = (field) => () => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    refreshFieldError(field, formData);
  };

  const handleModeSwitch = () => {
    if (loading) return;

    setMode((prev) => (prev === MODE.LOGIN ? MODE.SIGNUP : MODE.LOGIN));
    setError('');
    setFieldErrors({});
    setTouched({});
    setSubmitAttempted(false);
    setFormData((prev) => ({ ...prev, password: '', confirmPassword: '' }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (loading) return;
    setSubmitAttempted(true);

    const nextFieldErrors = validateForm(formData, mode);
    setFieldErrors(nextFieldErrors);

    if (Object.keys(nextFieldErrors).length > 0) return;

    setLoading(true);
    setError('');

    try {
      await action(email.trim(), password, username.trim());
      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nao foi possivel autenticar. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  if (sessionLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.authCard}>
          <h1 className={styles.title}>Carregando...</h1>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.authCard}>
        <h1 className={styles.title}>{title}</h1>

        <form onSubmit={handleSubmit} className={styles.form}>
          {isSignup && (
            <AuthField
              id="username"
              label="Nome de usuario"
              type="text"
              value={username}
              onChange={handleInputChange('username')}
              onBlur={handleBlur('username')}
              disabled={loading}
              autoComplete="nickname"
              error={getVisibleFieldError('username')}
              showState={shouldShowFieldError('username')}
              required={false}
            />
          )}

          <AuthField
            id="email"
            label="Email"
            type="email"
            value={email}
            onChange={handleInputChange('email')}
            onBlur={handleBlur('email')}
            disabled={loading}
            autoComplete="email"
            error={getVisibleFieldError('email')}
            showState={shouldShowFieldError('email')}
          />

          <AuthField
            id="password"
            label="Senha"
            type="password"
            value={password}
            onChange={handleInputChange('password')}
            onBlur={handleBlur('password')}
            disabled={loading}
            autoComplete={mode === MODE.LOGIN ? 'current-password' : 'new-password'}
            error={getVisibleFieldError('password')}
            showState={shouldShowFieldError('password')}
          />

          {isSignup && (
            <AuthField
              id="confirmPassword"
              label="Confirmar senha"
              type="password"
              value={confirmPassword}
              onChange={handleInputChange('confirmPassword')}
              onBlur={handleBlur('confirmPassword')}
              disabled={loading}
              autoComplete="new-password"
              error={getVisibleFieldError('confirmPassword')}
              showState={shouldShowFieldError('confirmPassword')}
            />
          )}

          {error && <p className={styles.error} role="alert" aria-live="assertive">{error}</p>}

          <button
            type="submit"
            className={styles.button}
            disabled={loading}
            aria-busy={loading}
          >
            {loading ? loadingLabel : submitLabel}
          </button>
        </form>

        <button
          onClick={handleModeSwitch}
          className={styles.switchButton}
          disabled={loading}
        >
          {switchLabel}
        </button>
      </div>
    </div>
  );
}
