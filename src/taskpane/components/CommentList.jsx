import React from 'react';
import { List, Card, Typography, Badge, Button, Tooltip, Collapse } from 'antd';
import { 
  UserOutlined, 
  ClockCircleOutlined,
  CheckCircleOutlined,
  ArrowRightOutlined,
  CommentOutlined
} from '@ant-design/icons';
import CommentActions from './CommentActions';

const { Text } = Typography;
const { Panel } = Collapse;

const CommentList = ({ comments }) => {
  const navigateToComment = async (commentId) => {
    try {
      await Word.run(async (context) => {
        // Get all comments in the document
        const docComments = context.document.body.getComments();
        docComments.load("items");
        await context.sync();

        // logger.info('docComments', docComments);

        // Find the comment by ID
        const comment = docComments.items.find(c => c.id === commentId);
        // logger.info('comment', comment);
        
        if (comment) {
          // Load the comment's content range
          // logger.info('hello');
          const contentRange = comment.getRange();
          contentRange.load("text");
          await context.sync();
          // logger.info('contentRange', contentRange);

          // Select and scroll to the comment's range
          contentRange.select();
          contentRange.scrollIntoView();
          await context.sync();
        } else {
          logger.warn('Comment not found:', { commentId });
        }
      });
    } catch (error) {
      logger.error('Error navigating to comment:', { error, commentId });
      console.error('Failed to navigate to comment:', error);
    }
  };

  const renderReplyList = (replies) => {
    if (!replies || replies.length === 0) return null;

    return (
      <Collapse 
        ghost 
        className="replies-collapse"
      >
        <Panel 
          header={
            <Text type="secondary">
              <CommentOutlined className="mr-1" />
              {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
            </Text>
          } 
          key="1"
        >
          {replies.map(reply => (
            <div key={reply.id} className="reply-item">
              <div className="reply-header">
                <div className="reply-author">
                  <UserOutlined className="mr-2" />
                  <Text strong>{reply.author}</Text>
                </div>
                <Text type="secondary" className="text-xs">
                  {new Date(reply.date).toLocaleString()}
                </Text>
              </div>
              <div className="reply-content">
                {reply.content}
              </div>
            </div>
          ))}
        </Panel>
      </Collapse>
    );
  };

  return (
    <List
      className="comment-list"
      itemLayout="vertical"
      dataSource={comments}
      renderItem={comment => (
        <Card className={`comment-card ${comment.resolved ? 'resolved' : ''}`}>
          <div className="comment-header">
            <div className="comment-author">
              <div className="comment-author-avatar">
                <UserOutlined className="text-white" />
              </div>
              <div className="comment-author-info">
                <Text strong className="text-sm author-name">{comment.author}</Text>
                <Text type="secondary" className="text-xs date">
                  <ClockCircleOutlined className="mr-1" />
                  {new Date(comment.date).toLocaleString()}
                </Text>
              </div>
            </div>
            <div className="comment-controls">
              {!comment.resolved && (
                <Tooltip title="Mark as Resolved">
                  <Button
                    type="text"
                    size="small"
                    icon={<CheckCircleOutlined />}
                    className="resolve-btn"
                    onClick={() => message.success('Comment marked as resolved')}
                  />
                </Tooltip>
              )}
              <Tooltip title="Go to Comment">
                <Button
                  type="default"
                  size="small"
                  icon={<ArrowRightOutlined />}
                  onClick={() => navigateToComment(comment.id)}
                  className="go-to-comment-btn"
                />
              </Tooltip>
            </div>
          </div>

          <div className="comment-content-wrapper">
            <Text className="comment-text">{comment.content}</Text>
          </div>

          {renderReplyList(comment.replies)}
          <CommentActions comment={comment} />
        </Card>
      )}
    />
  );
};

export default CommentList;