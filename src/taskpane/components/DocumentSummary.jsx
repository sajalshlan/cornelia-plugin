import React, { useState } from 'react';
import { Button, Typography, Alert, Spin } from 'antd';
import { FileSearchOutlined } from '@ant-design/icons';
import { performAnalysis, logger } from '../../api';

const { Paragraph } = Typography;

const DocumentSummary = ({ documentContent }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [summary, setSummary] = useState('');
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);

  const handleGenerateSummary = async () => {
    // logger.info('Generate Summary clicked', { contentLength: documentContent?.length });
    
    if (!documentContent) {
      logger.warn('No document content available');
      setError('Please read the document first');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      // logger.info('Starting analysis request');
      
      const result = await performAnalysis(
        'shortSummary', 
        documentContent, 
        'document',
        (fileName, percent) => {
          setProgress(percent);
        }
      );

      // logger.info('Analysis completed successfully', { result });
      
      if (result) {
        setSummary(result);
      } else {
        throw new Error('No result received from analysis');
      }

    } catch (error) {
      logger.error('Analysis failed', { error });
      setError(error.message || 'Analysis failed');
    } finally {
      setIsLoading(false);
      setProgress(0);
      // logger.info('Generate Summary operation completed');
    }
  };

  return (
    <div className="document-summary">
      <Button
        type="primary"
        icon={<FileSearchOutlined />}
        onClick={handleGenerateSummary}
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