import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const About: React.FC = () => {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50">
      {/* Background Pattern */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-green-200 rounded-full opacity-20 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-200 rounded-full opacity-20 animate-pulse" style={{animationDelay: '1s'}}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-60 h-60 bg-purple-200 rounded-full opacity-20 animate-pulse" style={{animationDelay: '2s'}}></div>
      </div>

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="flex justify-center mb-8">
            <div className="h-20 w-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center shadow-2xl">
              <span className="text-4xl">🌽</span>
            </div>
          </div>
          
          <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent mb-6">
            {t('about.title')}
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            {t('about.subtitle')}
          </p>
        </div>

        {/* Mission Section */}
        <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-xl border border-white/20 p-8 md:p-12 mb-12">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">{t('about.mission.title')}</h2>
          </div>
          <p className="text-lg text-gray-700 leading-relaxed text-center max-w-4xl mx-auto">
            {t('about.mission.description')}
          </p>
        </div>

        {/* How It Works Section */}
        <div className="mb-12">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">{t('about.howItWorks.title')}</h2>
            <p className="text-gray-600 text-lg">{t('about.howItWorks.subtitle')}</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 p-8 text-center hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
              <div className="h-16 w-16 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">{t('about.howItWorks.steps.capture.title')}</h3>
              <p className="text-gray-600">{t('about.howItWorks.steps.capture.description')}</p>
            </div>

            <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 p-8 text-center hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
              <div className="h-16 w-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">{t('about.howItWorks.steps.analyze.title')}</h3>
              <p className="text-gray-600">{t('about.howItWorks.steps.analyze.description')}</p>
            </div>

            <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 p-8 text-center hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
              <div className="h-16 w-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">{t('about.howItWorks.steps.treat.title')}</h3>
              <p className="text-gray-600">{t('about.howItWorks.steps.treat.description')}</p>
            </div>
          </div>
        </div>

        {/* Supported Diseases Section */}
        <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-xl border border-white/20 p-8 md:p-12 mb-12">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">{t('about.diseases.title')}</h2>
            <p className="text-gray-600 text-lg">{t('about.diseases.subtitle')}</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-center p-4 bg-red-50 rounded-xl border-l-4 border-red-400">
              <div className="h-12 w-12 bg-red-100 rounded-full flex items-center justify-center mr-4">
                <span className="text-2xl">🦠</span>
              </div>
              <div>
                <h4 className="font-bold text-red-800">{t('about.diseases.blight.name')}</h4>
                <p className="text-sm text-red-600">{t('about.diseases.blight.description')}</p>
              </div>
            </div>

            <div className="flex items-center p-4 bg-orange-50 rounded-xl border-l-4 border-orange-400">
              <div className="h-12 w-12 bg-orange-100 rounded-full flex items-center justify-center mr-4">
                <span className="text-2xl">🔶</span>
              </div>
              <div>
                <h4 className="font-bold text-orange-800">{t('about.diseases.rust.name')}</h4>
                <p className="text-sm text-orange-600">{t('about.diseases.rust.description')}</p>
              </div>
            </div>

            <div className="flex items-center p-4 bg-gray-50 rounded-xl border-l-4 border-gray-400">
              <div className="h-12 w-12 bg-gray-100 rounded-full flex items-center justify-center mr-4">
                <span className="text-2xl">◼️</span>
              </div>
              <div>
                <h4 className="font-bold text-gray-800">{t('about.diseases.graySpot.name')}</h4>
                <p className="text-sm text-gray-600">{t('about.diseases.graySpot.description')}</p>
              </div>
            </div>

            <div className="flex items-center p-4 bg-green-50 rounded-xl border-l-4 border-green-400">
              <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center mr-4">
                <span className="text-2xl">✅</span>
              </div>
              <div>
                <h4 className="font-bold text-green-800">{t('about.diseases.healthy.name')}</h4>
                <p className="text-sm text-green-600">{t('about.diseases.healthy.description')}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Technology Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 p-8">
            <div className="flex items-center mb-6">
              <div className="h-12 w-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mr-4">
                <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900">🧠 AI Technology</h3>
            </div>
            <p className="text-gray-700 leading-relaxed mb-4">
              Our deep learning model is trained on the comprehensive PlantVillage dataset, containing thousands of 
              labeled images of corn plant diseases. We use advanced computer vision techniques optimized specifically 
              for plant disease detection.
            </p>
            <div className="flex items-center text-sm text-gray-600">
              <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span>95%+ Accuracy Rate</span>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 p-8">
            <div className="flex items-center mb-6">
              <div className="h-12 w-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mr-4">
                <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900">👨‍⚕️ Expert Network</h3>
            </div>
            <p className="text-gray-700 leading-relaxed mb-4">
              Connect with certified agricultural experts and plant pathologists for personalized advice. Our expert 
              panel includes professionals with decades of experience in crop disease management and sustainable farming practices.
            </p>
            <div className="flex items-center text-sm text-gray-600">
              <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>24/7 Expert Support Available</span>
            </div>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="bg-gradient-to-r from-yellow-400 to-orange-400 rounded-2xl p-8 mb-12 shadow-xl">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div className="ml-4">
              <h3 className="text-xl font-bold text-white mb-2">⚠️ Important Disclaimer</h3>
              <p className="text-white">
                CornCare is designed to assist in disease identification and provide general guidance. While our AI is highly accurate, 
                it should not replace professional agricultural advice. For critical crop decisions, we recommend consulting with 
                certified agricultural experts or extension services in your area.
              </p>
            </div>
          </div>
        </div>

        {/* Contact Section */}
        <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-xl border border-white/20 p-8 md:p-12 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">📞 Get In Touch</h2>
          <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
            Have questions, feedback, or need support? We're here to help you succeed in your agricultural journey.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex flex-col items-center p-6 bg-green-50 rounded-xl">
              <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h4 className="font-bold text-green-800 mb-2">Email Support</h4>
              <a href="mailto:support@corncare.com" className="text-green-600 hover:text-green-700 font-semibold">
                support@corncare.com
              </a>
            </div>

            <div className="flex flex-col items-center p-6 bg-blue-50 rounded-xl">
              <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h4 className="font-bold text-blue-800 mb-2">Expert Chat</h4>
              <Link to="/expert-consultation" className="text-blue-600 hover:text-blue-700 font-semibold">
                Chat with Experts
              </Link>
            </div>

            <div className="flex flex-col items-center p-6 bg-purple-50 rounded-xl">
              <div className="h-12 w-12 bg-purple-100 rounded-full flex items-center justify-center mb-4">
                <svg className="h-6 w-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h4 className="font-bold text-purple-800 mb-2">Help Center</h4>
              <span className="text-purple-600 font-semibold">Coming Soon</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default About;
