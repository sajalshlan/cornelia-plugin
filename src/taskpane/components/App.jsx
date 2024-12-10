import React, { useState, useCallback, useEffect, useRef } from 'react';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import Login from './Login';
import { Layout, Button, Space, Spin, Typography, Select, Radio, Card, Tag, message, Modal, Input } from 'antd';
import { 
  FileSearchOutlined, 
  CommentOutlined, 
  MessageOutlined,
  ArrowLeftOutlined, 
  CheckCircleOutlined, 
  WarningOutlined, 
  ExclamationCircleOutlined,
  EditOutlined,
  InfoCircleOutlined,
  CloseOutlined,
  RedoOutlined,
  CheckOutlined,
  BulbOutlined
} from '@ant-design/icons';
import DocumentSummary from './DocumentSummary';
import CommentList from './CommentList';
import ChatWindow from './ChatWindow';
import { logger } from '../../api';
import '../styles/components.css';
import { performAnalysis, explainText, redraftText } from '../../api';
import ClauseAnalysis from './ClauseAnalysis';
import { analyzeDocumentClauses } from '../../api';
import { analyzeParties, brainstormChat } from '../../api';
const { Text } = Typography;

const { Content } = Layout;

const AppContent = () => {
  const { isAuthenticated, isLoading, logout } = useAuth();

  // Add logout handler
  const handleLogout = () => {
    logout();
    message.success('Successfully logged out');
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Login />;
  }

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

  // Add this near other state declarations
  const [clauseAnalysisCounts, setClauseAnalysisCounts] = useState({
    acceptable: 0,
    risky: 0,
    missing: 0
  });

  // Add these near other state declarations in App.jsx
  const [isRedraftModalVisible, setIsRedraftModalVisible] = useState(false);
  const [redraftContent, setRedraftContent] = useState('');
  const [selectedClause, setSelectedClause] = useState(null);
  const [generatedRedraft, setGeneratedRedraft] = useState(null);
  const [generatingRedrafts, setGeneratingRedrafts] = useState(new Map());
  const [redraftedClauses, setRedraftedClauses] = useState(new Set());
  const [redraftedTexts, setRedraftedTexts] = useState(new Map());
  const [redraftReviewStates, setRedraftReviewStates] = useState(new Map());

  // Add new state near other state declarations
  const [selectedText, setSelectedText] = useState('');

  // Add new state variables
  const [isExplaining, setIsExplaining] = useState(false);
  const [explanation, setExplanation] = useState(null);

  // Add new state
  const [commentDraft, setCommentDraft] = useState(null);
  const [isAddingComment, setIsAddingComment] = useState(false);

  const redraftTextAreaRef = useRef(null);
  const { TextArea } = Input;

  // Add near other state declarations
  const [isBrainstormModalVisible, setIsBrainstormModalVisible] = useState(false);
  const [brainstormMessages, setBrainstormMessages] = useState([]);
  const [brainstormLoading, setBrainstormLoading] = useState(false);

  useEffect(() => {
    if (isRedraftModalVisible && redraftTextAreaRef.current) {
      const timer = setTimeout(() => {
        redraftTextAreaRef.current.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isRedraftModalVisible]);

  const HARDCODED_ANALYSIS = {
    "acceptable": [
      {
        "title": "APPOINTMENT OF ESCROW BANK",
        "text": "The Parties hereby appoint Bank of India to act as Escrow Bank on the terms and condition herein contained and to hold the amount in the Escrow Account until the release thereof as specified under this Agreement and the Escrow Bank in consideration of the fees to be paid, accepts such appointment. The Escrow Bank hereby agrees to act as such and to accept all payments and other amounts to be delivered to or held by the Escrow Bank pursuant to the terms of this Agreement and to operate the Escrow Account in terms of this Agreement. The duties of the Escrow Bank under this Agreement are purely ministerial, administrative and non-discretionary in nature. Neither Escrow Bank nor any of its directors, officers, agents and employees shall, by reason of anything contained in this Agreement, be deemed to be a trustee for or have any fiduciary relationship with the Company or any other person. If the Escrow Bank has acted in accordance with this Agreement, it shall be deemed to have acted as if instructed to do so by the Company.The Escrow Account shall be non-interest bearing and shall not have any cheque book facility.",
        "explanation": "Clearly defines the role of the Escrow Bank as ministerial and non-discretionary, aligning with the MC's oversight role.  The non-interest bearing and no chequebook stipulations offer basic safeguards."
      },
      {
        "title": "Deposits in the Escrow Account",
        "text": "The SRA agrees and undertakes to deposit the following funds  into the Escrow Account on or before  28th March, 2024. The fund infusion shall be made by the SPV on behalf of the SRA, for the following payments on 30th March 2024:Upfront Payment of INR 68,29,99,450/- (Rupees Sixty-eight Crores, twenty nine lakhs, ninety nine thousand, four hundred and fifty), which shall further be utilized in accordance with this Agreement for making payments towards:unpaid CIRP Costs, if any, as conveyed to the Successful Resolution Applicant by the Monitoring Committee with a copy to the Escrow Bank; Upfront Payment as per the Resolution Plan.Further, on or before   28th March, 2024, the SRA/SPV shall further infuse in the Escrow Account, the funds equivalent to the unpaid Monitoring Committee expenses, if any, as conveyed to the Successful Resolution Applicant by the Monitoring Committee with a copy to the Escrow Bank.It is agreed that the Company may remit the funds infused into it by the Successful Resolution Applicant (through the SPV) by way of any one or more of share subscription money/ OCD/ any other instrument), to the Escrow Account. The SPV also retains the right to remit the funds into the escrow directly.",
        "explanation": "Specifies the amounts and timelines for deposits, including reimbursement of MC expenses, which is crucial for the MC."
      },
      {
        "title": "Withdrawals from the Escrow Account",
        "text": "The Monitoring Committee may instruct the Escrow Bank to make the following payments [List of payments a-i]. The name, account numbers of the recipients and amounts payable to each such recipient for each of the above payments shall be provided to the Escrow Bank at least 48 hours prior to the proposed date of payment by the Monitoring Committee in such form as the Escrow Bank requires.",
        "explanation": "Grants the MC control over disbursement instructions, which is essential for their plan implementation oversight."
      },
      {
        "title": "TERMS AND CONDITIONS",
        "text": "Subject to Clause 3.4.2 above, Escrow Bank to act on joint instructions of representative of the Committee of Creditors and the representative of the Successful Resolution Applicant (such representatives to implement the instructions of the Monitoring Committee, as per Clause 5.17 of the approved Resolution Plan), to distribute payments to creditors in accordance with this Agreement.",
        "explanation": "Reinforces the MC's authority by requiring their instructions to be implemented by representatives, even with joint signatories."
      },
      {
        "title": "FEES",
        "text": "In consideration of Escrow Bank acting as Escrow Bank in terms of this Agreement, the First Party shall pay to Escrow Bank the fee net of all taxes plus all out-of-pocket expenses incurred by Escrow Bank as agreed between the Parties.",
        "explanation": "Ensures clarity on fee payment responsibility."
      }
    ],
    "risky": [
      {
        "title": "WHEREAS",
        "text": "It is understood that the required resolutions shall be passed by the Monitoring Committee upon infusion of the Upfront Payment in the Escrow Account for the successful transfer of control of the Company to the SPV, i.e. in line with the implementation of the Resolution Plan, the SPV must hold 90% of equity and identified financial creditors must hold 5%, while the public would hold balance 5% equity stake, while the existing promoters' shares must to be extinguished. Provided, however, the distribution of Upfront Payment shall be made irrespective of whether the shares are allotted to the SPV and the financial creditors.",
        "explanation": "Distribution of Upfront Payment irrespective of share allotment to SPV and FCs creates a risk for the MC.  This decoupling could lead to complications if the share transfer doesn't occur as planned."
      },
      {
        "title": "Withdrawals from the Escrow Account",
        "text": "Notwithstanding anything contained in this Agreement, the Escrow Agent shall be entitled to make the transfers on the dates provided in Schedule III, even if it does not receive the instructions for such remittance from the Monitoring Committee.",
        "explanation": "This overrides the MC's control over disbursements and is a significant risk. The Escrow Agent should *always* require MC instruction."
      },
      {
        "title": "INDEMNITIES AND RELEASES",
        "text": "The Successful Resolution Applicant shall indemnify and keep indemnified the Escrow Bank...[for various liabilities].",
        "explanation": "While indemnification of the Escrow Bank is standard, the MC should also be indemnified by the SRA for any losses arising from SRA actions or inactions related to the escrow."
      }
    ],
    "missing": [
      {
        "title": "Dispute Resolution Mechanism for Escrow-Related Issues",
        "text": "N/A",
        "explanation": "The agreement lacks a clear process for resolving disputes specifically related to the escrow, such as disagreements over disbursement instructions or interpretation of the agreement's terms.  A dedicated mechanism is needed to avoid delays and potential litigation."
      },
      {
        "title": "Successor Escrow Agent Appointment Process",
        "text": "N/A",
        "explanation": "While termination mentions successor appointment, it lacks detail. A robust process, including MC approval rights, is crucial for continuity."
      },
      {
        "title": "Specific Performance Clause",
        "text": "N/A",
        "explanation": "Given the criticality of timely payments under the resolution plan, a specific performance clause would strengthen the MC's ability to enforce the SRA's obligations related to the escrow."
      },
      {
        "title": "Audit Rights for the Escrow Account",
        "text": "N/A",
        "explanation": "The MC should have explicit rights to audit the Escrow Account to ensure transparency and compliance with the agreement."
      }
    ]
  };

  const HARDCODED_PARTIES = {
    "parties": [
      {
        "name": "Monitoring Committee of McNally Bharat Engineering Company Limited",
        "role": "Oversees implementation of the resolution plan"
      },
      {
        "name": "BTL EPC Limited",
        "role": "Successful Resolution Applicant (SRA)"
      },
      {
        "name": "Mandal Vyapaar Pvt Limited",
        "role": "Special Purpose Vehicle (SPV) for implementing the resolution plan on behalf of the SRA"
      },
      {
        "name": "Bank of India",
        "role": "Escrow Bank/Agent"
      }
    ]
  };


  // Add new state variables
  const [parties, setParties] = useState([]);
  const [isLoadingParties, setIsLoadingParties] = useState(true);
  const [selectedParty, setSelectedParty] = useState(null);

  // Add this function near the top of your component
  const getTagColor = (role) => {
    switch (role?.toLowerCase()) {
      case 'first party':
        return 'blue';
      case 'second party/successful resolution applicant (sra)':
        return 'purple';
      case 'escrow bank':
        return 'green';
      case 'spv (special purpose vehicle)':
        return 'orange';
      case 'company/corporate debtor':
        return 'red';
      default:
        return 'default';
    }
  };

  // Modify the existing initialDocumentLoad function
  const initialDocumentLoad = useCallback(async () => {
    try {
      await Word.run(async (context) => {
        const body = context.document.body;
        const docComments = context.document.body.getComments();
        
        body.load("text");
        docComments.load("items");
        await context.sync();
        
        setDocumentContent(body.text);
        
        // Enhanced parties analysis handling
        try {
          setIsLoadingParties(true);
          // const result = await analyzeParties(body.text);
          // // logger.info('Parties result:', result);
          // // Parse the string result into an object
          // let parsedResult;
          // try {
          //   parsedResult = JSON.parse(result);
          // } catch (parseError) {
          //   logger.error('Error parsing parties result:', parseError);
          //   setParties([]);
          //   return;
          // }
          const parsedResult = HARDCODED_PARTIES;
          // Handle the parsed result
          if (parsedResult && (Array.isArray(parsedResult) || typeof parsedResult === 'object')) {
            const partiesArray = Array.isArray(parsedResult) ? parsedResult : 
                                Array.isArray(parsedResult.parties) ? parsedResult.parties :
                                [];
            
            const validParties = partiesArray
              .filter(party => party && party.name)
              .map(party => ({
                name: party.name,
                role: party.role || 'Unknown Role',
              }));
              
            setParties(validParties);
          } else {
            logger.warn('Invalid parties analysis result structure:', parsedResult);
            setParties([]);
          }
        } catch (error) {
          logger.error('Error analyzing parties:', error);
          setParties([]);
        } finally {
          setIsLoadingParties(false);
        }
        
      });
    } catch (error) {
      logger.error("Error in initial document load:", error);
      setParties([]);
      setIsLoadingParties(false);
    }
  }, []);

  // Separate function for polling updates
  const pollDocumentUpdates = useCallback(async () => {
    try {
      await Word.run(async (context) => {
        const docComments = context.document.body.getComments();
        docComments.load("items");
        await context.sync();
        
        // Load all properties for comments including content and ranges
        docComments.items.forEach(comment => {
          comment.load(["id", "authorName", "content", "creationDate", "replies", "resolved"]);
          const range = comment.getRange();
          range.load("text");
        });
        await context.sync();

        const processedComments = await Promise.all(docComments.items.map(async comment => {
          // Get the actual text from the document for this comment
          const range = comment.getRange();
          await context.sync();
          
          return {
            id: comment.id,
            content: comment.content || '',
            documentText: range.content, // Store both comment content and actual document text
            author: comment.authorName || 'Unknown Author',
            authorEmail: comment.authorEmail || '',
            resolved: comment.resolved || false,
            date: comment.creationDate ? new Intl.DateTimeFormat('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              timeZoneName: 'short'
            }).format(new Date(comment.creationDate)) : new Date().toLocaleString(),
            replies: comment.replies ? comment.replies.items.map(reply => ({
              id: reply.id,
              content: reply.content || '',
              author: reply.authorName || 'Unknown Author',
              date: reply.creationDate ? new Intl.DateTimeFormat('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                timeZoneName: 'short'
              }).format(new Date(reply.creationDate)) : new Date().toLocaleString(),
            })) : []
          };
        }));

        // Separate resolved and unresolved comments
        const unresolvedComments = processedComments.filter(comment => !comment.resolved);
        const resolvedComments = processedComments.filter(comment => comment.resolved);

        // Update states with the latest content from Word
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

  const handleChangeParty = useCallback(() => {
    setClauseAnalysis(null);
    setSelectedParty(null);
    setClauseAnalysisCounts({
      acceptable: 0,
      risky: 0,
      missing: 0
    });
  }, []);

  // Add new function to handle text selection
  const handleTextSelection = useCallback(async () => {
    try {
      await Word.run(async (context) => {
        const selection = context.document.getSelection();
        selection.load('text');
        await context.sync();
        setSelectedText(selection.text.trim());
      });
    } catch (error) {
      logger.error('Error getting selected text:', error);
      setSelectedText('');
    }
  }, []);

  // Add useEffect to listen for selection changes
  useEffect(() => {
    const handleSelectionChange = () => {
      handleTextSelection();
    };

    // Add event listener when component mounts
    Office.context.document.addHandlerAsync(
      Office.EventType.DocumentSelectionChanged,
      handleSelectionChange
    );

    // Remove event listener when component unmounts
    return () => {
      Office.context.document.removeHandlerAsync(
        Office.EventType.DocumentSelectionChanged,
        handleSelectionChange
      );
    };
  }, [handleTextSelection]);

  // Update the handleExplain function
  const handleExplain = async () => {
    if (!selectedText || !documentContent) return;

    setIsExplaining(true);
    try {
      const result = await explainText(selectedText, documentContent);
      
      if (result) {
        setExplanation({
          text: selectedText,
          explanation: result,
          timestamp: new Date().toISOString()
        });
      } else {
        message.error('Failed to get explanation');
      }
    } catch (error) {
      logger.error('Error in explain text:', error);
      message.error('Failed to get explanation: ' + (error.response?.data?.error || error.message));
    } finally {
      setIsExplaining(false);
    }
  };

  // Add the redraft handler
  const handleRedraft = async () => {
    if (!selectedText) return;
    
    try {
      setGeneratingRedrafts(prev => new Map(prev).set(selectedText, true));
      setIsRedraftModalVisible(false); // Close modal if open
      
      const result = await redraftText(
        selectedText,
        documentContent,
        redraftContent // Optional instructions
      );
      
      if (result) {
        setGeneratedRedraft({
          originalText: selectedText,
          redraftedText: result,
          instructions: redraftContent,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      logger.error('Error generating redraft:', error);
      message.error('Failed to generate redraft: ' + error.message);
    } finally {
      setGeneratingRedrafts(prev => {
        const newMap = new Map(prev);
        newMap.delete(selectedText);
        return newMap;
      });
      setRedraftContent(''); // Clear instructions after use
    }
  };

  // Add the accept redraft handler
  const handleAcceptRedraft = async () => {
    if (!generatedRedraft) return;
    
    try {
      await Word.run(async (context) => {
        const selection = context.document.getSelection();
        selection.insertText(generatedRedraft.redraftedText, Word.InsertLocation.replace);
        await context.sync();
        
        setRedraftedTexts(prev => new Map(prev).set(generatedRedraft.originalText, generatedRedraft.redraftedText));
        setGeneratedRedraft(null);
        message.success('Redraft applied successfully');
      });
    } catch (error) {
      logger.error('Error applying redraft:', error);
      message.error('Failed to apply redraft: ' + error.message);
    }
  };

  // Add handleComment function
  const handleAddComment = async () => {
    if (!commentDraft?.text || !selectedText) return;
    
    try {
      setIsAddingComment(true);
      
      await Word.run(async (context) => {
        const selection = context.document.getSelection();
        selection.load('text');
        await context.sync();
        
        const comment = selection.insertComment(commentDraft.text);
        comment.load('id');
        await context.sync();
        
        message.success('Comment added successfully');
        setCommentDraft(null);
      });
    } catch (error) {
      logger.error('Error adding comment:', error);
      message.error('Failed to add comment: ' + error.message);
    } finally {
      setIsAddingComment(false);
    }
  };

  const handleBrainstormSubmit = async (messageText) => {
    try {
      setBrainstormLoading(true);
      
      // Add user message
      setBrainstormMessages(prev => [...prev, {
        role: 'user',
        content: messageText,
        timestamp: new Date().toLocaleTimeString()
      }]);

      // Call the brainstorm API
      const result = await brainstormChat(
        messageText,
        selectedText,
        '', // No analysis for direct selection
        documentContent
      );

      if (result) {
        setBrainstormMessages(prev => [...prev, {
          role: 'assistant',
          content: result,
          timestamp: new Date().toLocaleTimeString()
        }]);
      }
    } catch (error) {
      logger.error('Error in brainstorm:', error);
      setBrainstormMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an error while processing your request.',
        isError: true,
        timestamp: new Date().toLocaleTimeString()
      }]);
    } finally {
      setBrainstormLoading(false);
    }
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
            ) : !selectedParty || !clauseAnalysis ? (
              <div className="flex flex-col items-center justify-center">
                <Text className="mb-4">Please select a party from the home screen to start analysis</Text>
                <Button 
                  type="primary"
                  icon={<ArrowLeftOutlined />}
                  onClick={() => setActiveView(null)}
                >
                  Return to Home
                </Button>
              </div>
            ) : (
              <ClauseAnalysis 
                results={clauseAnalysis} 
                loading={clauseAnalysisLoading}
                selectedParty={selectedParty}
                getTagColor={getTagColor}
                onChangeParty={handleChangeParty}
                isRedraftModalVisible={isRedraftModalVisible}
                redraftContent={redraftContent}
                selectedClause={selectedClause}
                generatedRedraft={generatedRedraft}
                generatingRedrafts={generatingRedrafts}
                redraftedClauses={redraftedClauses}
                redraftedTexts={redraftedTexts}
                redraftReviewStates={redraftReviewStates}
                onRedraftModalVisibility={handleRedraftModalVisibility}
                onRedraftContentChange={handleRedraftContentChange}
                onSelectedClauseChange={handleSelectedClauseChange}
                onGeneratingRedraftsChange={handleGeneratingRedraftsChange}
                onRedraftedClausesChange={handleRedraftedClausesChange}
                onRedraftedTextsChange={handleRedraftedTextsChange}
                onRedraftReviewStatesChange={handleRedraftReviewStatesChange}
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

            {/* Actions Panel Card */}
            <div className="px-4">
              <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100 hover:border-blue-400 hover:shadow-md transition-all duration-200">
                <div className="flex items-center gap-3">
                  <Button
                    type="default"
                    icon={<CommentOutlined />}
                    className="flex items-center gap-2 !px-4 !h-9"
                    disabled={!selectedText}
                    onClick={() => {
                      setCommentDraft({
                        text: '',
                        timestamp: new Date().toISOString()
                      });
                    }}
                  >
                    Comment
                  </Button>
                  <Button
                    type="default"
                    icon={<InfoCircleOutlined />}
                    className="flex items-center gap-2 !px-4 !h-9"
                    disabled={!selectedText}
                    loading={isExplaining}
                    onClick={handleExplain}
                  >
                    {isExplaining ? 'Explaining...' : 'Explain'}
                  </Button>
                  <Button
                    type="default"
                    icon={<EditOutlined />}
                    className="flex items-center gap-2 !px-4 !h-9"
                    disabled={!selectedText}
                    loading={generatingRedrafts.get(selectedText)}
                    onClick={() => {
                      setRedraftContent('');
                      setIsRedraftModalVisible(true);
                    }}
                  >
                    {generatingRedrafts.get(selectedText) ? 'Redrafting...' : 'Redraft'}
                  </Button>
                  <Button
                    type="default"
                    icon={<BulbOutlined />}
                    className="flex items-center gap-2 !px-4 !h-9"
                    disabled={!selectedText}
                    onClick={() => {
                      setIsBrainstormModalVisible(true);
                      setBrainstormMessages([]);
                    }}
                  >
                    Brainstorm
                  </Button>
                </div>
              </div>
            </div>

            {/* Explanation Preview Card */}
            {explanation && (
              <div className="px-4 mt-2">
                <div className="bg-gray-50 rounded-xl shadow-sm p-4 border border-gray-100">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <Text type="secondary" className="text-xs">
                        Explanation
                      </Text>
                      <Button 
                        type="text" 
                        size="small"
                        className="!text-gray-400 hover:!text-gray-600"
                        icon={<CloseOutlined />}
                        onClick={() => setExplanation(null)}
                      />
                    </div>
                    
                    <div className="bg-white rounded p-3 border border-gray-100">
                      <div className="mt-1 text-sm border-l-2 border-green-400 pl-3">
                        {explanation.explanation}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Redraft Preview Card */}
            {generatedRedraft && (
              <div className="px-4 mt-2">
                <div className="bg-gray-50 rounded-xl shadow-sm p-4 border border-gray-100">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <Text type="secondary" className="text-xs">
                        Redraft Suggestion
                      </Text>
                      <Button 
                        type="text" 
                        size="small"
                        className="!text-gray-400 hover:!text-gray-600"
                        icon={<CloseOutlined />}
                        onClick={() => setGeneratedRedraft(null)}
                      />
                    </div>
                    
                    <div className="bg-white rounded p-3 border border-gray-100">
                      <div className="mt-1 text-sm border-l-2 border-green-400 pl-3">
                        {generatedRedraft.redraftedText}
                      </div>
                    </div>
                    
                    <div className="flex justify-end gap-2 mt-2">
                      <Button 
                        size="small"
                        type="text"
                        className="text-gray-500 hover:text-gray-700"
                        icon={<RedoOutlined />}
                        onClick={() => {
                          setRedraftContent(''); // Clear previous instructions
                          setIsRedraftModalVisible(true); // Show instructions modal
                        }}
                      >
                        Regenerate
                      </Button>
                      <Button 
                        type="primary"
                        size="small"
                        icon={<CheckOutlined />}
                        onClick={handleAcceptRedraft}
                      >
                        Accept
                      </Button>
                    </div>
                    
                  </div>
                </div>
              </div>
            )}

            {/* Comment Preview Card */}
            {commentDraft && (
              <div className="px-4 mt-2">
                <div className="bg-gray-50 rounded-xl shadow-sm p-4 border border-gray-100">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <Text type="secondary" className="text-xs">
                        New Comment
                      </Text>
                      <Button 
                        type="text" 
                        size="small"
                        className="!text-gray-400 hover:!text-gray-600"
                        icon={<CloseOutlined />}
                        onClick={() => setCommentDraft(null)}
                      />
                    </div>
                    
                    <div className="bg-white rounded p-3 border border-gray-100">
                      <TextArea
                        value={commentDraft.text}
                        onChange={(e) => setCommentDraft(prev => ({
                          ...prev,
                          text: e.target.value
                        }))}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            if (commentDraft.text.trim()) {
                              handleAddComment();
                            }
                          }
                        }}
                        placeholder="Type your comment here..."
                        autoFocus
                        className="mt-2 border-none focus:shadow-none"
                        rows={3}
                      />
                    </div>
                    <div className="flex justify-end mt-2">
                      <Button 
                        type="primary"
                        size="small"
                        icon={<CheckOutlined />}
                        loading={isAddingComment}
                        disabled={!commentDraft.text.trim()}
                        onClick={handleAddComment}
                      >
                        Add Comment
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Analysis Card */}
            <div className="px-4">
              <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100 hover:border-blue-400 hover:shadow-md transition-all duration-200">
                <div className="flex flex-col custom-flex-row items-center justify-between gap-4">
                  <div className="w-full">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xl font-semibold text-gray-800 m-0">Clause Analysis</h3>
                      
                      {/* Only show party selection if we don't have analysis results */}
                      {!clauseAnalysis && (
                        isLoadingParties ? (
                          <Button loading className="w-[200px]">
                            Analyzing Parties...
                          </Button>
                        ) : clauseAnalysisLoading ? (
                          <div className="flex items-center gap-2">
                            <Spin />
                            <span className="text-gray-600">Analyzing document...</span>
                          </div>
                        ) : (
                          <Select
                            placeholder="Select a party"
                            style={{ width: 300 }}
                            options={parties?.map(party => ({
                              value: party.name,
                              label: (
                                <div style={{ 
                                  display: 'flex', 
                                  flexDirection: 'column', 
                                  gap: '4px',
                                  width: '100%',
                                  maxWidth: '280px' // Leave some space for the dropdown arrow
                                }}>
                                  <span style={{ 
                                    fontWeight: 500,
                                    wordWrap: 'break-word',
                                    whiteSpace: 'normal',
                                    lineHeight: '1.4'
                                  }}>
                                    {party.name}
                                  </span>
                                  <Tag color={getTagColor(party.role)} style={{
                                    maxWidth: '100%',
                                    whiteSpace: 'normal',
                                    height: 'auto',
                                    padding: '2px 8px',
                                    lineHeight: '1.4'
                                  }}>
                                    {party.role || 'Unknown Role'}
                                  </Tag>
                                </div>
                              )
                            }))}
                            listItemHeight={80} // Increase height for wrapped content
                            listHeight={400} // Increase dropdown height
                            optionRender={(option) => (
                              <div style={{ 
                                padding: '8px',
                                width: '100%',
                                wordBreak: 'break-word'
                              }}>
                                {option.data.label}
                              </div>
                            )}
                            onChange={async (value) => {
                              const selectedParty = parties.find(p => p.name === value);
                              setSelectedParty(selectedParty);
                              try {
                                setClauseAnalysisLoading(true);
                                // const result = await analyzeDocumentClauses(documentContent, {
                                //   name: selectedParty.name,
                                //   role: selectedParty.role
                                // });

                                // // If result is null or undefined, throw error
                                // if (!result) {
                                //   throw new Error('No analysis results received');
                                // }

                                // // Handle different result types
                                // let parsedResult;
                                // if (typeof result === 'string') {
                                //   try {
                                //     parsedResult = JSON.parse(result);
                                //   } catch (parseError) {
                                //     logger.error('JSON Parse error:', {
                                //       error: parseError,
                                //       result: result?.substring(0, 100) // Log first 100 chars
                                //     });
                                //     throw new Error('Invalid JSON response');
                                //   }
                                // } else if (typeof result === 'object') {
                                //   parsedResult = result;
                                // } else {
                                //   throw new Error('Unexpected result type');
                                // }

                                // // Validate structure
                                // if (!parsedResult || !parsedResult.acceptable || !parsedResult.risky || !parsedResult.missing) {
                                //   throw new Error('Invalid analysis result structure');
                                // }
                                const parsedResult = HARDCODED_ANALYSIS;

                                // Store the parsed result
                                setClauseAnalysis(parsedResult);
                                
                                // Set counts
                                setClauseAnalysisCounts({
                                  acceptable: parsedResult.acceptable.length || 0,
                                  risky: parsedResult.risky.length || 0,
                                  missing: parsedResult.missing.length || 0
                                });

                              } catch (error) {
                                logger.error('Clause analysis failed:', error);
                                message.error(`Analysis failed: ${error.message}`);
                                setClauseAnalysis(null);
                              } finally {
                                setClauseAnalysisLoading(false);
                              }
                            }}
                          />
                        )
                      )}

                      {/* Show View Analysis button if we have analysis results */}
                      {selectedParty && clauseAnalysis && !clauseAnalysisLoading && (
                        <Button
                          type="primary"
                          className="!bg-green-600 !hover:bg-green-700 !border-green-600 !text-white !px-6 !h-9 !text-sm !font-medium"
                          icon={<FileSearchOutlined className="text-lg" />}
                          onClick={() => setActiveView('analysis')}
                        >
                          View Analysis
                        </Button>
                      )}
                    </div>
                    
                    {/* Show analysis counts */}
                    {selectedParty && clauseAnalysis && !clauseAnalysisLoading && (
                      <div className="flex items-center gap-6 mb-4">
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
                            <div className="text-sm text-yellow-600">Review</div>
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
                    )}
                  </div>
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

            {/* Redraft Instructions Modal */}
            <Modal
              title={
                <div className="modal-title">
                  <EditOutlined className="modal-icon" />
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
                  onClick={() => {
                    setIsRedraftModalVisible(false);
                    handleRedraft();
                  }}
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
                onChange={(e) => setRedraftContent(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    setIsRedraftModalVisible(false);
                    handleRedraft();
                  }
                }}
                placeholder="Give instructions for your redraft..."
                className="redraft-textarea"
                autoFocus
              />
            </Modal>

            {/* Add this modal near other modals */}
            <Modal
              title={
                <div className="modal-title text-sm sm:text-base">
                  <BulbOutlined className="modal-icon text-purple-500" />
                  <span>Brainstorm Solutions</span>
                </div>
              }
              open={isBrainstormModalVisible}
              onCancel={() => {
                setIsBrainstormModalVisible(false);
                setBrainstormMessages([]);
              }}
              footer={null}
              width="90vw"
              className="sm:max-w-[800px] brainstorm-modal"
            >
              <div className="flex flex-col h-[600px]">
                <div className="mb-4 p-3 bg-gray-50 rounded">
                  <Text strong>Selected Text:</Text>
                  <div className="mt-2">{selectedText}</div>
                </div>
                <div className="flex-1 border rounded-lg overflow-hidden">
                  <ChatWindow
                    documentContent={documentContent}
                    messages={brainstormMessages}
                    setMessages={setBrainstormMessages}
                    isLoading={brainstormLoading}
                    onSubmit={handleBrainstormSubmit}
                  />
                </div>
              </div>
            </Modal>
          </div>
        );
    }
  };

  // Add these near other handler functions
  const handleRedraftModalVisibility = (visible) => {
    setIsRedraftModalVisible(visible);
  };

  const handleRedraftContentChange = (content) => {
    setRedraftContent(content);
  };

  const handleSelectedClauseChange = (clause) => {
    setSelectedClause(clause);
  };

  const handleGeneratingRedraftsChange = (drafts) => {
    setGeneratingRedrafts(drafts);
  };

  const handleRedraftedClausesChange = (clauses) => {
    setRedraftedClauses(clauses);
  };

  const handleRedraftedTextsChange = (texts) => {
    setRedraftedTexts(texts);
  };

  const handleRedraftReviewStatesChange = (states) => {
    setRedraftReviewStates(states);
  };

  return (
    <Layout className="h-screen">
      <div className="flex justify-between items-center p-4 bg-white border-b">
        <div className="flex items-center gap-3">
          {(activeView === 'chat' || activeView === 'analysis') && (
            <Button
              onClick={() => setActiveView('home')}
              type="text"
              className="flex items-center !p-2 hover:bg-gray-50 rounded-full"
              icon={<ArrowLeftOutlined />}
            />
          )}
          <Text strong className="text-lg">
            {activeView === 'chat' 
              ? 'Chat with Cornelia' 
              : activeView === 'analysis' 
                ? 'Clause Analysis' 
                : 'Cornelia'}
          </Text>
        </div>
        <Button 
          onClick={handleLogout}
          type="link" 
          danger
          className="hover:text-red-600"
        >
          Logout
        </Button>
      </div>
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

const App = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;