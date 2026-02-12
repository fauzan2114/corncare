import React, { useContext, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AuthContext } from '../contexts/AuthContext';

export const Navbar: React.FC = () => {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useContext(AuthContext);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showLogoutNotification, setShowLogoutNotification] = useState(false);

  const toggleLanguage = () => {
    i18n.changeLanguage(i18n.language === 'en' ? 'hi' : 'en');
  };

  const handleLogout = () => {
    logout();
    setShowLogoutNotification(true);
    
    // Hide notification after 3 seconds
    setTimeout(() => {
      setShowLogoutNotification(false);
    }, 3000);
    
    // Redirect to login page
    navigate('/login');
  };

  const isActive = (path: string) => location.pathname === path;
  
  // Show navbar logout on all pages when user is logged in
  const showNavbarLogout = true;

  return (
    <>
      {/* Logout Success Notification Toast */}
      {showLogoutNotification && (
        <div className="fixed top-20 right-4 z-[60] animate-slide-in-right">
          <div className="bg-white border-l-4 border-green-500 rounded-xl shadow-2xl p-4 flex items-center space-x-3 min-w-[300px]">
            <div className="flex-shrink-0">
              <div className="h-10 w-10 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-900">Logged out successfully!</p>
              <p className="text-xs text-gray-500 mt-1">You have been signed out</p>
            </div>
            <button 
              onClick={() => setShowLogoutNotification(false)}
              className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      <nav className="bg-white/95 backdrop-blur-xl shadow-xl border-b border-gray-200/50 sticky top-0 z-50 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo Section */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center group">
              {/* Animated Logo */}
              <div className="relative h-11 w-11 bg-gradient-to-br from-green-500 via-emerald-500 to-blue-500 rounded-xl flex items-center justify-center mr-3 shadow-lg group-hover:shadow-2xl group-hover:scale-110 transition-all duration-300 animate-gradient">
                <span className="text-2xl animate-bounce-subtle">🌽</span>
                <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-green-400/20 to-blue-400/20 blur-xl group-hover:blur-2xl transition-all duration-300"></div>
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent group-hover:from-green-700 group-hover:to-blue-700 transition-all duration-300">
                CornCare
              </span>
            </Link>
            
            {/* Desktop Navigation */}
            <div className="hidden lg:ml-8 lg:flex lg:space-x-1">
              <Link
                to="/"
                className={`inline-flex items-center px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 transform hover:scale-105 ${
                  isActive('/') 
                    ? 'bg-gradient-to-r from-green-500 via-emerald-500 to-blue-500 text-white shadow-lg shadow-green-500/50'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100'
                }`}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                {t('nav.home')}
              </Link>
              <Link
                to="/detect"
                className={`inline-flex items-center px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 transform hover:scale-105 ${
                  isActive('/detect')
                    ? 'bg-gradient-to-r from-green-500 via-emerald-500 to-blue-500 text-white shadow-lg shadow-green-500/50'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100'
                }`}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                {t('nav.detect')}
              </Link>
              {user && (
                <>
                  <Link
                    to="/dashboard"
                    className={`inline-flex items-center px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 transform hover:scale-105 ${
                      isActive('/dashboard')
                        ? 'bg-gradient-to-r from-green-500 via-emerald-500 to-blue-500 text-white shadow-lg shadow-green-500/50'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100'
                    }`}
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    {t('nav.dashboard')}
                  </Link>
                  <Link
                    to="/expert-consultation"
                    className={`inline-flex items-center px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 transform hover:scale-105 ${
                      isActive('/expert-consultation')
                        ? 'bg-gradient-to-r from-green-500 via-emerald-500 to-blue-500 text-white shadow-lg shadow-green-500/50'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100'
                    }`}
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    {t('nav.expert')}
                  </Link>
                </>
              )}
              <Link
                to="/about"
                className={`inline-flex items-center px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 transform hover:scale-105 ${
                  isActive('/about')
                    ? 'bg-gradient-to-r from-green-500 via-emerald-500 to-blue-500 text-white shadow-lg shadow-green-500/50'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100'
                }`}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {t('nav.about')}
              </Link>
            </div>
          </div>
          
          {/* Right Section */}
          <div className="flex items-center space-x-4">
            {/* Language Toggle */}
            <button
              onClick={toggleLanguage}
              className="hidden sm:flex items-center px-4 py-2 rounded-xl border-2 border-gray-200/50 bg-white/50 backdrop-blur-sm text-sm font-medium text-gray-700 hover:border-green-300 hover:bg-green-50/50 hover:text-green-700 hover:scale-105 transition-all duration-300 shadow-sm hover:shadow-md"
              aria-label="Toggle language"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
              </svg>
              <span className="font-semibold">
                {i18n.language === 'en' ? '🇮🇳 हिंदी' : '🇺🇸 English'}
              </span>
            </button>
            
            {user ? (
              <div className="hidden lg:flex items-center space-x-3">
                <div className="flex items-center space-x-3 bg-gradient-to-r from-green-50 to-blue-50 border border-green-200/50 rounded-xl px-4 py-2 shadow-sm hover:shadow-md transition-all duration-300">
                  <div className="h-9 w-9 bg-gradient-to-br from-green-500 via-emerald-500 to-blue-500 rounded-xl flex items-center justify-center shadow-lg">
                    <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <span className="text-sm font-semibold text-gray-800">
                    {user.name || user.username}
                  </span>
                </div>
                {showNavbarLogout && (
                  <button
                    onClick={handleLogout}
                    className="bg-gradient-to-r from-red-500 via-red-600 to-pink-500 hover:from-red-600 hover:via-red-700 hover:to-pink-600 text-white px-5 py-2 text-sm rounded-xl font-semibold shadow-lg shadow-red-500/50 hover:shadow-xl hover:shadow-red-600/50 transform hover:-translate-y-0.5 hover:scale-105 transition-all duration-300"
                  >
                    <span className="flex items-center">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      {t('nav.logout')}
                    </span>
                  </button>
                )}
              </div>
            ) : (
              <div className="hidden lg:flex items-center space-x-2">
                <Link
                  to="/login"
                  className="text-gray-600 hover:text-gray-900 px-4 py-2 text-sm font-medium rounded-lg hover:bg-gray-50 transition-all duration-200"
                >
                  {t('nav.login')}
                </Link>
                <Link
                  to="/register"
                  className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white px-4 py-2 text-sm rounded-lg font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
                >
                  {t('nav.register')}
                </Link>
                <div className="h-4 w-px bg-gray-300"></div>
                <Link
                  to="/expert-login"
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-4 py-2 text-sm font-medium rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
                >
                  👨‍⚕️ Expert Login
                </Link>
              </div>
            )}

            {/* Mobile menu button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden inline-flex items-center justify-center p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-all duration-200"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {isMobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="lg:hidden border-t border-gray-200 bg-white/95 backdrop-blur-lg">
            <div className="px-2 pt-2 pb-3 space-y-1">
              <Link
                to="/"
                className={`block px-3 py-2 rounded-lg text-base font-medium transition-all duration-200 ${
                  isActive('/') 
                    ? 'bg-gradient-to-r from-green-500 to-blue-500 text-white'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                🏠 {t('nav.home')}
              </Link>
              <Link
                to="/detect"
                className={`block px-3 py-2 rounded-lg text-base font-medium transition-all duration-200 ${
                  isActive('/detect')
                    ? 'bg-gradient-to-r from-green-500 to-blue-500 text-white'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                🔍 {t('nav.detect')}
              </Link>
              
              {user && (
                <>
                  <Link
                    to="/dashboard"
                    className={`block px-3 py-2 rounded-lg text-base font-medium transition-all duration-200 ${
                      isActive('/dashboard')
                        ? 'bg-gradient-to-r from-green-500 to-blue-500 text-white'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    📊 Dashboard
                  </Link>
                  <Link
                    to="/expert-consultation"
                    className={`block px-3 py-2 rounded-lg text-base font-medium transition-all duration-200 ${
                      isActive('/expert-consultation')
                        ? 'bg-gradient-to-r from-green-500 to-blue-500 text-white'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    �‍⚕️ Expert Consultation
                  </Link>
                </>
              )}
              
              <Link
                to="/about"
                className={`block px-3 py-2 rounded-lg text-base font-medium transition-all duration-200 ${
                  isActive('/about')
                    ? 'bg-gradient-to-r from-green-500 to-blue-500 text-white'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                ℹ️ {t('nav.about')}
              </Link>
              
              {user ? (
                <>
                  <div className="border-t border-gray-200 pt-3 mt-3">
                    <div className="flex items-center px-3 py-2">
                      <div className="h-8 w-8 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center mr-3">
                        <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      <span className="text-sm font-medium text-gray-700">
                        {user.name || user.username}
                      </span>
                    </div>
                    {showNavbarLogout && (
                      <button
                        onClick={() => {
                          handleLogout();
                          setIsMobileMenuOpen(false);
                        }}
                        className="w-full mt-2 bg-gradient-to-r from-red-500 to-pink-500 text-white px-3 py-2 rounded-lg text-base font-medium"
                      >
                        🚪 Logout
                      </button>
                    )}
                  </div>
                </>
              ) : (
                <div className="border-t border-gray-200 pt-3 mt-3 space-y-2">
                  <Link
                    to="/login"
                    className="block w-full text-center bg-gray-100 text-gray-900 px-3 py-2 rounded-lg text-base font-medium"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Login
                  </Link>
                  <Link
                    to="/register"
                    className="block w-full text-center bg-gradient-to-r from-green-600 to-blue-600 text-white px-3 py-2 rounded-lg text-base font-medium"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Register
                  </Link>
                  <Link
                    to="/expert-login"
                    className="block w-full text-center bg-gradient-to-r from-purple-600 to-pink-600 text-white px-3 py-2 rounded-lg text-base font-medium"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    👨‍⚕️ Expert Login
                  </Link>
                </div>
              )}
              
              {/* Mobile Language Toggle */}
              <div className="border-t border-gray-200 pt-3 mt-3">
                <button
                  onClick={toggleLanguage}
                  className="w-full flex items-center justify-center px-3 py-2 rounded-lg border-2 border-gray-200 text-base font-medium text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                  </svg>
                  {i18n.language === 'en' ? '🇮🇳 हिंदी' : '🇺🇸 English'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
    </>
  );
};
