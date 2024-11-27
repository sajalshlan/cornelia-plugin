import React from 'react';
import { Typography } from 'antd';

const { Paragraph } = Typography;

const DocumentContent = ({ content }) => {
  if (!content) {
    return (
      <div className="empty-state">
        <p>No document content loaded yet.</p>
      </div>
    );
  }

  return (
    <div className="document-content">
      <Paragraph>{content}</Paragraph>
    </div>
  );
};

export default DocumentContent; 