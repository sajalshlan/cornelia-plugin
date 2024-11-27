import React from 'react';
import { List, Card } from 'antd';

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
          title={comment.author}
        >
          <div className="comment-content">
            {comment.content}
          </div>
          <div className="comment-metadata text-sm text-gray-500 mt-2">
            {new Date(comment.date).toLocaleString()}
          </div>
        </Card>
      )}
    />
  );
};

export default CommentList;