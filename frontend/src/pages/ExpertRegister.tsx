import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { expertRegister } from '../contexts/ExpertAuthContext';

const ExpertRegister: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    specialization: '',
    experience: 0,
    qualification: '',
    university: '',
    current_position: '',
    organization: '',
    bio: ''
  });
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!resumeFile) {
      setError('Please upload your resume');
      setLoading(false);
      return;
    }

    try {
      await expertRegister(formData, resumeFile);
      alert('Application submitted successfully! Please wait for admin review. You will receive login credentials via email once approved.');
      navigate('/expert-login');
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 py-12 px-4 sm:px-6 lg:px-8">
      {/* Background Pattern */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-green-200 rounded-full opacity-20 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-200 rounded-full opacity-20 animate-pulse" style={{animationDelay: '1s'}}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-60 h-60 bg-purple-200 rounded-full opacity-20 animate-pulse" style={{animationDelay: '2s'}}></div>
      </div>

      <div className="relative max-w-2xl mx-auto">
        {/* Main Card */}
        <div className="bg-white/80 backdrop-blur-lg shadow-2xl rounded-2xl p-8 border border-white/20">
          {/* Header */}
          <div className="text-center mb-8">
            {/* Logo */}
            <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-full bg-gradient-to-br from-green-500 to-emerald-600 mb-6 shadow-lg">
              <span className="text-3xl">🌽</span>
            </div>
            
            <h2 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
              🌾 Expert Registration
            </h2>
            <p className="mt-2 text-gray-600 font-medium">
              Join our agricultural expert panel to help farmers worldwide
            </p>
            <div className="mt-4 flex justify-center">
              <div className="flex space-x-2">
                <div className="h-2 w-2 bg-green-400 rounded-full animate-pulse"></div>
                <div className="h-2 w-2 bg-blue-400 rounded-full animate-pulse" style={{animationDelay: '0.5s'}}></div>
                <div className="h-2 w-2 bg-purple-400 rounded-full animate-pulse" style={{animationDelay: '1s'}}></div>
              </div>
            </div>
          </div>
          
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-r-lg animate-shake">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-700 font-medium">{error}</p>
                  </div>
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Personal Information Section */}
              <div className="md:col-span-2">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <span className="mr-2">👤</span>
                  Personal Information
                </h3>
              </div>

              {/* Full Name */}
              <div className="group">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  📝 Full Name *
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-500 focus:bg-white focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all duration-200 group-hover:border-gray-300"
                  placeholder="Dr. John Smith"
                />
              </div>

              {/* Email */}
              <div className="group">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  📧 Email Address *
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-500 focus:bg-white focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all duration-200 group-hover:border-gray-300"
                  placeholder="expert@example.com"
                />
              </div>

              {/* Phone */}
              <div className="group">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  📱 Phone Number *
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-500 focus:bg-white focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all duration-200 group-hover:border-gray-300"
                  placeholder="+1 234 567 8900"
                />
              </div>

              {/* Specialization */}
              <div className="group">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  🔬 Specialization *
                </label>
                <select
                  id="specialization"
                  name="specialization"
                  required
                  value={formData.specialization}
                  onChange={(e) => setFormData({...formData, specialization: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:bg-white focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all duration-200 group-hover:border-gray-300"
                >
                  <option value="">Select Specialization</option>
                  <option value="Plant Pathology">🦠 Plant Pathology</option>
                  <option value="Crop Disease Management">🌱 Crop Disease Management</option>
                  <option value="Agricultural Extension">🚜 Agricultural Extension</option>
                  <option value="Corn Disease Specialist">🌽 Corn Disease Specialist</option>
                  <option value="Integrated Pest Management">🐛 Integrated Pest Management</option>
                  <option value="Other">🔬 Other</option>
                </select>
              </div>

              {/* Professional Information Section */}
              <div className="md:col-span-2 mt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <span className="mr-2">🎓</span>
                  Professional Information
                </h3>
              </div>

              {/* Experience */}
              <div className="group">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  ⏰ Years of Experience *
                </label>
                <input
                  id="experience"
                  name="experience"
                  type="number"
                  required
                  min="0"
                  max="50"
                  value={formData.experience}
                  onChange={(e) => setFormData({...formData, experience: parseInt(e.target.value)})}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-500 focus:bg-white focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all duration-200 group-hover:border-gray-300"
                  placeholder="5"
                />
              </div>

              {/* Qualification */}
              <div className="group">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  🎯 Highest Qualification *
                </label>
                <input
                  id="qualification"
                  name="qualification"
                  type="text"
                  required
                  value={formData.qualification}
                  onChange={(e) => setFormData({...formData, qualification: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-500 focus:bg-white focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all duration-200 group-hover:border-gray-300"
                  placeholder="PhD in Plant Pathology"
                />
              </div>

              {/* University */}
              <div className="group">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  🏛️ University/Institution *
                </label>
                <input
                  id="university"
                  name="university"
                  type="text"
                  required
                  value={formData.university}
                  onChange={(e) => setFormData({...formData, university: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-500 focus:bg-white focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all duration-200 group-hover:border-gray-300"
                  placeholder="University of Agriculture"
                />
              </div>

              {/* Current Position */}
              <div className="group">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  💼 Current Position *
                </label>
                <input
                  id="current_position"
                  name="current_position"
                  type="text"
                  required
                  value={formData.current_position}
                  onChange={(e) => setFormData({...formData, current_position: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-500 focus:bg-white focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all duration-200 group-hover:border-gray-300"
                  placeholder="Senior Plant Pathologist"
                />
              </div>

              {/* Organization */}
              <div className="md:col-span-2 group">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  🏢 Current Organization *
                </label>
                <input
                  id="organization"
                  name="organization"
                  type="text"
                  required
                  value={formData.organization}
                  onChange={(e) => setFormData({...formData, organization: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-500 focus:bg-white focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all duration-200 group-hover:border-gray-300"
                  placeholder="Agricultural Research Institute"
                />
              </div>

              {/* Bio */}
              <div className="md:col-span-2 group">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  📝 Professional Bio *
                </label>
                <textarea
                  id="bio"
                  name="bio"
                  required
                  rows={4}
                  value={formData.bio}
                  onChange={(e) => setFormData({...formData, bio: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-500 focus:bg-white focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all duration-200 group-hover:border-gray-300 resize-none"
                  placeholder="Brief description of your expertise, research interests, and professional achievements..."
                />
              </div>

              {/* Resume Upload */}
              <div className="md:col-span-2 group">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  📄 Resume/CV * (PDF, DOC, or DOCX)
                </label>
                <div className="relative">
                  <input
                    type="file"
                    id="resume"
                    accept=".pdf,.doc,.docx"
                    onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-green-100 file:text-green-700 hover:file:bg-green-200 focus:bg-white focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all duration-200"
                    required
                  />
                  {resumeFile && (
                    <div className="mt-2 flex items-center text-sm text-green-600 bg-green-50 px-3 py-2 rounded-lg">
                      <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      ✓ {resumeFile.name}
                    </div>
                  )}
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  Upload your detailed resume or CV highlighting your agricultural expertise and achievements.
                </p>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white font-semibold py-4 px-6 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none relative overflow-hidden"
            >
              {loading && (
                <div className="absolute inset-0 bg-white/20 flex items-center justify-center">
                  <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
              )}
              <span className={loading ? 'opacity-0' : ''}>
                {loading ? 'Submitting Application...' : '🚀 Submit Expert Application'}
              </span>
            </button>
          </form>

          {/* Footer Links */}
          <div className="mt-8 space-y-4">
            <div className="text-center">
              <span className="text-sm text-gray-600">
                Already have an account?{' '}
                <Link 
                  to="/expert-login" 
                  className="font-semibold text-green-600 hover:text-green-700 transition-colors duration-200"
                >
                  Sign in
                </Link>
              </span>
            </div>

            <div className="text-center pt-4 border-t border-gray-100">
              <Link 
                to="/" 
                className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 transition-colors duration-200"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to main site
              </Link>
            </div>
          </div>
        </div>

        {/* Trust Indicators */}
        <div className="mt-6 text-center text-xs text-gray-500">
          <p>🔐 Secure Application • 👨‍⚕️ Expert Review Process • 🌾 Agricultural Excellence</p>
        </div>
      </div>
    </div>
  );
};

export default ExpertRegister;