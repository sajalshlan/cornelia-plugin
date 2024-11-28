import React, { useState } from 'react';
import { Button, Typography, Alert, Spin } from 'antd';
import { FileSearchOutlined } from '@ant-design/icons';
import { performAnalysis } from '../../api';

const { Paragraph } = Typography;

const DocumentSummary = ({ 
  documentContent, 
  summary, 
  isLoading,
  progress,
  error,
  onGenerateSummary 
}) => {
  return (
    <div className="document-summary">
      <Button
        type="primary"
        icon={<FileSearchOutlined />}
        onClick={onGenerateSummary}
        loading={isLoading}
        disabled={!documentContent}
        block
      >
        Generate Summary {progress > 0 && `(${progress}%)`}
      </Button>

      {error && (
        <Alert message={error} type="error" showIcon className="mt-4" />
      )}

      {isLoading && (
        <div className="loading-container">
          <Spin />
          <p>Generating summary... {progress}%</p>
        </div>
      )}

      {summary && (
        <div className="mt-4">
          <Paragraph>{summary}</Paragraph>
        </div>
      )}
    </div>
  );
};

export default DocumentSummary; 