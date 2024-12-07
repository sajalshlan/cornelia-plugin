import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Button, Modal, Input, message, Tooltip } from 'antd';
import {
  EditOutlined,
  MessageOutlined,
  CloseCircleOutlined,
  CheckCircleOutlined,
  SyncOutlined
} from '@ant-design/icons';
import { replyToComment, redraftComment } from '../../api';
import { searchAndReplaceText } from '../utils/wordUtils';
import {logger} from '../../api';
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
  const replyTextAreaRef = useRef(null);
  const redraftTextAreaRef = useRef(null);
  const [redraftRangeTracking, setRedraftRangeTracking] = useState(null);

  // Effect for AI Reply Modal
  useEffect(() => {
    if (isAIReplyModalVisible && replyTextAreaRef.current) {
      // Small delay to ensure modal is fully rendered
      const timer = setTimeout(() => {
        replyTextAreaRef.current.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isAIReplyModalVisible]);

  // Effect for Redraft Modal
  useEffect(() => {
    if (isRedraftModalVisible && redraftTextAreaRef.current) {
      const timer = setTimeout(() => {
        redraftTextAreaRef.current.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isRedraftModalVisible]);

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
        newReply.load(["id", "authorName", "created"]);
        await context.sync();

        // Set comment as resolved
        targetComment.resolved = true;
        await context.sync();

        const updatedComment = {
          ...comment,
          resolved: true,
          replies: [...(comment.replies || []), {
            id: newReply.id,
            content: generatedReply,
            author: newReply.authorName || 'Unknown Author',
            date: new Date().toISOString()
          }]
        };
        
        onCommentUpdate(updatedComment);
        setGeneratedReply(null);
        message.success('Reply added and comment resolved');
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
      if (action === 'aiReply') {
        handleAIReply();
      } else if (action === 'redraft') {
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
            logger.info('targetComment', targetComment);
            if (!targetComment) {
                throw new Error('Comment not found');
            }

            // Get the comment's range and load its properties
            const contentRange = targetComment.getRange();
            logger.info('contentRange before load', contentRange);
            contentRange.load(["text", "start", "end"]);
            await context.sync();
            logger.info('content text after load', contentRange.text);
            logger.info('content start after load', contentRange.start);
            logger.info('content end after load', contentRange.end);

            // Insert the generated redraft text into the comment's range
            contentRange.insertText(generatedRedraft.text, Word.InsertLocation.replace);

            // Store range information for undo tracking
            setRedraftRangeTracking({
                originalText: contentRange.text,
                originalStart: contentRange.start,
                originalEnd: contentRange.end,
                newStart: contentRange.start, // Updated to reflect actual start after insertion
                newEnd: contentRange.start + generatedRedraft.text.length, // Calculate new end
                commentId: comment.id
            });

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

  const handleAcceptAndResolve = async () => {
    try {
      // First redraft the text using the existing handler
      // This will set up the redraftRangeTracking
      await handleAcceptRedraft();
      
      await Word.run(async (context) => {
        const comments = context.document.body.getComments();
        comments.load("items");
        await context.sync();

        const targetComment = comments.items.find(c => c.id === comment.id);
        if (!targetComment) {
          throw new Error('Comment not found');
        }

        // Then resolve the comment
        targetComment.resolved = true;
        await context.sync();
        
        // Update UI state through CommentList with the new content
        onCommentUpdate({ 
          ...comment, 
          resolved: true,
          content: generatedRedraft.text // Store the updated content
        });
        
        message.success('Text redrafted and comment resolved');
      });
    } catch (error) {
      console.error('Error in accept and resolve:', error);
      message.error('Failed to redraft and resolve: ' + error.message);
      // Clear tracking state on error
      setRedraftRangeTracking(null);
      setGeneratedRedraft(null);
    }
  };

  const handleAcceptAndComment = async () => {
    try {
      // First redraft the text
      await handleAcceptRedraft();
      // Then open the reply modal and set a flag to resolve after reply
      setIsAIReplyModalVisible(true);
    } catch (error) {
      console.error('Error in accept and comment:', error);
      message.error('Failed to redraft and open comment: ' + error.message);
    }
  };

  const handleDirectReply = async () => {
    try {
      await Word.run(async (context) => {
        const comments = context.document.body.getComments();
        comments.load("items");
        await context.sync();

        const targetComment = comments.items.find(c => c.id === comment.id);
        if (!targetComment) {
          throw new Error('Comment not found');
        }

        const newReply = targetComment.reply(aiReplyContent);
        newReply.load(["id", "authorName", "created"]);
        await context.sync();

        // Set comment as resolved
        targetComment.resolved = true;
        await context.sync();

        const updatedComment = {
          ...comment,
          resolved: true,
          replies: [...(comment.replies || []), {
            id: newReply.id,
            content: aiReplyContent,
            author: newReply.authorName || 'Unknown Author',
            date: new Date().toISOString()
          }]
        };
        
        onCommentUpdate(updatedComment);
        setAIReplyContent('');
        setIsAIReplyModalVisible(false);
        message.success('Reply added and comment resolved');
      });
    } catch (error) {
      console.error('Error adding direct reply:', error);
      message.error('Failed to add reply: ' + error.message);
    }
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
        <div className="redraft-result-card mt-4 p-4 bg-white shadow-sm border border-gray-200">
          <div className="text-sm text-gray-600 mb-2">AI Generated Redraft:</div>
          <div className="max-h-[200px] overflow-y-auto mb-4">
            <TextArea
              value={generatedRedraft.text}
              onChange={e => setGeneratedRedraft(prev => ({ ...prev, text: e.target.value }))}
              onKeyPress={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleAcceptRedraft();
                }
              }}
              autoSize={{ minRows: 4, maxRows: 12 }}
              className="text-base redraft-preview"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button 
              size="small" 
              onClick={handleRejectRedraft}
              className="hover:bg-red-600 hover:border-red-600"
            >
              Reject
            </Button>
            <Button 
              size="small" 
              onClick={handleRegenerateRedraft}
              className="hover:bg-blue-600 hover:border-blue-600 transition-colors"
            >
              Regenerate
            </Button>
            <Button 
              size="small" 
              type="primary" 
              onClick={handleAcceptAndResolve}
              className="hover:bg-green-600 hover:border-green-600 transition-colors"
            >
              Accept & Resolve
            </Button>
            <Button 
              size="small" 
              type="primary" 
              onClick={handleAcceptAndComment}
              className="hover:bg-green-600 hover:border-green-600 transition-colors"
            >
              Accept & Reply
            </Button>
          </div>
        </div>
      )}

      {/* Generated Reply Card */}
      {generatedReply && (
        <div className="reply-result-card mt-4 p-4 bg-white shadow-sm border border-gray-200">
          <div className="text-sm text-gray-600 mb-2">AI Generated Reply:</div>
          <div className="max-h-[200px] overflow-y-auto mb-4">
            <TextArea
              value={generatedReply}
              onChange={e => setGeneratedReply(e.target.value)}
              onKeyPress={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleAcceptGeneratedReply();
                }
              }}
              autoSize={{ minRows: 4, maxRows: 12 }}
              className="text-base reply-preview"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button 
              size="small" 
              onClick={handleRejectGeneratedReply}
              className="hover:bg-red-600 hover:border-red-600 transition-colors"
            >
              Reject
            </Button>
            <Button 
              size="small" 
              onClick={handleRegenerateAIReply}
              className="hover:bg-blue-600 hover:border-blue-600 transition-colors"
            >
              Regenerate
            </Button>
            <Button 
              size="small" 
              type="primary" 
              onClick={handleAcceptGeneratedReply}
              className="hover:bg-green-600 hover:border-green-600 transition-colors"
            >
              Accept
            </Button>
            <div></div> {/* Empty div to maintain grid alignment */}
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
          <div className="flex justify-end space-x-2">
            <Button
              disabled={!aiReplyContent.trim()}
              onClick={handleDirectReply}
            >
              Reply
            </Button>
            <Button 
              type="primary"
              icon={<CheckCircleOutlined />}
              onClick={handleAIReply}
            >
              Generate Reply
            </Button>
          </div>
        }
        width={360}
        className="ai-reply-modal"
        closeIcon={null}
      >
        <TextArea
          ref={replyTextAreaRef}
          rows={5}
          value={aiReplyContent}
          onChange={e => setAIReplyContent(e.target.value)}
          onKeyPress={e => handleKeyPress(e, 'aiReply')}
          placeholder="Give instructions for your reply..."
          className="ai-reply-textarea"
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
          ref={redraftTextAreaRef}
          rows={5}
          value={redraftContent}
          onChange={e => setRedraftContent(e.target.value)}
          onKeyPress={e => handleKeyPress(e, 'redraft')}
          placeholder="Give instructions for your redraft..."
          className="redraft-textarea"
        />
      </Modal>
    </>
  );
});

export default React.memo(CommentActions);