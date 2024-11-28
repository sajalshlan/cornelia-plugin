import React from 'react';
import { Typography, Alert, Spin, Card, Space, Button, Tooltip, message } from 'antd';
import { FileSearchOutlined, CopyOutlined, LikeOutlined, DislikeOutlined } from '@ant-design/icons';

const { Paragraph, Title } = Typography;

const DocumentSummary = ({ 
  documentContent, 
  summary, 
  isLoading,
  progress,
  error
}) => {
  const handleCopy = () => {
    const selection = window.getSelection();
    const range = document.createRange();
    
    // Create a temporary container with clean styling
    const tempContainer = document.createElement('div');
    tempContainer.style.cssText = `
      position: fixed;
      left: -9999px;
      color: black !important;
      background: white !important;
      font-family: Arial, sans-serif;
      font-size: 14px;
      white-space: pre-wrap;
    `;
    
    // Clean and format the content with explicit black text
    tempContainer.innerHTML = summary
      .split('\n')
      .map(line => {
        const parts = line.split(/(\*\*.*?\*\*)/g);
        return parts
          .map(part => {
            if (part.startsWith('**') && part.endsWith('**')) {
              // Force black color for bold text
              return `<strong style="font-weight: bold; color: black !important; background: none;">${part.slice(2, -2)}</strong>`;
            }
            // Force black color for regular text
            return `<span style="color: black !important;">${part}</span>`;
          })
          .join('');
      })
      .join('<br>');
    
    document.body.appendChild(tempContainer);
    
    try {
      range.selectNodeContents(tempContainer);
      selection.removeAllRanges();
      selection.addRange(range);
      
      const successful = document.execCommand('copy');
      if (successful) {
        message.success('Content copied successfully');
      }
    } catch (err) {
      console.error('Failed to copy content:', err);
      message.error('Failed to copy content');
    } finally {
      selection.removeAllRanges();
      document.body.removeChild(tempContainer);
    }
  };

  const renderContent = (text) => {
    if (!text) return null;
    
    return text.split('**').map((part, i) => 
      i % 2 === 0 ? (
        <span key={i}>{part}</span>
      ) : (
        <span key={i} className="font-bold text-blue-600">{part}</span>
      )
    );
  };

  return (
    <div className="p-4">
      {error && (
        <Alert message={error} type="error" showIcon className="mb-4" />
      )}

      {isLoading ? (
        <div className="loading-container">
          <Space direction="vertical" align="center">
            <Spin size="large" />
            <Title level={4} className="text-gray-500">Analyzing Document</Title>
            <Paragraph className="text-gray-400">
              Generating summary... {progress}%
            </Paragraph>
          </Space>
        </div>
      ) : summary ? (
        <Card 
          className="summary-card"
          bordered={false}
          bodyStyle={{ padding: '24px' }}
        >
          <Paragraph className="text-gray-700 text-base leading-relaxed whitespace-pre-wrap">
            {renderContent(summary)}
          </Paragraph>

          <div className="flex justify-end mt-4 space-x-2 border-t pt-4">
            <Tooltip title="Copy Summary">
              <Button 
                icon={<CopyOutlined />}
                onClick={handleCopy}
                type="text"
              />
            </Tooltip>
            <Tooltip title="Helpful">
              <Button 
                icon={<LikeOutlined />}
                type="text"
              />
            </Tooltip>
            <Tooltip title="Not Helpful">
              <Button 
                icon={<DislikeOutlined />}
                type="text"
              />
            </Tooltip>
          </div>
        </Card>
      ) : null}
    </div>
  );
};

export default DocumentSummary; 