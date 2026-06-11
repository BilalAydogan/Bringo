import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import LanguageSwitcher from './LanguageSwitcher';

const changeLanguage = vi.fn();

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => (key === 'common.language' ? 'Language' : key),
    i18n: {
      language: 'en',
      resolvedLanguage: 'en',
      changeLanguage,
    },
  }),
}));

describe('LanguageSwitcher', () => {
  beforeEach(() => {
    changeLanguage.mockReset();
  });

  it('renders both language options and switches language', () => {
    render(<LanguageSwitcher />);

    const englishButton = screen.getByRole('button', { name: 'Language: EN' });
    const turkishButton = screen.getByRole('button', { name: 'Language: TR' });

    expect(englishButton).toBeInTheDocument();
    expect(turkishButton).toBeInTheDocument();

    fireEvent.click(turkishButton);

    expect(changeLanguage).toHaveBeenCalledWith('tr');
  });
});
