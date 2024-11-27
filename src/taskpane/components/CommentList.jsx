import React from 'react';
import { List, Card, Tag, Space } from 'antd';
import CommentActions from './CommentActions';

const CommentList = ({ comments }) => {
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
          className="comment-card mb-4"
          title={
            <Space>
              <span>{comment.author}</span>
              {comment.resolved ? (
                <Tag color="success">Resolved</Tag>
              ) : (
                <Tag color="processing">Open</Tag>
              )}
            </Space>
          }
        >
          <div className="comment-content">
            {comment.content}
          </div>
          <div className="comment-metadata text-sm text-gray-500 mt-2">
            {new Date(comment.date).toLocaleString()}
          </div>
          <CommentActions comment={comment} />
        </Card>
      )}
    />
  );
};

export default CommentList;