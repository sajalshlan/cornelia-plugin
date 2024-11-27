import React, { useState } from 'react';
import { Layout, Button, Alert, Spin, Tabs } from 'antd';
import { 
  FileTextOutlined, 
  CommentOutlined,
  FileSearchOutlined,
} from '@ant-design/icons';
import CommentList from './CommentList';
import DocumentContent from './DocumentContent';
import DocumentSummary from './DocumentSummary';
import { logger } from '../../api';
const { Content } = Layout;
const { TabPane } = Tabs;

const DocumentReader = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [documentContent, setDocumentContent] = useState('');
  const [comments, setComments] = useState([]);
  const [error, setError] = useState(null);

  const checkOfficeVersion = () => {
    if (Office && Office.context) {
      logger.info('Office API Version:', {
        version: Office.context.diagnostics.version,
        platform: Office.context.diagnostics.platform
      });
    }
  };

  const readDocument = async () => {
    setIsLoading(true);
    checkOfficeVersion();
    try {
        await Word.run(async (context) => {
            // Load the document body text
            const docComments = context.document.body.getComments(); // Correctly access all comments
            docComments.load();
            await context.sync();
            logger.info('docComments', { docComments });

            const body = context.document.body;
            body.load("text");
            await context.sync();
            setDocumentContent(body.text);

            // Get all comments in the document
            
            if (docComments.items.length === 0) {
                logger.info("No comments found in the document.");
                setComments([]);
                return;
            }

            // Load required properties for all comments
            docComments.items.forEach((comment) => {
                comment.load(["id", "authorName", "text", "created"]);
            });
            await context.sync();

            // Process comments
            const comments = docComments.items.map((comment, index) => ({
                id: comment.id || `comment-${index}`,
                content: comment.content || '',
                author: comment.authorName || 'Unknown Author',
                date: comment.created ? new Date(comment.created).toISOString() : new Date().toISOString(),
            }));

            // Sort comments by date
            comments.sort((a, b) => new Date(a.date) - new Date(b.date));
            setComments(comments);
        });
    } catch (err) {
        console.error("Error reading document:", err);
        setError(`Failed to read document comments: ${err.message}`);
    } finally {
        setIsLoading(false);
    }
};
  

  return (
    <Layout className="document-reader">
      <Content>
        <div className="document-controls">
          <Button
            type="primary"
            icon={<FileTextOutlined />}
            onClick={readDocument}
            loading={isLoading}
            size="large"
          >
            Read Document
          </Button>
        </div>

        {error && (
          <Alert message={error} type="error" showIcon className="mt-4" />
        )}

        {isLoading ? (
          <div className="loading-container">
            <Spin size="large" />
            <p className="mt-2">Reading document...</p>
          </div>
        ) : (
          <Tabs defaultActiveKey="summary">
            <TabPane
              tab={
                <span>
                  <FileSearchOutlined />
                  Document Summary
                </span>
              }
              key="summary"
            >
              <DocumentSummary documentContent={documentContent} />
            </TabPane>
            <TabPane
              tab={
                <span>
                  <CommentOutlined />
                  Comments ({comments.length})
                </span>
              }
              key="comments"
            >
              <CommentList comments={comments} />
            </TabPane>
            <TabPane
              tab={
                <span>
                  <FileTextOutlined />
                  Document Content
                </span>
              }
              key="content"
            >
              <DocumentContent content={documentContent} />
            </TabPane>
          </Tabs>
        )}
      </Content>
    </Layout>
  );
};

export default DocumentReader;