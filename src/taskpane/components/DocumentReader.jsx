import React, { useState } from 'react';
import { Layout, Button, Alert, Spin, Tabs } from 'antd';
import { 
  FileTextOutlined, 
  CommentOutlined,
  HistoryOutlined,
  FileSearchOutlined,
  EditOutlined 
} from '@ant-design/icons';
import CommentList from './CommentList';
import DocumentContent from './DocumentContent';
import DocumentSummary from './DocumentSummary';

const { Content } = Layout;
const { TabPane } = Tabs;

const DocumentReader = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [documentContent, setDocumentContent] = useState('');
  const [comments, setComments] = useState([]);
  const [trackingChanges, setTrackingChanges] = useState([]);
  const [error, setError] = useState(null);

  const readDocument = async () => {
    setIsLoading(true);
    try {
      await Word.run(async (context) => {
        // Get document content
        const body = context.document.body;
        body.load("text");
        await context.sync();
        setDocumentContent(body.text);

        const changes = [];

        // Get comments using the older API method
        try {
          console.log("Starting to read comments...");
          
          // Get comment ranges first
          const ranges = context.document.getSelection().getCommentRanges();
          ranges.load("items");
          await context.sync();

          console.log("Found comment ranges:", ranges.items.length);

          // Process each comment range
          for (let i = 0; i < ranges.items.length; i++) {
            const range = ranges.items[i];
            const comment = range.getComment();
            
            // Load specific properties
            comment.load([
              "id",
              "author",
              "text"
            ]);
            await context.sync();

            console.log("Processing comment:", {
              id: comment.id,
              author: comment.author,
              text: comment.text
            });

            const commentData = {
              type: 'comment',
              id: comment.id || `comment-${i}`,
              content: comment.text,
              author: comment.author || 'Unknown Author',
              date: new Date().toISOString(), // Fallback to current date if created date is not available
              resolved: false
            };

            changes.push(commentData);
          }
        } catch (commentError) {
          console.error("Detailed comment error:", commentError);
          setError(`Error reading comments: ${commentError.message}`);
        }

        // Sort all changes by date
        changes.sort((a, b) => new Date(a.date) - new Date(b.date));
        console.log("Final processed changes:", changes);
        
        setTrackingChanges(changes);
        setComments(changes);
      });
    } catch (err) {
      console.error("Error reading document:", err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const renderTrackingItem = (item) => {
    const date = new Date(item.date).toLocaleString();
    return (
      <div className="tracking-item p-4 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <span className="font-medium">{item.author}</span>
          <span className="text-gray-500 text-sm">({date})</span>
        </div>
        <div className="mt-2">
          {item.type === 'revision' ? (
            <div className="flex items-center gap-2">
              <EditOutlined className="text-blue-500" />
              <span>{item.changeType}: {item.content}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <CommentOutlined className="text-green-500" />
              <span>{item.content}</span>
            </div>
          )}
        </div>
      </div>
    );
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
          <Tabs defaultActiveKey="tracking">
            <TabPane
              tab={
                <span>
                  <EditOutlined />
                  Changes & Comments ({trackingChanges.length})
                </span>
              }
              key="tracking"
            >
              <div className="tracking-list">
                {trackingChanges.map((item, index) => (
                  <div key={item.id || index}>
                    {renderTrackingItem(item)}
                  </div>
                ))}
              </div>
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
                  <FileSearchOutlined />
                  Summary
                </span>
              }
              key="summary"
            >
              <DocumentSummary documentContent={documentContent} />
            </TabPane>
            <TabPane
              tab={
                <span>
                  <HistoryOutlined />
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