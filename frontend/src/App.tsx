import React, { useContext } from 'react';
import { BrowserRouter } from 'react-router-dom';
import Routes from './routes';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { AuthProvider } from './contexts/AuthContext';
import { ExpertAuthProvider, ExpertAuthContext } from './contexts/ExpertAuthContext';
import './i18n';
import './styles/index.css';

const AppContent: React.FC = () => {
  const { isAuthenticated: isExpertAuthenticated } = useContext(ExpertAuthContext);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Only show main Navbar when expert is NOT logged in */}
      {!isExpertAuthenticated && <Navbar />}
      <main className="flex-grow">
        <Routes />
      </main>
      {/* Only show Footer when expert is NOT logged in */}
      {!isExpertAuthenticated && <Footer />}
    </div>
  );
};

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ExpertAuthProvider>
          <AppContent />
        </ExpertAuthProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
