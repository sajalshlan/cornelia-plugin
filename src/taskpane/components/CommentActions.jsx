import React, { useState } from 'react';
import { Button, Modal, Input, message } from 'antd';
import {
  EditOutlined,
  MessageOutlined,
  CloseCircleOutlined,
  CheckCircleOutlined
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
      setRedraftContent('');
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
        title={
          <div className="modal-title">
            <EditOutlined className="modal-icon" />
            <span>Redraft Comment</span>
          </div>
        }
        open={isRedraftModalVisible}
        onCancel={() => {
          setIsRedraftModalVisible(false);
          setRedraftContent('');
        }}
        footer={
          <Button 
            type="primary"
            icon={<CheckCircleOutlined />}
            onClick={handleRedraft}
          >
            Redraft
          </Button>
        }
        width={360}
        className="redraft-modal"
        closeIcon={null}
      >
        <TextArea
          rows={5}
          value={redraftContent}
          onChange={e => setRedraftContent(e.target.value)}
          placeholder="Instruct the redraft if needed..."
          className="redraft-textarea"
          autoFocus
        />
      </Modal>
    </>
  );
};

export default CommentActions;