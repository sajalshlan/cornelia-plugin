import React from 'react';
import { AuthProvider } from '../contexts/AuthContext';
import { useAuth } from '../contexts/AuthContext';
import Login from './Login';
import App from './App';
import { Spin } from 'antd';

const RootContent = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spin size="large" />
      </div>
    );
  }

  return user ? <App /> : <Login />;
};

const Root = () => {
  return (
    <AuthProvider>
      <RootContent />
    </AuthProvider>
  );
};

export default Root; 