import { Outlet, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthProvider';
import Navbar from './Navbar';
import Footer from '../landing/Footer';

const LandingLayout = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/app/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  if (isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col welcome-app bg-primary/5">
      <Navbar />
      <main className="flex-grow">
        <Outlet /> 
      </main>
      <Footer/>
    </div>
  );
};

export default LandingLayout;