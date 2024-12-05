import React from 'react';
import ReactDOM from 'react-dom';
import App from './components/App';
import './styles/tailwind.css';
import { ConfigProvider } from 'antd';
import { AuthProvider } from './contexts/AuthContext';

Office.onReady(() => {
  ReactDOM.render(
    <ConfigProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ConfigProvider>,
    document.getElementById('root')
  );
});