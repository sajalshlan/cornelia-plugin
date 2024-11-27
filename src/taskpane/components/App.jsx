import React, { useState } from 'react';
import { Layout, Button, Space } from 'antd';
import { 
  FileSearchOutlined, 
  CommentOutlined, 
  MessageOutlined,
  ArrowLeftOutlined 
} from '@ant-design/icons';
import DocumentSummary from './DocumentSummary';
import CommentList from './CommentList';
import ChatWindow from './ChatWindow';
import '../styles/components.css';
import { logger } from '../../api';

const { Content } = Layout;

const App = () => {
  const [activeView, setActiveView] = useState(null);
  const [documentContent, setDocumentContent] = useState('');
  const [comments, setComments] = useState([]);

  const readDocument = async () => {
    try {
      await Word.run(async (context) => {
        const body = context.document.body;
        const docComments = context.document.body.getComments();
        
        body.load("text");
        docComments.load();
        await context.sync();
        setDocumentContent(body.text);
        
        const processedComments = docComments.items.map((comment, index) => ({
          id: comment.id || `comment-${index}`,
          content: comment.content || '',
          author: comment.authorName || 'Unknown Author',
          authorEmail: comment.authorEmail || '',
          resolved: comment.resolved || false,
          date: comment.created ? new Date(comment.created).toISOString() : new Date().toISOString(),

        }));
        
        setComments(processedComments);
      });
    } catch (error) {
      console.error("Error reading document:", error);
    }
  };

  const renderHeader = () => {
    if (activeView) {
      return (
        <div className="flex items-center mb-4 p-4 border-b">
          <Button 
            icon={<ArrowLeftOutlined />} 
            onClick={() => setActiveView(null)}
            className="mr-4"
          />
          <h2 className="m-0 text-lg">
            {activeView === 'summary' && 'Document Summary'}
            {activeView === 'comments' && 'Document Comments'}
            {activeView === 'chat' && 'Ask Cornelia'}
          </h2>
        </div>
      );
    }
    return null;
  };

  const renderContent = () => {
    switch (activeView) {
      case 'summary':
        return <DocumentSummary documentContent={documentContent} />;
      case 'comments':
        return <CommentList comments={comments} />;
      case 'chat':
        return <ChatWindow documentContent={documentContent} />;
      default:
        return (
          <div className="p-4">
            <Space direction="vertical" size="large" className="w-full">
              <Button
                type="primary"
                icon={<FileSearchOutlined />}
                onClick={() => {
                  readDocument();
                  setActiveView('summary');
                }}
                size="large"
                block
              >
                Get Summary
              </Button>
              <Button
                type="primary"
                icon={<CommentOutlined />}
                onClick={() => {
                  readDocument();
                  setActiveView('comments');
                }}
                size="large"
                block
              >
                View Comments
              </Button>
              <Button
                type="primary"
                icon={<MessageOutlined />}
                onClick={() => {
                  readDocument();
                  setActiveView('chat');
                }}
                size="large"
                block
              >
                Ask Cornelia
              </Button>
            </Space>
          </div>
        );
    }
  };

  return (
    <Layout className="min-h-screen">
      {renderHeader()}
      <Content>
        {renderContent()}
      </Content>
    </Layout>
  );
};

export default App;