import React, { useState, useRef, useEffect } from 'react';
import { Button, Input, Spin, Typography } from 'antd';
import { SendOutlined } from '@ant-design/icons';

const ChatWindow = ({ 
  documentContent, 
  messages, 
  setMessages, 
  isLoading,
  error,
  onSubmit 
}) => {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);

  // Function to search and highlight text in Word document
  const searchInDocument = async (searchText) => {
    try {
      await Word.run(async (context) => {
        // Clear any existing highlights first
        const body = context.document.body;
        body.load('text');
        await context.sync();

        // Search for the text
        const searchResults = body.search(searchText, { matchCase: false });
        context.load(searchResults, 'text');
        await context.sync();

        if (searchResults.items.length > 0) {
          // Highlight the first occurrence
          searchResults.items[0].select();
          searchResults.items[0].scrollIntoView();

          // Remove highlight after 2 seconds
          setTimeout(async () => {
            await Word.run(async (context) => {
              searchResults.items[0].font.highlightColor = 'None';
              await context.sync();
            });
          }, 2000);
        }
      });
    } catch (error) {
      console.error('Error searching document:', error);
    }
  };

  const renderInlineFormatting = (text, citationTexts) => {
    if (!text) return null;
    
    // Split by citations and bold text
    const parts = text.split(/(\[\d+\](?:\s*\([^)]+\))?|\*\*[^*]+\*\*)/g);
    
    return parts.map((part, index) => {
      // Handle citations: [1] or [1] (filename.pdf)
      if (part?.match(/\[(\d+)\](?:\s*\([^)]+\))?/)) {
        const matches = part.match(/\[(\d+)\](?:\s*\(([^)]+)\))?/);
        if (!matches) return part;

        const citationNumber = matches[1];
        const sourceText = citationTexts[citationNumber];
        
        return (
          <span key={index}>
            <a
              href="#"
              className="text-blue-600 hover:text-blue-800 hover:underline"
              onClick={(e) => {
                e.preventDefault();
                if (sourceText) {
                  searchInDocument(sourceText);
                }
              }}
              title={sourceText || `Citation ${citationNumber}`}
            >
              {`[${citationNumber}]`}
            </a>
          </span>
        );
      }
      
      // Handle bold text
      if (part?.match(/^\*\*.*\*\*$/)) {
        const boldText = part.slice(2, -2);
        return (
          <strong key={index} className="text-blue-600 font-semibold">
            {boldText}
          </strong>
        );
      }
      
      // Handle code blocks
      if (part?.startsWith('`') && part?.endsWith('`')) {
        return <code key={index} className="bg-gray-200 text-red-600 px-1 rounded">{part.slice(1, -1)}</code>;
      }
      
      return part;
    });
  };

  const renderMessageContent = (content) => {
    // Extract citations and their texts first
    const citationTexts = {};
    const citationRegex = /\[(\d+)\]:\s*"([^"]+)"/g;
    
    // Find all citations and their texts at the bottom of the message
    const contentWithoutCitations = content.replace(/\n\[(\d+)\]:\s*"([^"]+)"/g, (match, number, text) => {
      citationTexts[number] = text.trim();
      return '';
    });
    
    // Split the content into paragraphs
    const paragraphs = contentWithoutCitations.split('\n\n');
    
    return paragraphs.map((paragraph, pIndex) => {
      // Check if this is a numbered list section
      if (paragraph.includes('1.') && paragraph.includes('2.')) {
        const items = paragraph.split(/(?=\d+\.\s)/).filter(Boolean);
        
        return (
          <ol key={pIndex} start="1" className="list-decimal list-outside mb-4 pl-6 space-y-2">
            {items.map((item, itemIndex) => {
              const itemContent = item.replace(/^\d+\.\s/, '').trim();
              return (
                <li key={itemIndex} value={itemIndex + 1} className="pl-2">
                  {renderInlineFormatting(itemContent, citationTexts)}
                </li>
              );
            })}
          </ol>
        );
      }
      
      // Regular paragraph
      return <p key={pIndex} className="mb-4">{renderInlineFormatting(paragraph, citationTexts)}</p>;
    });
  };

  useEffect(() => {
    // Add initial welcome message only if messages array is empty
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
    
    const messageText = input.trim(); // Store the input before clearing
    setInput(''); // Clear input immediately after submission
    
    await onSubmit(messageText); // Use the stored message text
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
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    <div className="text-sm">
                      {renderMessageContent(message.content)}
                    </div>
                  </div>
                  <div className={`text-xs ${
                    message.role === 'user' ? 'text-right text-blue-600' : 'text-left text-gray-500'
                  }`}>
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
            placeholder={isLoading ? "Please wait..." : "Type your question here..."}
            className="flex-grow rounded-full border-gray-200 hover:border-gray-300 focus:border-blue-500"
          />
          <Button
            type="primary"
            htmlType="submit"
            icon={<SendOutlined />}
            disabled={isLoading || !input.trim()}
            className={`rounded-full flex items-center justify-center w-10 h-10 !p-0 ${
              isLoading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          />
        </form>
      </div>
    </div>
  );
};

export default ChatWindow; 