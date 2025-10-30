import React from 'react';
import { useTranslation } from 'react-i18next';

export const Footer: React.FC = () => {
  const { t } = useTranslation();

  return (
    <footer className="bg-gray-50 border-t">
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <p className="text-gray-500 text-sm">{t('footer.disclaimer')}</p>
          <p className="mt-4 text-gray-400 text-sm">{t('footer.copyright')}</p>
        </div>
      </div>
    </footer>
  );
};
