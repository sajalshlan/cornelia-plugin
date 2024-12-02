import React, { useState, useEffect, useCallback } from 'react';
import { Layout, Button, Space, Spin, Typography } from 'antd';
import { 
  FileSearchOutlined, 
  CommentOutlined, 
  MessageOutlined,
  ArrowLeftOutlined,
  CheckCircleOutlined, 
  WarningOutlined, 
  ExclamationCircleOutlined 
} from '@ant-design/icons';
import DocumentSummary from './DocumentSummary';
import CommentList from './CommentList';
import ChatWindow from './ChatWindow';
import { logger } from '../../api';
import '../styles/components.css';
import { performAnalysis } from '../../api';
import ClauseAnalysis from './ClauseAnalysis';
import { analyzeDocumentClauses } from '../../api';
const { Text } = Typography;

const { Content } = Layout;

const App = () => {
  const [activeView, setActiveView] = useState(null);
  const [documentContent, setDocumentContent] = useState('');
  const [summary, setSummary] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [comments, setComments] = useState([]);
  const [initialResolvedComments, setInitialResolvedComments] = useState([]);
  
  // Add loading states
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryProgress, setSummaryProgress] = useState(0);
  const [summaryError, setSummaryError] = useState(null);

  // Add chat loading states
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState(null);

  // Add home summary loading states
  const [homeSummaryLoading, setHomeSummaryLoading] = useState(false);
  const [homeSummaryReady, setHomeSummaryReady] = useState(false);

  // Add new state variables
  const [clauseAnalysis, setClauseAnalysis] = useState(null);
  const [clauseAnalysisLoading, setClauseAnalysisLoading] = useState(false);

  // Add new state for tracking initial load
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);

  // Add this near other state declarations
  const [clauseAnalysisCounts, setClauseAnalysisCounts] = useState({
    acceptable: 0,
    risky: 0,
    missing: 0
  });

  // Separate function for initial document load
  const initialDocumentLoad = useCallback(async () => {
    try {
      await Word.run(async (context) => {
        const body = context.document.body;
        const docComments = context.document.body.getComments();
        
        body.load("text");
        docComments.load("items");
        await context.sync();
        
        setDocumentContent(body.text);
        
        // Only perform clause analysis on initial load
        if (!initialLoadComplete && !clauseAnalysis) {
          try {
            setClauseAnalysisLoading(true);
            const result = await analyzeDocumentClauses(body.text);
            setClauseAnalysis(result);
            
            // Parse results and set counts
            const parsedResults = JSON.parse(result);
            setClauseAnalysisCounts({
              acceptable: parsedResults.acceptable?.length || 0,
              risky: parsedResults.risky?.length || 0,
              missing: parsedResults.missing?.length || 0
            });
          } catch (error) {
            console.error('Clause analysis failed:', error);
          } finally {
            setClauseAnalysisLoading(false);
          }
        }

        // Process comments...
        // [Existing comment processing code]
        
        setInitialLoadComplete(true);
      });
    } catch (error) {
      logger.error("Error in initial document load:", error);
    }
  }, [initialLoadComplete, clauseAnalysis]);

  // Separate function for polling updates
  const pollDocumentUpdates = useCallback(async () => {
    try {
      await Word.run(async (context) => {
        const docComments = context.document.body.getComments();
        docComments.load("items");
        await context.sync();
        
        // Only process comments during polling
        // [Existing comment processing code]
        // Load all properties for comments including replies and resolved status
        docComments.items.forEach(comment => {
          comment.load(["id", "authorName", "text", "created", "replies", "resolved"]);
        });
        await context.sync();

        const processedComments = docComments.items.map(comment => ({
          id: comment.id,
          content: comment.content || '',
          author: comment.authorName || 'Unknown Author',
          authorEmail: comment.authorEmail || '',
          resolved: comment.resolved || false,
          date: comment.created ? new Date(comment.created).toISOString() : new Date().toISOString
          (),
          replies: comment.replies ? comment.replies.items.map(reply => ({
            id: reply.id,
            content: reply.content || '',
            author: reply.authorName || 'Unknown Author',
            date: reply.created ? new Date(reply.created).toISOString() : new Date().toISOString(),
          })) : []
        }));

        // Separate resolved and unresolved comments
        const unresolvedComments = processedComments.filter(comment => !comment.resolved);
        const resolvedComments = processedComments.filter(comment => comment.resolved);

        // Batch state updates
        setComments(unresolvedComments);
        setInitialResolvedComments(resolvedComments);
      });
    } catch (error) {
      logger.error("Error polling document updates:", error);
    }
  }, []);

    // Update useEffect to use both functions
  useEffect(() => {
    // Initial load
    initialDocumentLoad();

    // Set up polling for comments only
    const pollInterval = setInterval(pollDocumentUpdates, 3000);

    return () => clearInterval(pollInterval);
  }, [initialDocumentLoad, pollDocumentUpdates]);

  // Memoize handlers that update comments
  const handleCommentUpdate = useCallback((updatedComment) => {
    setComments(prevComments => 
      prevComments.map(comment => 
        comment.id === updatedComment.id ? updatedComment : comment
      )
    );
  }, []);

  const handleGenerateSummary = async () => {
    if (!documentContent) {
      setSummaryError('Please read the document first');
      return;
    }

    try {
      setSummaryLoading(true);
      setSummaryError(null);
      
      const result = await performAnalysis(
        'shortSummary', 
        documentContent, 
        'document',
        (fileName, percent) => {
          setSummaryProgress(percent);
        }
      );
      
      if (result) {
        setSummary(result);
      } else {
        throw new Error('No result received from analysis');
      }

    } catch (error) {
      setSummaryError(error.message || 'Analysis failed');
    } finally {
      setSummaryLoading(false);
      setSummaryProgress(0);
    }
  };

  const handleChatSubmit = async (input) => {
    if (!input.trim() || chatLoading) return;

    const newMessage = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toLocaleTimeString()
    };

    setChatMessages(prev => [...prev, newMessage]);
    setChatLoading(true);
    setChatError(null);

    try {
      const result = await performAnalysis('ask', 
        `Document Content:\n${documentContent}\n\nQuestion: ${input}`, 
        'document'
      );

      if (result) {
        setChatMessages(prev => [...prev, {
          role: 'assistant',
          content: result,
          timestamp: new Date().toLocaleTimeString()
        }]);
      }
    } catch (error) {
      console.error('Chat error:', error);
      setChatError(error.message);
      setChatMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date().toLocaleTimeString(),
        isError: true
      }]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleHomeSummaryClick = async () => {
    if (homeSummaryReady) {
      setActiveView('summary');
      return;
    }

    setHomeSummaryLoading(true);
    try {
      const result = await performAnalysis(
        'shortSummary', 
        documentContent, 
        'document',
        (fileName, percent) => {
          setSummaryProgress(percent);
        }
      );
      
      if (result) {
        setSummary(result);
        setHomeSummaryReady(true);
      }
    } catch (error) {
      setSummaryError(error.message || 'Analysis failed');
    } finally {
      setHomeSummaryLoading(false);
    }
  };

  const renderHeader = () => {
    if (activeView) {
      return (
        <div className="flex items-center mb-4 p-4 border-b">
          <Button 
            icon={<ArrowLeftOutlined />} 
            onClick={() => setActiveView(null)}
            className="mr-4"
          />
          <h2 className="m-0 text-lg font-medium">
            {activeView === 'summary' && 'Document Summary'}
            {activeView === 'comments' && 'Document Comments'}
            {activeView === 'chat' && 'Ask Cornelia'}
            {activeView === 'analysis' && 'Clause Analysis'}
          </h2>
        </div>
      );
    }
    return null;
  };

  const renderContent = () => {
    switch (activeView) {
      case 'summary':
        return (
          <DocumentSummary 
            documentContent={documentContent} 
            summary={summary}
            isLoading={summaryLoading}
            progress={summaryProgress}
            error={summaryError}
            onGenerateSummary={handleGenerateSummary}
          />
        );
      case 'comments':
        return <CommentList comments={comments} setComments={setComments} initialResolvedComments={initialResolvedComments} onCommentUpdate={handleCommentUpdate} />;
      case 'chat':
        return (
          <ChatWindow 
            documentContent={documentContent} 
            messages={chatMessages}
            setMessages={setChatMessages}
            isLoading={chatLoading}
            error={chatError}
            onSubmit={handleChatSubmit}
          />
        );
      case 'analysis':
        return (
          <div className="p-4">
            {clauseAnalysisLoading ? (
              <div className="flex flex-col items-center justify-center">
                <Spin size="large" />
                <Text className="mt-4">Analyzing document...</Text>
              </div>
            ) : !clauseAnalysis ? (
              <div className="flex flex-col items-center justify-center">
                <Button 
                  type="primary"
                  icon={<FileSearchOutlined />}
                  onClick={async () => {
                    try {
                      setClauseAnalysisLoading(true);
                      const result = await analyzeDocumentClauses(documentContent);
                      setClauseAnalysis(result);
                    } catch (error) {
                      console.error('Clause analysis failed:', error);
                    } finally {
                      setClauseAnalysisLoading(false);
                    }
                  }}
                >
                  Start Analysis
                </Button>
              </div>
            ) : (
              <ClauseAnalysis 
                results={clauseAnalysis}
                loading={clauseAnalysisLoading}
              />
            )}
          </div>
        );
      default:
        return (
          <div className="flex flex-col h-full space-y-4 py-4">
            {/* Merged Summary & Chat Card */}
            <div className="px-4">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 hover:border-blue-400 hover:shadow-md transition-all duration-200">
                <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-gray-100">
                  {/* Summary Section */}
                  <div className="p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900 m-0">Summary</h3>
                        <p className="text-xs text-gray-500 mt-0.5">Overview your document</p>
                      </div>
                      <Button
                        type="primary"
                        className="flex items-center gap-1.5 !px-4 !h-8 rounded-full bg-blue-500 hover:bg-blue-600 text-sm"
                        icon={<FileSearchOutlined />}
                        onClick={handleHomeSummaryClick}
                        loading={homeSummaryLoading}
                      >
                        {homeSummaryLoading 
                          ? `${summaryProgress > 0 ? `${summaryProgress}%` : 'Loading'}` 
                          : homeSummaryReady 
                            ? 'View' 
                            : 'View'
                        }
                      </Button>
                    </div>
                  </div>

                  {/* Chat Section */}
                  <div className="p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900 m-0">Ask Cornelia</h3>
                        <p className="text-xs text-gray-500 mt-0.5">Get instant answers</p>
                      </div>
                      <Button
                        type="primary"
                        className="flex items-center gap-1.5 !px-4 !h-8 rounded-full bg-blue-500 hover:bg-blue-600 text-sm"
                        icon={<MessageOutlined />}
                        onClick={() => setActiveView('chat')}
                      >
                        Chat
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Analysis Card */}
            <div className="px-4">
              <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100 hover:border-blue-400 hover:shadow-md transition-all duration-200">
                <div className="flex flex-col custom-flex-row items-center justify-between gap-4">
                  <div className="w-full">
                    <h3 className="text-xl font-semibold text-gray-800 m-0">Clause Analysis</h3>
                    
                    {/* Stats Row */} 
                    <div className="flex items-center gap-6 mt-2">
                      {/* Acceptable */}
                      <div className="flex items-center gap-2">
                        <CheckCircleOutlined className="text-md text-green-600" />
                        <div>
                          <span className="text-lg font-semibold text-green-600">{clauseAnalysisCounts.acceptable}</span>
                          <div className="text-sm text-green-600">Acceptable</div>
                        </div>
                      </div>

                      {/* Risky */}
                      <div className="flex items-center gap-2">
                        <WarningOutlined className="text-md text-yellow-600" />
                        <div>
                          <span className="text-lg font-semibold text-yellow-600">{clauseAnalysisCounts.risky}</span>
                          <div className="text-sm text-yellow-600">Risky</div>
                        </div>
                      </div>

                      {/* Missing */}
                      <div className="flex items-center gap-2">
                        <ExclamationCircleOutlined className="text-md text-red-600" />
                        <div>
                          <span className="text-lg font-semibold text-red-600">{clauseAnalysisCounts.missing}</span>
                          <div className="text-sm text-red-600">Missing</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* View Button */}
                  <Button
                    type="primary"
                    className="!bg-green-600 !hover:bg-green-700 !border-green-600 !text-white text-sm whitespace-nowrap"
                    icon={<FileSearchOutlined />}
                    onClick={() => setActiveView('analysis')}
                    loading={clauseAnalysisLoading}
                  >
                    {clauseAnalysisLoading 
                      ? '' 
                      : clauseAnalysis 
                        ? 'View' 
                        : 'Analyze'
                    }
                  </Button>
                </div>
              </div>
            </div>

            {/* Comments Section */}
            <div className="flex-1 px-4 min-h-0">
              <div className="bg-gray-50 rounded-xl p-4 h-full border border-gray-100">
                <h3 className="text-md font-semibold text-gray-800 mb-2">Document Comments</h3>
                <div className="comments-scroll-container">
                  <CommentList 
                    comments={comments} 
                    setComments={setComments} 
                    initialResolvedComments={initialResolvedComments} 
                    onCommentUpdate={handleCommentUpdate} 
                  />
                </div>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <Layout className="h-screen">
      {renderHeader()}
      <Content className="flex-1 overflow-auto bg-gray-100">
        {activeView === 'comments' ? (
          <CommentList 
            comments={comments} 
            setComments={setComments}
            initialResolvedComments={initialResolvedComments}
            onCommentUpdate={handleCommentUpdate}
          />
        ) : (
          renderContent()
        )}
      </Content>
    </Layout>
  );
};

export default App;