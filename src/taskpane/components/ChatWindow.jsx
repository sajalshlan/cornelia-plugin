import React, { useState, useRef, useEffect } from 'react';
import { Button, Input, Spin, Typography } from 'antd';
import { SendOutlined, CloseOutlined } from '@ant-design/icons';
import { performAnalysis } from '../../api';

const { Title } = Typography;

const ChatWindow = ({ documentContent, onClose }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);

  useEffect(() => {
    // Add initial welcome message
    if (messages.length === 0) {
      setMessages([{
        role: 'assistant',
        content: 'Hi! I can help you analyze this document. What would you like to know?',
        isInitialTip: true,
        timestamp: new Date().toLocaleTimeString()
      }]);
    }
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const newMessage = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toLocaleTimeString()
    };

    setMessages(prev => [...prev, newMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const result = await performAnalysis('ask', 
        `Document Content:\n${documentContent}\n\nQuestion: ${input}`, 
        'document'
      );

      if (result) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: result,
          timestamp: new Date().toLocaleTimeString()
        }]);
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date().toLocaleTimeString(),
        isError: true
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const renderMessageContent = (content) => {
    return content.split('\n').map((line, i) => (
      <p key={i} className={i !== 0 ? 'mt-2' : undefined}>
        {line}
      </p>
    ));
  };

  return (
    <div className="flex flex-col h-full bg-white">


      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4" ref={chatContainerRef}>
        {messages.map((message, index) => {
          const isSystemMessage = message.isInitialTip || message.isError;
          
          return (
            <div 
              key={index} 
              className={`mb-4 ${
                isSystemMessage
                  ? 'flex justify-center' 
                  : message.role === 'user' 
                    ? 'flex flex-col items-end' 
                    : 'flex flex-col items-start'
              }`}
              ref={index === messages.length - 1 ? messagesEndRef : null}
            >
              {isSystemMessage ? (
                <div className="flex items-center gap-2 px-6 py-2.5 bg-gray-50 rounded-full 
                  text-xs font-medium text-gray-500 border border-gray-200">
                  <span className="w-4 h-4">ℹ</span>
                  {message.content}
                </div>
              ) : (
                <div className="space-y-1 max-w-[80%]">
                  <div className={`p-4 rounded-2xl ${
                    message.role === 'user' 
                      ? 'bg-blue-500 text-white text-right' 
                      : 'bg-gray-100 text-gray-800 text-left'
                  }`}>
                    <div className="text-sm">
                      {renderMessageContent(message.content)}
                    </div>
                  </div>
                  <div className={`text-xs ${
                    message.role === 'user' ? 'text-right' : 'text-left'
                  } text-gray-500`}>
                    {message.timestamp}
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {isLoading && (
          <div className="flex justify-center items-center p-4">
            <Spin size="small" />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-200">
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your question here..."
            disabled={isLoading}
            className="flex-grow rounded-full border-gray-200 hover:border-gray-300 focus:border-blue-500"
          />
          <Button
            type="primary"
            htmlType="submit"
            icon={<SendOutlined />}
            disabled={isLoading || !input.trim()}
            className="rounded-full flex items-center justify-center w-10 h-10 !p-0"
          />
        </form>
      </div>
    </div>
  );
};

export default ChatWindow; 