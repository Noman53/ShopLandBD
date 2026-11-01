import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import ForgotPasswordPage from '@/pages/ForgotPasswordPage';
import ResetPasswordPage from '@/pages/ResetPasswordPage';

const mocks = vi.hoisted(() => ({
  resetPassword: vi.fn(),
  getSession: vi.fn(),
  updateUser: vi.fn(),
  onAuthStateChange: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ resetPassword: mocks.resetPassword }),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (_bengali: string, english: string) => english }),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: mocks.getSession,
      updateUser: mocks.updateUser,
      onAuthStateChange: mocks.onAuthStateChange,
    },
  },
}));

vi.mock('sonner', () => ({
  toast: {
    error: mocks.toastError,
  },
}));

function renderWithRouter(component: ReactNode) {
  return render(<MemoryRouter>{component}</MemoryRouter>);
}

describe('password recovery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    });
  });

  it('sends an email recovery link without exposing account existence', async () => {
    mocks.resetPassword.mockResolvedValue({ error: null });
    renderWithRouter(<ForgotPasswordPage />);

    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'customer@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send recovery link' }));

    expect(await screen.findByText(/If an account exists for this address/)).toBeTruthy();
    expect(mocks.resetPassword).toHaveBeenCalledWith('customer@example.com');
  });

  it('updates the password only when an auth recovery session exists', async () => {
    mocks.getSession.mockResolvedValue({
      data: { session: { user: { id: 'customer-id' } } },
      error: null,
    });
    mocks.updateUser.mockResolvedValue({ error: null });
    renderWithRouter(<ResetPasswordPage />);

    await screen.findByLabelText('New password');
    fireEvent.change(screen.getByLabelText('New password'), {
      target: { value: 'secure-password' },
    });
    fireEvent.change(screen.getByLabelText('Confirm password'), {
      target: { value: 'secure-password' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Update password' }));

    await waitFor(() => expect(mocks.updateUser).toHaveBeenCalledWith({
      password: 'secure-password',
    }));
    expect(await screen.findByText(/Your password has changed/)).toBeTruthy();
  });
});
