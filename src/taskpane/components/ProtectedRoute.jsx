import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import Login from './Login';
import { Spin } from 'antd';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <Spin size="large" className="flex justify-center items-center h-screen" />;
  }

  return user ? children : <Login />;
};

export default ProtectedRoute; 