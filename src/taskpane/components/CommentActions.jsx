import React, { useState, useCallback } from 'react';
import { Button, Modal, Input, message } from 'antd';
import {
  EditOutlined,
  MessageOutlined,
  CloseCircleOutlined,
  CheckCircleOutlined,
  SyncOutlined
} from '@ant-design/icons';
import { replyToComment, redraftComment } from '../../api';

const { TextArea } = Input;

const CommentActions = React.memo(({ comment, onCommentUpdate }) => {
  const [isRedraftModalVisible, setIsRedraftModalVisible] = useState(false);
  const [isAIReplyModalVisible, setIsAIReplyModalVisible] = useState(false);
  const [redraftContent, setRedraftContent] = useState('');
  const [aiReplyContent, setAIReplyContent] = useState('');
  const [isGeneratingReply, setIsGeneratingReply] = useState(false);
  const [isGeneratingRedraft, setIsGeneratingRedraft] = useState(false);
  const [generatedReply, setGeneratedReply] = useState(null);
  const [generatedRedraft, setGeneratedRedraft] = useState(null);

  const handleAIReply = async () => {
    if (!comment) return;
    
    try {
      setIsGeneratingReply(true);
      setIsAIReplyModalVisible(false);
      setAIReplyContent('');
      
      const documentContent = await Word.run(async (context) => {
        const body = context.document.body;
        body.load("text");
        await context.sync();
        return body.text;
      });

      const result = await replyToComment(
        comment.content,
        documentContent,
        aiReplyContent.trim(),
        comment.replies || []
      );

      if (result) {
        setGeneratedReply(result);
      }
    } catch (error) {
      message.error('Failed to generate reply: ' + error.message);
    } finally {
      setIsGeneratingReply(false);
    }
  };

  const handleAcceptGeneratedReply = useCallback(async () => {
    try {
      await Word.run(async (context) => {
        const comments = context.document.body.getComments();
        comments.load("items");
        await context.sync();

        const targetComment = comments.items.find(c => c.id === comment.id);
        if (!targetComment) {
          throw new Error('Comment not found');
        }

        targetComment.replies.load();
        await context.sync();

        const newReply = targetComment.reply(generatedReply);
        await context.sync();

        const updatedComment = {
          ...comment,
          replies: [...(comment.replies || []), {
            id: newReply.id,
            content: generatedReply,
            author: newReply.authorName || 'Unknown Author',
            date: new Date().toISOString()
          }]
        };
        
        onCommentUpdate(updatedComment);
        setGeneratedReply(null);
        message.success('Reply added successfully');
      });
    } catch (error) {
      console.error('Error adding reply:', error);
      message.error('Failed to add reply: ' + error.message);
    }
  }, [comment, generatedReply, onCommentUpdate]);

  const handleRejectGeneratedReply = () => {
    setGeneratedReply(null);
  };

  const handleRegenerateAIReply = () => {
    setGeneratedReply(null);
    setIsAIReplyModalVisible(true);
  };

  const handleRedraft = async () => {
    if (!comment) return;
    
    try {
      setIsGeneratingRedraft(true);
      setIsRedraftModalVisible(false);
      setRedraftContent('');
      
      await Word.run(async (context) => {
        const body = context.document.body;
        body.load("text");
        
        const comments = context.document.body.getComments();
        comments.load("items");
        await context.sync();

        const targetComment = comments.items.find(c => c.id === comment.id);
        if (!targetComment) {
          throw new Error('Comment not found');
        }

        const contentRange = targetComment.getRange();
        contentRange.load("text");
        await context.sync();

        const selectedText = contentRange.text;
        const documentContent = body.text;

        const result = await redraftComment(
          comment.content,
          documentContent,
          selectedText,
          redraftContent.trim(),
          comment.replies || []
        );

        if (result) {
          setGeneratedRedraft({
            text: result,
            range: contentRange
          });
        }
      });
    } catch (error) {
      console.error('Error redrafting:', error);
      message.error('Failed to redraft: ' + error.message);
    } finally {
      setIsGeneratingRedraft(false);
    }
  };

  const handleKeyPress = (e, action) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (action === 'aiReply' && aiReplyContent.trim()) {
        handleAIReply();
      } else if (action === 'redraft' && redraftContent.trim()) {
        handleRedraft();
      }
    }
  };

  const handleAcceptRedraft = async () => {
    try {
      await Word.run(async (context) => {
        const comments = context.document.body.getComments();
        comments.load("items");
        await context.sync();

        const targetComment = comments.items.find(c => c.id === comment.id);
        if (!targetComment) {
          throw new Error('Comment not found');
        }

        const contentRange = targetComment.getRange();
        contentRange.load("text");
        await context.sync();

        contentRange.insertText(generatedRedraft.text, Word.InsertLocation.replace);
        await context.sync();
        
        setGeneratedRedraft(null);
        message.success('Text redrafted successfully');
      });
    } catch (error) {
      console.error('Error applying redraft:', error);
      message.error('Failed to apply redraft: ' + error.message);
    }
  };

  const handleRejectRedraft = () => {
    setGeneratedRedraft(null);
  };

  const handleRegenerateRedraft = () => {
    setGeneratedRedraft(null);
    setIsRedraftModalVisible(true);
  };

  return (
    <>
      <div className="comment-actions-grid">
        <Button
          icon={<EditOutlined />}
          onClick={() => setIsRedraftModalVisible(true)}
          loading={isGeneratingRedraft}
        >
          Redraft
        </Button>
        <Button
          type="primary"
          icon={<MessageOutlined />}
          onClick={() => setIsAIReplyModalVisible(true)}
          loading={isGeneratingReply}
        >
          Reply
        </Button>
      </div>

      {/* Generated Redraft Card */}
      {generatedRedraft && (
        <div className="redraft-result-card mt-4 p-4 bg-white rounded-lg shadow">
          <div className="text-sm text-gray-600 mb-2">AI Generated Redraft:</div>
          <div className="text-base mb-4">{generatedRedraft.text}</div>
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

      {/* Generated Reply Card */}
      {generatedReply && (
        <div className="reply-result-card mt-4 p-4 bg-white rounded-lg shadow">
          <div className="text-sm text-gray-600 mb-2">AI Generated Reply:</div>
          <div className="text-base mb-4">{generatedReply}</div>
          <div className="flex justify-end space-x-2">
            <Button
              type="text"
              icon={<CloseCircleOutlined className="text-red-500" />}
              onClick={handleRejectGeneratedReply}
            />
            <Button
              type="text"
              icon={<SyncOutlined className="text-blue-500" />}
              onClick={handleRegenerateAIReply}
            />
            <Button
              type="text"
              icon={<CheckCircleOutlined className="text-green-500" />}
              onClick={handleAcceptGeneratedReply}
            />
          </div>
        </div>
      )}

      {/* AI Reply Modal */}
      <Modal
        title={
          <div className="modal-title">
            <EditOutlined className="modal-icon" />
            <span>Reply with Cornelia</span>
          </div>
        }
        open={isAIReplyModalVisible}
        onCancel={() => {
          setIsAIReplyModalVisible(false);
          setAIReplyContent('');
        }}
        footer={
          <Button 
            type="primary"
            icon={<CheckCircleOutlined />}
            onClick={handleAIReply}
          >
            Generate Reply
          </Button>
        }
        width={360}
        className="ai-reply-modal"
        closeIcon={null}
      >
        <TextArea
          rows={5}
          value={aiReplyContent}
          onChange={e => setAIReplyContent(e.target.value)}
          onKeyPress={e => handleKeyPress(e, 'aiReply')}
          placeholder="Give instructions for your reply..."
          className="ai-reply-textarea"
          autoFocus
        />
      </Modal>

      {/* Redraft Modal */}
      <Modal
        title={
          <div className="modal-title">
            <MessageOutlined className="modal-icon" />
            <span>Redraft with Cornelia</span>
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
          placeholder="Give instructions for your redraft..."
          className="redraft-textarea"
          autoFocus
        />
      </Modal>
    </>
  );
});

export default React.memo(CommentActions);