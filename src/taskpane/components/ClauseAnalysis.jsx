import React, { useEffect, useState, useRef } from 'react';
import { Collapse, Typography, List, Tag, Spin, Empty, Button, Modal, Input, message, Tooltip } from 'antd';
import { 
  CheckCircleOutlined, 
  WarningOutlined, 
  ExclamationCircleOutlined,
  ReloadOutlined,
  InfoCircleOutlined,
  EditOutlined,
  CloseCircleOutlined,
  SyncOutlined,
  UserOutlined
} from '@ant-design/icons';
import { logger, redraftComment} from '../../api';
import { searchAndReplaceText } from '../utils/wordUtils';

const { Panel } = Collapse;
const { Text, Title, Paragraph } = Typography;
const { TextArea } = Input;

const ClauseAnalysis = React.memo(({ 
  results, 
  loading, 
  selectedParty, 
  getTagColor,
  onChangeParty
}) => {
  const [isRedraftModalVisible, setIsRedraftModalVisible] = useState(false);
  const [redraftContent, setRedraftContent] = useState('');
  const [selectedClause, setSelectedClause] = useState(null);
  const [generatedRedraft, setGeneratedRedraft] = useState(null);
  const redraftTextAreaRef = useRef(null);
  const [generatingRedrafts, setGeneratingRedrafts] = useState(new Map());
  const [redraftedClauses, setRedraftedClauses] = useState(new Set());
  const [redraftedTexts, setRedraftedTexts] = useState(new Map());
  const [redraftReviewStates, setRedraftReviewStates] = useState(new Map());


  const parseResults = (resultsString) => {
    try {
      if (typeof resultsString === 'object' && resultsString !== null) {
        return resultsString;
      }
      
      if (typeof resultsString !== 'string') {
        logger.warn('Results is neither string nor object:', resultsString);
        return { acceptable: [], risky: [], missing: [] };
      }

      const parsed = JSON.parse(resultsString);
      return parsed;
    } catch (error) {
      logger.error('Error parsing analysis results:', {
        error,
        resultsString: resultsString?.substring(0, 100)
      });
      return { acceptable: [], risky: [], missing: [] };
    }
  };

  const parsedResults = parseResults(results);
  const acceptable = parsedResults?.acceptable || [];
  const risky = parsedResults?.risky || [];
  const missing = parsedResults?.missing || [];

  const scrollToClause = async (clauseText) => {
    try {
      await Word.run(async (context) => {
        // Take first 255 characters of the clause text to stay within Word's search limits
        const searchText = clauseText.substring(0, 255);
        
        const searchResults = context.document.body.search(searchText);
        context.load(searchResults);
        await context.sync();

        if (searchResults.items.length > 0) {
          searchResults.items[0].select();
          searchResults.items[0].scrollIntoView();
          
          // Optional: Add highlighting
        //   searchResults.items[0].font.highlightColor = '#FFEB3B';
          
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
      logger.error('Error scrolling to clause:', error);
    }
  };

  const handleRedraft = async () => {
    if (!selectedClause) return;
    
    try {
      // Set loading state for this specific clause
      setGeneratingRedrafts(prev => new Map(prev).set(selectedClause.text, true));
      setIsRedraftModalVisible(false);
      setRedraftContent('');
      
      const documentContent = await Word.run(async (context) => {
        const body = context.document.body;
        body.load("text");
        await context.sync();
        return body.text;
      });

      const result = await redraftComment(
        selectedClause.explanation,
        documentContent,
        selectedClause.text,
        redraftContent.trim()
      );

      if (result) {
        // Update redraft review state for this specific clause
        setRedraftReviewStates(prev => new Map(prev).set(selectedClause.text, {
          text: result,
          clause: selectedClause
        }));
      }
    } catch (error) {
      message.error('Failed to generate redraft: ' + error.message);
    } finally {
      setGeneratingRedrafts(prev => {
        const next = new Map(prev);
        next.delete(selectedClause.text);
        return next;
      });
    }
  };

  const handleRegenerateRedraft = () => {
    setGeneratedRedraft(null);
    setIsRedraftModalVisible(true);
  };

  const handleRejectRedraft = () => {
    setGeneratedRedraft(null);
  };

  const handleAcceptRedraft = async (item) => {
    try {
      await Word.run(async (context) => {
        // Get the current redraft state for this item
        const redraftState = redraftReviewStates.get(item.text);
        if (!redraftState) {
          throw new Error('No redraft found for this clause');
        }

        // Get the text to search for - either the current redrafted text or the original
        const searchText = redraftedTexts.get(item.text) || item.text;
        
        const foundRange = await searchAndReplaceText(context, searchText, redraftState.text);
        if (foundRange) {
          // Update tracking states
          setRedraftedClauses(prev => new Set([...prev, item.text]));
          setRedraftedTexts(prev => new Map(prev).set(item.text, redraftState.text));
          
          // Clear the redraft review state for this item
          setRedraftReviewStates(prev => {
            const next = new Map(prev);
            next.delete(item.text);
            return next;
          });

          message.success('Text redrafted successfully');
        } else {
          throw new Error('Could not find the text to redraft');
        }
      });
    } catch (error) {
      console.error('Error in accept redraft:', error);
      message.error('Failed to redraft: ' + error.message);
    }
  };

  const handleRedraftClick = (item) => {
    setSelectedClause({
      ...item,
      text: redraftedTexts.get(item.text) || item.text
    });
    setIsRedraftModalVisible(true);
    
    // Clear any existing redraft review state for this item
    setRedraftReviewStates(prev => {
      const next = new Map(prev);
      next.delete(item.text);
      return next;
    });
    
    setTimeout(() => {
      redraftTextAreaRef.current?.focus();
    }, 0);
  };

  const handleKeyPress = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleRedraft();
    }
  };

  const renderPartyContext = () => {
    if (!selectedParty) return null;
    
    return (
      <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserOutlined className="text-blue-500" />
            <Text strong>Analyzing from perspective of:</Text>
          </div>
          <Button 
            type="link" 
            onClick={onChangeParty}
            className="text-blue-600 hover:text-blue-800"
          >
            Change Party
          </Button>
        </div>
        <div className="ml-6">
          <Text className="block">{selectedParty.name}</Text>
          <Tag color={getTagColor(selectedParty.role)} className="mt-1">
            {selectedParty.role}
          </Tag>
        </div>
      </div>
    );
  };

  const renderClauseItem = (item, type) => (
    <List.Item 
      className={`bg-white rounded-lg mb-2 p-4 cursor-pointer hover:shadow-md transition-shadow
        ${redraftedClauses.has(item.text) ? 'border-l-4 border-green-500' : ''}`}
      onClick={() => type !== 'missing' && item.text !== 'N/A' && scrollToClause(item.text)}
    >
      <div className="w-full">
        {/* Title and Tags Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
          <Text strong className="text-lg">{item.title}</Text>
          <div className="flex flex-wrap items-center gap-2">
            {redraftedClauses.has(item.text) && (
              <Tag color="success" icon={<CheckCircleOutlined />}>
                Redrafted
              </Tag>
            )}
            <Tag 
              color={type === 'acceptable' ? 'success' : type === 'risky' ? 'warning' : 'error'}
              icon={type === 'acceptable' ? <CheckCircleOutlined /> : type === 'risky' ? <WarningOutlined /> : <ExclamationCircleOutlined />}
            >
              {type === 'acceptable' ? 'Favorable' : type === 'risky' ? 'Needs Review' : 'Missing'}
            </Tag>
          </div>
        </div>
        
        {/* Clause Text Section */}
        {type !== 'missing' && (
          <div className={`mt-3 bg-gray-50 p-3 rounded-lg text-gray-700
            ${redraftedClauses.has(item.text) ? 'border-l-2 border-green-200' : ''}`}>
            <Text>
              {item.text.length > 200 
                ? `${item.text.substring(0, 200)}...` 
                : item.text}
            </Text>
            <Button 
              type="link" 
              size="small" 
              className="ml-2"
              onClick={(e) => {
                e.stopPropagation();
                scrollToClause(item.text);
              }}
            >
              Go to clause →
            </Button>
          </div>
        )}

        {/* Analysis Section */}
        <div className="mt-3 bg-blue-50 p-3 rounded-lg">
          <Text type="secondary" className="block mb-1">Analysis:</Text>
          <Paragraph className="text-gray-700">
            <InfoCircleOutlined className="mr-2 text-blue-500" />
            {item.explanation}
          </Paragraph>
        </div>

        {/* Action Buttons Section */}
        {type === 'risky' && (
          <>
            <div className="mt-3 flex justify-end">
              <Button
                type={redraftedClauses.has(item.text) ? "default" : "primary"}
                size="middle"
                icon={redraftedClauses.has(item.text) ? <CheckCircleOutlined /> : <EditOutlined />}
                onClick={(e) => {
                  e.stopPropagation();
                  handleRedraftClick(item);
                }}
                loading={generatingRedrafts.get(item.text)}
                className={`${redraftedClauses.has(item.text) ? "text-green-600 border-green-600" : ""}`}
              >
                {redraftedClauses.has(item.text) ? 'Redraft Again' : 'Suggest Improvements'}
              </Button>
            </div>

            {/* Inline Redraft Review Panel */}
            {redraftReviewStates.get(item.text) && (
              <div className="mt-4 p-4 bg-white shadow-sm border border-gray-200 rounded-lg">
                <div className="text-sm text-gray-600 mb-2">AI Generated Redraft:</div>
                <div className="max-h-[200px] overflow-y-auto mb-4">
                  <TextArea
                    value={redraftReviewStates.get(item.text).text}
                    onChange={e => setRedraftReviewStates(prev => 
                      new Map(prev).set(item.text, {
                        ...prev.get(item.text),
                        text: e.target.value
                      })
                    )}
                    autoSize={{ minRows: 4, maxRows: 12 }}
                    className="text-base redraft-preview"
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button 
                    size="small" 
                    onClick={() => {
                      setRedraftReviewStates(prev => {
                        const next = new Map(prev);
                        next.delete(item.text);
                        return next;
                      });
                    }}
                    className="hover:bg-red-600 hover:border-red-600"
                  >
                    Reject
                  </Button>
                  <Button 
                    size="small" 
                    onClick={() => handleRegenerateRedraft(item)}
                    className="hover:bg-blue-600 hover:border-blue-600"
                  >
                    Regenerate
                  </Button>
                  <Button 
                    size="small" 
                    type="primary" 
                    onClick={() => handleAcceptRedraft(item)}
                    className="hover:bg-green-600 hover:border-green-600"
                  >
                    Accept Changes
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </List.Item>
  );

  return (
    <>
      <div className="p-4">
        {/* Party Context Banner */}
        {renderPartyContext()}

        {/* Analysis Content */}
        <Title level={4} className="mb-4">Clause Analysis</Title>
        
        {loading ? (
          <div className="flex flex-col items-center justify-center p-8">
            <Spin size="large" />
            <Text className="text-gray-500">Analyzing clauses from {selectedParty?.name}'s perspective...</Text>
          </div>
        ) : !results ? (
          <Empty
            description="No analysis results available"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        ) : (
          <Collapse 
            defaultActiveKey={['risky']} 
            className="shadow-sm"
          >
            <Panel 
              header={
                <div className="flex items-center">
                  <CheckCircleOutlined className="text-green-500 mr-2" />
                  <span className="font-medium">Favorable Clauses ({acceptable?.length || 0})</span>
                </div>
              } 
              key="acceptable"
              className="bg-green-50"
            >
              <List
                dataSource={acceptable}
                renderItem={item => renderClauseItem(item, 'acceptable')}
              />
            </Panel>

            <Panel 
              header={
                <div className="flex items-center">
                  <WarningOutlined className="text-yellow-500 mr-2" />
                  <span className="font-medium">Clauses Needing Review ({risky?.length || 0})</span>
                </div>
              } 
              key="risky"
              className="bg-yellow-50"
            >
              <List
                dataSource={risky}
                renderItem={item => renderClauseItem(item, 'risky')}
              />
            </Panel>

            <Panel 
              header={
                <div className="flex items-center">
                  <ExclamationCircleOutlined className="text-red-500 mr-2" />
                  <span className="font-medium">Missing Protections ({missing?.length || 0})</span>
                </div>
              } 
              key="missing"
              className="bg-red-50"
            >
              <List
                dataSource={missing}
                renderItem={item => renderClauseItem(item, 'missing')}
              />
            </Panel>
          </Collapse>
        )}
      </div>

      <Modal
        title={
          <div className="modal-title text-sm sm:text-base">
            <EditOutlined className="modal-icon" />
            <span>Redraft Clause with Cornelia</span>
          </div>
        }
        open={isRedraftModalVisible}
        onCancel={() => {
          setIsRedraftModalVisible(false);
          setRedraftContent('');
          setSelectedClause(null);
        }}
        footer={
          <Button 
            type="primary"
            icon={<CheckCircleOutlined />}
            onClick={handleRedraft}
            loading={generatingRedrafts.get(selectedClause?.text)}
            className="w-full sm:w-auto"
          >
            Redraft
          </Button>
        }
        width="90vw"
        className="sm:max-w-[600px]"
      >
        {selectedClause && (
          <>
            <div className="mb-4 p-3 bg-gray-50 rounded">
              <Text strong>Original Clause:</Text>
              <div className="mt-2">{selectedClause.text}</div>
              <Text strong className="mt-3 block">Issue:</Text>
              <div className="mt-1">{selectedClause.explanation}</div>
            </div>
            <TextArea
              ref={redraftTextAreaRef}
              rows={5}
              value={redraftContent}
              onChange={e => setRedraftContent(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Give instructions for redrafting this clause..."
              className="redraft-textarea"
            />
          </>
        )}
      </Modal>
    </>
  );
});

export default ClauseAnalysis; 