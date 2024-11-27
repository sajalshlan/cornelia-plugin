import React from 'react';
import { Layout, Typography } from 'antd';
import DocumentReader from './DocumentReader';
import DebugPanel from './DebugPanel';
import '../styles/components.css';

const { Content } = Layout;
const { Title } = Typography;

const App = () => {
  return (
    <Layout className="min-h-screen">
      <Content className="p-4">
        <Title level={3}>Document Analysis</Title>
        <DocumentReader />
        {process.env.NODE_ENV === 'development' && <DebugPanel />}
      </Content>
    </Layout>
  );
};

export default App;