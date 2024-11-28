import React, { useState } from 'react';
import { Button, Modal, Input, message } from 'antd';
import {
  EditOutlined,
  MessageOutlined,
  CloseCircleOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';

const { TextArea } = Input;

const CommentActions = ({ comment, onCommentResolved }) => {
  const [isRedraftModalVisible, setIsRedraftModalVisible] = useState(false);
  const [isReplyModalVisible, setIsReplyModalVisible] = useState(false);
  const [redraftContent, setRedraftContent] = useState('');
  const [replyContent, setReplyContent] = useState('');

  const handleRedraft = async () => {
    if (!redraftContent.trim()) return;
    
    try {
      // Implement redraft logic here
      message.success('Comment redrafted successfully');
      setIsRedraftModalVisible(false);
      setRedraftContent('');
    } catch (error) {
      message.error('Failed to redraft comment');
    }
  };

  const handleReply = async () => {
    try {
      // Implement reply logic here
      message.success('Reply added successfully');
      setIsReplyModalVisible(false);
      setReplyContent('');
    } catch (error) {
      message.error('Failed to add reply');
    }
  };

  const handleKeyPress = (e, action) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (action === 'redraft' && redraftContent.trim()) {
        handleRedraft();
      } else if (action === 'reply' && replyContent.trim()) {
        handleReply();
      }
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
          onClick={() => setIsReplyModalVisible(true)}
        >
          Reply
        </Button>
      </div>

      {/* Redraft Modal */}
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
          onKeyPress={e => handleKeyPress(e, 'redraft')}
          placeholder="Instruct the redraft if needed..."
          className="redraft-textarea"
          autoFocus
        />
      </Modal>

      {/* Reply Modal */}
      <Modal
        title={
          <div className="modal-title">
            <MessageOutlined className="modal-icon" />
            <span>Add Reply</span>
          </div>
        }
        open={isReplyModalVisible}
        onCancel={() => {
          setIsReplyModalVisible(false);
          setReplyContent('');
        }}
        footer={
          <Button 
            type="primary"
            icon={<CheckCircleOutlined />}
            onClick={handleReply}
            disabled={!replyContent.trim()}
          >
            Reply
          </Button>
        }
        width={360}
        className="reply-modal"
        closeIcon={null}
      >
        <TextArea
          rows={5}
          value={replyContent}
          onChange={e => setReplyContent(e.target.value)}
          onKeyPress={e => handleKeyPress(e, 'reply')}
          placeholder="Write your reply..."
          className="reply-textarea"
          autoFocus
        />
      </Modal>
    </>
  );
};

export default CommentActions;