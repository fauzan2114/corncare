import React from 'react';
import { Link } from 'react-router-dom';

const NotFound: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 flex items-center justify-center px-4 sm:px-6 lg:px-8">
      {/* Background Pattern */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-green-200 rounded-full opacity-20 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-200 rounded-full opacity-20 animate-pulse" style={{animationDelay: '1s'}}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-60 h-60 bg-purple-200 rounded-full opacity-20 animate-pulse" style={{animationDelay: '2s'}}></div>
      </div>

      <div className="relative text-center">
        {/* 404 Card */}
        <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-2xl border border-white/20 p-12 md:p-16">
          {/* Corn Icon */}
          <div className="flex justify-center mb-8">
            <div className="h-24 w-24 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center shadow-xl animate-bounce">
              <span className="text-5xl">🌽</span>
            </div>
          </div>

          {/* 404 Text */}
          <h1 className="text-8xl md:text-9xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent mb-6">
            404
          </h1>
          
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
            Oops! Page Not Found
          </h2>
          
          <p className="text-lg text-gray-600 mb-8 max-w-md mx-auto">
            The page you're looking for seems to have wandered off into the cornfield. Let's get you back on track!
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              to="/" 
              className="bg-gradient-to-r from-green-600 to-emerald-600 text-white py-3 px-8 rounded-xl font-semibold hover:from-green-700 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transform hover:-translate-y-0.5 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              🏠 Go Back Home
            </Link>
            
            <Link 
              to="/detect" 
              className="bg-white/50 backdrop-blur-sm text-gray-700 py-3 px-8 rounded-xl font-semibold border border-gray-200 hover:bg-white/70 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2 transform hover:-translate-y-0.5 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              🔍 Detect Disease
            </Link>
          </div>
        </div>

        {/* Additional Help */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            Lost? Try using our <Link to="/about" className="text-green-600 hover:text-green-700 font-semibold">About page</Link> to learn more about CornCare
          </p>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
