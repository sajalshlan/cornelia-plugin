import React, { useState } from 'react';
import { Button, Modal, Input, message } from 'antd';
import {
  EditOutlined,
  MessageOutlined,
  CloseCircleOutlined,
  CheckCircleOutlined,
  SyncOutlined
} from '@ant-design/icons';
import { redraftComment } from '../../api';

const { TextArea } = Input;

const CommentActions = ({ comment, onCommentResolved }) => {
  const [isRedraftModalVisible, setIsRedraftModalVisible] = useState(false);
  const [isReplyModalVisible, setIsReplyModalVisible] = useState(false);
  const [redraftContent, setRedraftContent] = useState('');
  const [replyContent, setReplyContent] = useState('');
  const [isRedrafting, setIsRedrafting] = useState(false);
  const [redraftResult, setRedraftResult] = useState(null);

  const handleRedraft = async () => {
    if (!comment) return;
    
    try {
      setIsRedrafting(true);
      setIsRedraftModalVisible(false);
      setRedraftContent('');
      
      const documentContent = await Word.run(async (context) => {
        const body = context.document.body;
        body.load("text");
        await context.sync();
        return body.text;
      });

      const result = await redraftComment(
        comment.content,
        documentContent,
        redraftContent.trim(),
        comment.replies || []
      );

      if (result) {
        setRedraftResult(result);
      }
    } catch (error) {
      message.error('Failed to redraft comment: ' + error.message);
    } finally {
      setIsRedrafting(false);
    }
  };

  const handleAcceptRedraft = async () => {
    try {
      await Word.run(async (context) => {
        // Load the comments collection first
        const comments = context.document.body.getComments();
        comments.load("items");
        await context.sync();

        // Find the target comment
        const targetComment = comments.items.find(c => c.id === comment.id);
        if (!targetComment) {
          throw new Error('Comment not found');
        }

        // Load the replies collection
        targetComment.replies.load();
        await context.sync();

        // Create a new reply
        const newReply = targetComment.reply(redraftResult);
        await context.sync();

        // Update the UI state
        const replyObject = {
          id: newReply.id,
          content: redraftResult,
          author: 'Cornelia AI',
          date: new Date().toISOString()
        };

        // Update the parent comment's state with the new reply
        comment.replies = [...(comment.replies || []), replyObject];
        
        message.success('Reply added successfully');
        setRedraftResult(null);
      });
    } catch (error) {
      console.error('Error adding reply:', error);
      message.error('Failed to add reply: ' + error.message);
    }
  };

  const handleRejectRedraft = () => {
    setRedraftResult(null);
  };

  const handleRegenerateRedraft = () => {
    setRedraftResult(null);
    setIsRedraftModalVisible(true);
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
          loading={isRedrafting}
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

      {/* Redraft Result Card */}
      {redraftResult && (
        <div className="redraft-result-card mt-4 p-4 bg-white rounded-lg shadow">
          <div className="text-sm text-gray-600 mb-2">Suggested Redraft:</div>
          <div className="text-base mb-4">{redraftResult}</div>
          <div className="flex justify-end space-x-2">
            <Button
              type="text"
              icon={<CloseCircleOutlined className="text-red-500" />}
              onClick={handleRejectRedraft}
            />
            <Button
              type="text"
              icon={<SyncOutlined className="text-blue-500" />}
              onClick={handleRegenerateRedraft}
            />
            <Button
              type="text"
              icon={<CheckCircleOutlined className="text-green-500" />}
              onClick={handleAcceptRedraft}
            />
          </div>
        </div>
      )}

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