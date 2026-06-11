import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Login from './Login';

const mockPost = vi.fn();
const mockLogin = vi.fn();
const mockNavigate = vi.fn();

vi.mock('../api/axios', () => ({
  default: {
    post: (...args: unknown[]) => mockPost(...args),
  },
}));

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    login: mockLogin,
  }),
}));

vi.mock('jwt-decode', () => ({
  jwtDecode: () => ({ roles: ['ROLE_USER'] }),
}));

vi.mock('../components/LanguageSwitcher', () => ({
  default: () => <div data-testid="language-switcher" />,
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) =>
      ({
        'auth.loginTitle': 'Sign in',
        'auth.loginSubtitle': 'Access your account',
        'auth.loginAdminTitle': 'Admin sign in',
        'auth.loginAdminSubtitle': 'Access admin tools',
        'auth.emailPlaceholder': 'Email address',
        'auth.passwordPlaceholder': 'Password',
        'auth.continue': 'Continue',
        'auth.loggingIn': 'Signing in',
        'auth.noAccount': 'No account?',
        'auth.registerNow': 'Register',
        'auth.loginError': 'Login failed',
        'auth.invalidOtp': 'Enter a valid code',
        'auth.otpExpired': 'Code expired',
        'auth.resendFailed': 'Resend failed',
        'auth.otpTitle': 'Verification code',
        'auth.otpSubtitle': 'We sent a 6-digit code to your email address',
        'auth.verifyAndLogin': 'Verify and sign in',
        'auth.resendCode': 'Resend code',
        'common.back': 'Back',
      })[key] ?? key,
  }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');

  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({ pathname: '/login' }),
  };
});

describe('Login page', () => {
  beforeEach(() => {
    mockPost.mockReset();
    mockLogin.mockReset();
    mockNavigate.mockReset();
  });

  it('shows backend login errors without clearing the form', async () => {
    mockPost.mockRejectedValueOnce({
      response: {
        data: {
          message: 'Invalid credentials',
        },
      },
    });

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByPlaceholderText('Email address'), {
      target: { value: 'user@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('Password'), {
      target: { value: 'wrong-password' },
    });
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));

    await waitFor(() => {
      expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
    });

    expect(screen.getByPlaceholderText('Email address')).toHaveValue('user@example.com');
    expect(screen.getByPlaceholderText('Password')).toHaveValue('wrong-password');
  });

  it('moves to otp step after successful login request', async () => {
    mockPost.mockResolvedValueOnce({
      data: {
        requires_2fa: true,
      },
    });

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByPlaceholderText('Email address'), {
      target: { value: 'user@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('Password'), {
      target: { value: 'correct-password' },
    });
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));

    await waitFor(() => {
      expect(screen.getByText('Verification code')).toBeInTheDocument();
    });

    expect(screen.getAllByRole('textbox')).toHaveLength(6);
  });
});
