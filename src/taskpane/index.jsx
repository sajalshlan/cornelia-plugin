import React from 'react';
import ReactDOM from 'react-dom';
import App from './components/App';
import './styles/tailwind.css';
import { ConfigProvider } from 'antd';

Office.onReady(() => {
  ReactDOM.render(
    <ConfigProvider>
      <App />
    </ConfigProvider>,
    document.getElementById('root')
  );
});