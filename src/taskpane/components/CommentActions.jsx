import React, { useState } from 'react';
import { Button, Space, Modal, Input, message } from 'antd';
import {
  EditOutlined,
  SearchOutlined,
  CheckCircleOutlined,
  MessageOutlined
} from '@ant-design/icons';

const { TextArea } = Input;

const CommentActions = ({ comment }) => {
  const [isRedraftModalVisible, setIsRedraftModalVisible] = useState(false);
  const [isAnalyzeModalVisible, setIsAnalyzeModalVisible] = useState(false);
  const [redraftContent, setRedraftContent] = useState('');

  const handleRedraft = async () => {
    try {
      // Implement redraft logic here
      message.success('Comment redrafted successfully');
      setIsRedraftModalVisible(false);
    } catch (error) {
      message.error('Failed to redraft comment');
    }
  };

  const handleAnalyze = async () => {
    try {
      // Implement analysis logic here
      setIsAnalyzeModalVisible(true);
    } catch (error) {
      message.error('Failed to analyze comment');
    }
  };

  return (
    <>
      <Space className="comment-actions mt-4">
        <Button
          type="primary"
          icon={<EditOutlined />}
          onClick={() => setIsRedraftModalVisible(true)}
        >
          Redraft
        </Button>
        <Button
          icon={<SearchOutlined />}
          onClick={handleAnalyze}
        >
          Analyze
        </Button>
        <Button
          icon={<MessageOutlined />}
          onClick={() => message.info('Reply feature coming soon')}
        >
          Reply
        </Button>
        {!comment.resolved && (
          <Button
            type="primary"
            ghost
            icon={<CheckCircleOutlined />}
            onClick={() => message.success('Comment marked as resolved')}
          >
            Resolve
          </Button>
        )}
      </Space>

      <Modal
        title="Redraft Comment"
        open={isRedraftModalVisible}
        onOk={handleRedraft}
        onCancel={() => setIsRedraftModalVisible(false)}
      >
        <TextArea
          rows={4}
          value={redraftContent}
          onChange={e => setRedraftContent(e.target.value)}
          placeholder="Enter new comment content..."
        />
      </Modal>

      <Modal
        title="Analysis Results"
        open={isAnalyzeModalVisible}
        onOk={() => setIsAnalyzeModalVisible(false)}
        onCancel={() => setIsAnalyzeModalVisible(false)}
      >
        <p>Analysis results will appear here...</p>
      </Modal>
    </>
  );
};

export default CommentActions;