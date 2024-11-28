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

  return (
    <>
      <div className="comment-actions-grid">
        <Button
          type="primary"
          icon={<EditOutlined />}
          onClick={() => setIsRedraftModalVisible(true)}
        >
          Redraft
        </Button>
        <Button
          icon={<MessageOutlined />}
          onClick={() => message.info('Reply feature coming soon')}
        >
          Reply
        </Button>
      </div>

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
    </>
  );
};

export default CommentActions;