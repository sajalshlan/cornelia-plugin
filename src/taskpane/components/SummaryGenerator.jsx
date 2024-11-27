import React, { useState } from 'react';
import { Button, Typography, Alert } from 'antd';
import { FileTextOutlined } from '@ant-design/icons';
import { performAnalysis } from '../../api';

const { Paragraph } = Typography;

const SummaryGenerator = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [summary, setSummary] = useState('');
  const [debugInfo, setDebugInfo] = useState('');

  const getDocumentText = async () => {
    try {
      setDebugInfo('Getting document text...');
      const text = await Word.run(async (context) => {
        const body = context.document.body;
        body.load("text");
        await context.sync();
        setDebugInfo(`Got text: ${body.text.substring(0, 50)}...`);
        setDebugInfo(body.text);
        return body.text;
      });
      return text;
    } catch (err) {
      setDebugInfo(`Error getting text: ${err.message}`);
      throw err;
    }
  };

  const handleGenerateSummary = async () => {
    try {
      setIsLoading(true);
      setDebugInfo('Starting summary generation...');
      const text = await getDocumentText();
      setDebugInfo(`Sending ${text.length} characters to API...`);
      const result = await performAnalysis('shortSummary', text, 'document');
      setSummary(result);
    } catch (error) {
      setDebugInfo(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4">
      {debugInfo && (
        <Alert
          message="Debug Info"
          description={debugInfo}
          type="info"
          showIcon
          className="mb-4"
        />
      )}
      
      <Button
        type="primary"
        icon={<FileTextOutlined />}
        onClick={handleGenerateSummary}
        loading={isLoading}
        block
      >
        Generate Summary sfas
      </Button> 

      {summary && (
        <div className="mt-4">
          <Paragraph>{summary}</Paragraph>
        </div>
      )}
    </div>
  );
};

export default SummaryGenerator;