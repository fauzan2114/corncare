import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

const Home: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen relative">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0 z-0">
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: "url('https://images.unsplash.com/photo-1625246333195-78d9c38ad449?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80')",
          }}
        >
          {/* Lighter Gradient Overlay for better visibility */}
          <div className="absolute inset-0 bg-gradient-to-br from-green-600/40 via-blue-600/30 to-purple-600/40"></div>
          {/* Additional light overlay */}
          <div className="absolute inset-0 bg-white/20"></div>
        </div>
      </div>

      {/* Animated Pattern Overlay */}
      <div className="absolute inset-0 z-10 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-green-400 rounded-full opacity-10 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-400 rounded-full opacity-10 animate-pulse" style={{animationDelay: '1s'}}></div>
        <div className="absolute top-1/2 right-1/4 w-60 h-60 bg-purple-400 rounded-full opacity-10 animate-pulse" style={{animationDelay: '2s'}}></div>
        <div className="absolute top-20 left-1/4 w-40 h-40 bg-yellow-400 rounded-full opacity-10 animate-bounce" style={{animationDelay: '0.5s'}}></div>
        <div className="absolute bottom-20 right-1/3 w-32 h-32 bg-pink-400 rounded-full opacity-10 animate-ping"></div>
      </div>

      <div className="relative z-20 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <div className="text-center mb-20 animate-fade-in">
          {/* Logo/Icon */}
          <div className="flex justify-center mb-8">
            <div className="h-20 w-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center shadow-2xl animate-bounce hover:scale-110 transition-transform duration-300 cursor-pointer">
              <span className="text-4xl">🌽</span>
            </div>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-white mb-6 drop-shadow-2xl animate-slide-up">
            {t('home.hero.title')}
          </h1>
          
          <p className="mt-6 text-xl leading-8 text-white max-w-3xl mx-auto font-medium drop-shadow-lg animate-slide-up" style={{animationDelay: '0.2s'}}>
            {t('home.hero.subtitle')}
          </p>
          
          <div className="mt-10 flex justify-center animate-slide-up" style={{animationDelay: '0.4s'}}>
            <Link 
              to="/detect" 
              className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white px-8 py-4 rounded-2xl shadow-xl hover:shadow-2xl transform hover:-translate-y-1 hover:scale-105 transition-all duration-300 text-lg font-semibold flex items-center group"
            >
              <svg className="w-6 h-6 mr-3 group-hover:rotate-12 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              🚀 {t('home.hero.cta')}
            </Link>
          </div>

          {/* Trust Indicators */}
          <div className="mt-12 flex justify-center items-center space-x-8 text-sm text-white animate-slide-up" style={{animationDelay: '0.6s'}}>
            <div className="flex items-center bg-green-500/80 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg border border-white/30 hover:scale-110 hover:bg-green-500/90 transition-all duration-300 cursor-pointer">
              <div className="h-2 w-2 bg-white rounded-full mr-2 animate-pulse"></div>
              <span className="font-semibold">{t('home.features.aiPowered')}</span>
            </div>
            <div className="flex items-center bg-blue-500/80 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg border border-white/30 hover:scale-110 hover:bg-blue-500/90 transition-all duration-300 cursor-pointer">
              <div className="h-2 w-2 bg-white rounded-full mr-2 animate-pulse" style={{animationDelay: '0.5s'}}></div>
              <span className="font-semibold">{t('home.features.expertVerified')}</span>
            </div>
            <div className="flex items-center bg-purple-500/80 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg border border-white/30 hover:scale-110 hover:bg-purple-500/90 transition-all duration-300 cursor-pointer">
              <div className="h-2 w-2 bg-white rounded-full mr-2 animate-pulse" style={{animationDelay: '1s'}}></div>
              <span className="font-semibold">{t('home.features.instantResults')}</span>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="mb-20">
          <div className="text-center mb-12 animate-fade-in">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 drop-shadow-lg">
              {t('home.features.title')}
            </h2>
            <p className="text-white/80 text-lg max-w-2xl mx-auto drop-shadow-md">
              {t('home.features.subtitle')}
            </p>
          </div>
          
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            <div className="bg-white/95 backdrop-blur-lg p-8 rounded-2xl shadow-2xl border border-white/30 hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 group animate-slide-up" style={{animationDelay: '0.1s'}}>
              <div className="text-5xl mb-6 group-hover:scale-110 group-hover:rotate-12 transition-transform duration-300">🌾</div>
              <h3 className="text-xl font-bold mb-4 text-gray-900">{t('home.features.lightningFast.title')}</h3>
              <p className="text-gray-600 leading-relaxed">
                {t('home.features.lightningFast.description')}
              </p>
              <div className="mt-4 h-1 bg-gradient-to-r from-green-400 to-blue-400 rounded-full transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
            </div>
            
            <div className="bg-white/95 backdrop-blur-lg p-8 rounded-2xl shadow-2xl border border-white/30 hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 group animate-slide-up" style={{animationDelay: '0.2s'}}>
              <div className="text-5xl mb-6 group-hover:scale-110 group-hover:rotate-12 transition-transform duration-300">🔍</div>
              <h3 className="text-xl font-bold mb-4 text-gray-900">{t('home.features.aiAnalysis.title')}</h3>
              <p className="text-gray-600 leading-relaxed">
                {t('home.features.aiAnalysis.description')}
              </p>
              <div className="mt-4 h-1 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
            </div>
            
            <div className="bg-white/95 backdrop-blur-lg p-8 rounded-2xl shadow-2xl border border-white/30 hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 group animate-slide-up" style={{animationDelay: '0.3s'}}>
              <div className="text-5xl mb-6 group-hover:scale-110 group-hover:rotate-12 transition-transform duration-300">💡</div>
              <h3 className="text-xl font-bold mb-4 text-gray-900">{t('home.features.expertRecommendations.title')}</h3>
              <p className="text-gray-600 leading-relaxed">
                {t('home.features.expertRecommendations.description')}
              </p>
              <div className="mt-4 h-1 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
            </div>
          </div>
        </div>

        {/* Expert Section */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-8 md:p-12 rounded-3xl shadow-2xl text-white relative overflow-hidden animate-fade-in hover:scale-[1.02] transition-transform duration-500">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full -translate-y-16 translate-x-16 animate-pulse"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white rounded-full translate-y-12 -translate-x-12 animate-pulse" style={{animationDelay: '1s'}}></div>
          </div>
          
          <div className="relative text-center">
            <div className="flex justify-center mb-6">
              <div className="h-16 w-16 bg-white/20 rounded-full flex items-center justify-center hover:rotate-12 hover:scale-110 transition-all duration-300 cursor-pointer">
                <svg className="h-10 w-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
            </div>
            
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              🎓 Are you an Agricultural Expert?
            </h2>
            <p className="text-blue-100 mb-8 text-lg max-w-2xl mx-auto">
              Join our prestigious expert panel to help farmers with professional consultation and share your agricultural expertise with the global farming community.
            </p>
            
            <div className="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-6">
              <Link 
                to="/expert-register" 
                className="bg-white text-blue-600 px-8 py-4 rounded-xl hover:bg-gray-100 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-1 hover:scale-105 transition-all duration-300 flex items-center justify-center group"
              >
                <svg className="w-5 h-5 mr-2 group-hover:rotate-90 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                📝 Register as Expert
              </Link>
              <Link 
                to="/expert-login" 
                className="border-2 border-white text-white px-8 py-4 rounded-xl hover:bg-white hover:text-blue-600 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-1 hover:scale-105 transition-all duration-300 flex items-center justify-center group"
              >
                <svg className="w-5 h-5 mr-2 group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
                🔐 Expert Login
              </Link>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="mt-20 text-center">
          <div className="bg-white/95 backdrop-blur-lg rounded-3xl p-8 shadow-2xl border border-white/30 animate-fade-in hover:scale-[1.02] transition-transform duration-500">
            <h2 className="text-3xl font-bold text-gray-900 mb-4 animate-slide-up">
              🌾 Ready to Protect Your Crops?
            </h2>
            <p className="text-gray-600 text-lg mb-8 max-w-2xl mx-auto animate-slide-up" style={{animationDelay: '0.1s'}}>
              Join thousands of farmers who trust CornCare for early disease detection and expert agricultural guidance.
            </p>
            <div className="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-6 animate-slide-up" style={{animationDelay: '0.2s'}}>
              <Link 
                to="/detect" 
                className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white px-8 py-4 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 hover:scale-105 transition-all duration-300 font-semibold flex items-center justify-center group"
              >
                <svg className="w-5 h-5 mr-2 group-hover:rotate-12 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                🔍 Start Detection
              </Link>
              <Link 
                to="/about" 
                className="border-2 border-gray-300 text-gray-700 px-8 py-4 rounded-xl hover:border-gray-400 hover:bg-gray-50 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-1 hover:scale-105 transition-all duration-300 flex items-center justify-center group"
              >
                <svg className="w-5 h-5 mr-2 group-hover:rotate-12 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                📖 Learn More
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
