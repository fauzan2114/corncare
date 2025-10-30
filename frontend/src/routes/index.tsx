import { Routes, Route } from 'react-router-dom';
import Home from '../pages/Home';
import Detect from '../pages/Detect';
import About from '../pages/About';
import Login from '../pages/Login';
import Register from '../pages/Register';
import Dashboard from '../pages/Dashboard';
import ExpertConsultation from '../pages/ExpertConsultation';
import ExpertLogin from '../pages/ExpertLogin';
import ExpertRegister from '../pages/ExpertRegister';
import ExpertDashboard from '../pages/ExpertDashboard';
import NotFound from '../pages/NotFound';
import ProtectedRoute from '../components/ProtectedRoute';
import ExpertProtectedRoute from '../components/ExpertProtectedRoute';

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/detect" element={<Detect />} />
      <Route path="/about" element={<About />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      } />
      <Route path="/expert-consultation" element={
        <ProtectedRoute>
          <ExpertConsultation />
        </ProtectedRoute>
      } />
      
      {/* Expert Routes */}
      <Route path="/expert-login" element={<ExpertLogin />} />
      <Route path="/expert-register" element={<ExpertRegister />} />
      <Route path="/expert-dashboard" element={
        <ExpertProtectedRoute>
          <ExpertDashboard />
        </ExpertProtectedRoute>
      } />
      
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default AppRoutes;
