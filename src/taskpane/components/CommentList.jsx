import React from 'react';
import { List, Card, Typography, Badge } from 'antd';
import { UserOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { logger } from '../../api';

const { Text, Title } = Typography;

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

  const renderReplies = (replies) => {
    if (!replies || replies.length === 0) return null;

    return (
      <div className="mt-4 space-y-3">
        <Text type="secondary" className="text-sm font-medium">
          Replies ({replies.length})
        </Text>
        <div className="space-y-3 pl-4 border-l-2 border-blue-100">
          {replies.map((reply, index) => (
            <div key={reply.id || index} className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <UserOutlined className="text-gray-400" />
                <Text strong className="text-sm">{reply.author}</Text>
                <Text type="secondary" className="text-xs">
                  <ClockCircleOutlined className="mr-1" />
                  {new Date(reply.date).toLocaleString()}
                </Text>
              </div>
              <Text className="text-sm text-gray-700">{reply.content}</Text>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (!comments.length) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center p-8 bg-white rounded-lg shadow-sm">
          <Title level={4} className="text-gray-400">No Comments Found</Title>
          <Text type="secondary">This document has no comments yet.</Text>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <List
        className="comment-list space-y-4"
        itemLayout="vertical"
        dataSource={comments}
        renderItem={comment => (
          <Card 
            className="comment-card hover:shadow-md transition-shadow duration-200"
            onClick={() => navigateToComment(comment.id)}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <UserOutlined className="text-blue-500" />
                <Text strong>{comment.author}</Text>
                {comment.resolved && (
                  <Badge status="success" text="Resolved" />
                )}
              </div>
              <Text type="secondary" className="text-xs">
                <ClockCircleOutlined className="mr-1" />
                {new Date(comment.date).toLocaleString()}
              </Text>
            </div>
            <div className="comment-content mb-4 text-gray-700">
              {comment.content}
            </div>
            {renderReplies(comment.replies)}
          </Card>
        )}
      />
    </div>
  );
};

export default CommentList;