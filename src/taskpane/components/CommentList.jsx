import React from 'react';
import { List, Card, Typography } from 'antd';
import { logger } from '../../api';

const { Text } = Typography;

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
          logger.info('contentRange', contentRange);

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

  const renderReplies = (replies) => {
    if (!replies || replies.length === 0) return null;

    return (
      <div className="ml-4 mt-4 border-l-2 border-gray-200 pl-4">
        <Text type="secondary" className="text-sm mb-2 block">
          Replies ({replies.length})
        </Text>
        {replies.map((reply, index) => (
          <div key={reply.id || index} className="mb-3">
            <div className="text-sm">
              <Text strong>{reply.author}</Text>
              <Text type="secondary" className="ml-2">
                {new Date(reply.date).toLocaleString()}
              </Text>
            </div>
            <div className="mt-1">{reply.content}</div>
          </div>
        ))}
      </div>
    );
  };

  if (!comments.length) {
    return (
      <div className="empty-state">
        <p>No comments found in the document.</p>
      </div>
    );
  }

  return (
    <List
      className="comment-list"
      itemLayout="vertical"
      dataSource={comments}
      renderItem={comment => (
        <Card 
          className="comment-card mb-4 cursor-pointer hover:bg-gray-50"
          title={comment.author}
          onClick={() => navigateToComment(comment.id)}
        >
          <div className="comment-content">
            {comment.content}
          </div>
          <div className="comment-metadata text-sm text-gray-500 mt-2">
            {new Date(comment.date).toLocaleString()}
          </div>
          {renderReplies(comment.replies)}
        </Card>
      )}
    />
  );
};

export default CommentList;