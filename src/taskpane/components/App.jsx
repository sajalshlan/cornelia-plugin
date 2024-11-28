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
import { logger } from '../../api';
import '../styles/components.css';
import { performAnalysis } from '../../api';

const { Content } = Layout;

const App = () => {
  const [activeView, setActiveView] = useState(null);
  const [documentContent, setDocumentContent] = useState('');
  const [summary, setSummary] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [comments, setComments] = useState([]);
  
  // Add loading states
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryProgress, setSummaryProgress] = useState(0);
  const [summaryError, setSummaryError] = useState(null);

  // Add chat loading states
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState(null);

  const readDocument = async () => {
    try {
      await Word.run(async (context) => {
        const body = context.document.body;
        const docComments = context.document.body.getComments();
        
        body.load("text");
        docComments.load("items");
        await context.sync();
        
        setDocumentContent(body.text);
        
        // Load all properties for comments including replies
        docComments.items.forEach(comment => {
          comment.load(["id", "authorName", "text", "created", "replies"]);
        });
        await context.sync();

        const processedComments = docComments.items.map(comment => {
          // Get replies for each comment
          const replies = comment.replies ? comment.replies.items.map(reply => ({
            id: reply.id,
            content: reply.content || '',
            author: reply.authorName || 'Unknown Author',
            date: reply.created ? new Date(reply.created).toISOString() : new Date().toISOString(),
          })) : [];

          // logger.info('Processing comment with replies:', {
          //   commentId: comment.id,
          //   replyCount: replies.length
          // });

          return {
            id: comment.id,
            content: comment.content || '',
            author: comment.authorName || 'Unknown Author',
            authorEmail: comment.authorEmail || '',
            resolved: comment.resolved || false,
            date: comment.created ? new Date(comment.created).toISOString() : new Date().toISOString(),
            replies: replies
          };
        });
        
        setComments(processedComments);
      });
    } catch (error) {
      logger.error("Error reading document:", error);
    }
  };

  const handleGenerateSummary = async () => {
    if (!documentContent) {
      setSummaryError('Please read the document first');
      return;
    }

    try {
      setSummaryLoading(true);
      setSummaryError(null);
      
      const result = await performAnalysis(
        'shortSummary', 
        documentContent, 
        'document',
        (fileName, percent) => {
          setSummaryProgress(percent);
        }
      );
      
      if (result) {
        setSummary(result);
      } else {
        throw new Error('No result received from analysis');
      }

    } catch (error) {
      setSummaryError(error.message || 'Analysis failed');
    } finally {
      setSummaryLoading(false);
      setSummaryProgress(0);
    }
  };

  const handleChatSubmit = async (input) => {
    if (!input.trim() || chatLoading) return;

    const newMessage = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toLocaleTimeString()
    };

    setChatMessages(prev => [...prev, newMessage]);
    setChatLoading(true);
    setChatError(null);

    try {
      const result = await performAnalysis('ask', 
        `Document Content:\n${documentContent}\n\nQuestion: ${input}`, 
        'document'
      );

      if (result) {
        setChatMessages(prev => [...prev, {
          role: 'assistant',
          content: result,
          timestamp: new Date().toLocaleTimeString()
        }]);
      }
    } catch (error) {
      console.error('Chat error:', error);
      setChatError(error.message);
      setChatMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date().toLocaleTimeString(),
        isError: true
      }]);
    } finally {
      setChatLoading(false);
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
          <h2 className="m-0 text-lg font-medium">
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
        return (
          <DocumentSummary 
            documentContent={documentContent} 
            summary={summary}
            isLoading={summaryLoading}
            progress={summaryProgress}
            error={summaryError}
            onGenerateSummary={handleGenerateSummary}
          />
        );
      case 'comments':
        return <CommentList comments={comments} />;
      case 'chat':
        return (
          <ChatWindow 
            documentContent={documentContent} 
            messages={chatMessages}
            setMessages={setChatMessages}
            isLoading={chatLoading}
            error={chatError}
            onSubmit={handleChatSubmit}
          />
        );
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
    <Layout className="h-screen">
      {renderHeader()}
      <Content className="flex-1 overflow-auto">
        {renderContent()}
      </Content>
    </Layout>
  );
};

export default App;