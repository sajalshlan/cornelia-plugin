import React, { useEffect, useRef } from 'react';
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
  onChangeParty,
  isRedraftModalVisible,
  redraftContent,
  selectedClause,
  generatedRedraft,
  generatingRedrafts,
  redraftedClauses,
  redraftedTexts,
  redraftReviewStates,
  onRedraftModalVisibility,
  onRedraftContentChange,
  onSelectedClauseChange,
  onGeneratingRedraftsChange,
  onRedraftedClausesChange,
  onRedraftedTextsChange,
  onRedraftReviewStatesChange
}) => {
  const redraftTextAreaRef = useRef(null);

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
      onGeneratingRedraftsChange(prev => new Map(prev).set(selectedClause.text, true));
      onRedraftModalVisibility(false);
      onRedraftContentChange('');
      
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
        onRedraftReviewStatesChange(prev => new Map(prev).set(selectedClause.text, {
          text: result,
          clause: selectedClause
        }));
      }
    } catch (error) {
      message.error('Failed to generate redraft: ' + error.message);
    } finally {
      onGeneratingRedraftsChange(prev => {
        const next = new Map(prev);
        next.delete(selectedClause.text);
        return next;
      });
    }
  };

  const handleRegenerateRedraft = () => {
    onSelectedClauseChange(null);
    onRedraftModalVisibility(true);
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
          onRedraftedClausesChange(prev => new Set([...prev, item.text]));
          onRedraftedTextsChange(prev => new Map(prev).set(item.text, redraftState.text));
          
          // Clear the redraft review state for this item
          onRedraftReviewStatesChange(prev => {
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
    onSelectedClauseChange({
      ...item,
      text: redraftedTexts.get(item.text) || item.text
    });
    onRedraftModalVisibility(true);
    
    // Clear any existing redraft review state for this item
    onRedraftReviewStatesChange(prev => {
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
      className={`bg-white mb-3 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 border
        ${type === 'acceptable' ? 'border-blue-100/50' : type === 'risky' ? 'border-yellow-100/50' : 'border-red-100/50'}
        first:mt-0 last:mb-0`}
    >
      <div className="w-full px-4 py-3">
        {/* Header Section */}
        <div className="flex items-center justify-between mb-2.5">
          <Text strong className="text-gray-800 text-base">
            {item.title}
          </Text>
          {type !== 'missing' && (
            <Button 
              type="link" 
              size="small"
              className={`
                ${type === 'acceptable' ? 'text-blue-600 hover:text-blue-700' : 
                  type === 'risky' ? 'text-yellow-600 hover:text-yellow-700' : 
                  'text-red-600 hover:text-red-700'}
              `}
              onClick={(e) => {
                e.stopPropagation();
                scrollToClause(item.text);
              }}
            >
              Go to clause →
            </Button>
          )}
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 gap-2">
          {/* Clause Text */}
          {type !== 'missing' && (
            <div className={`rounded-md p-2.5 text-gray-700 text-sm
              ${type === 'acceptable' ? 'bg-blue-50/50' : 'bg-yellow-50/50'}`}
            >
              {item.text}
            </div>
          )}

          {/* Analysis Section */}
          <div className="bg-gray-50/70 rounded-md p-2.5 text-gray-600 text-sm">
            <div className="text-xs text-gray-500 mb-1 font-medium flex items-center">
              <InfoCircleOutlined className={`mr-1.5 
                ${type === 'acceptable' ? 'text-blue-500' : 
                  type === 'risky' ? 'text-yellow-500' : 
                  'text-red-500'}`} 
              />
              Analysis:
            </div>
            {item.explanation}
          </div>

          {/* Action Buttons Section */}
          {type === 'risky' && !redraftedClauses.has(item.text) && (
            <div className="flex justify-end mt-2">
              <Button
                type="primary"
                size="small"
                icon={<EditOutlined />}
                onClick={(e) => {
                  e.stopPropagation();
                  handleRedraftClick(item);
                }}
                loading={generatingRedrafts.get(item.text)}
                className="bg-yellow-500 hover:bg-yellow-600 border-yellow-500 hover:border-yellow-600"
              >
                Suggest Improvements
              </Button>
            </div>
          )}

          {/* Inline Redraft Review Panel */}
          {redraftReviewStates.get(item.text) && (
            <div className="mt-2 p-3 bg-white shadow-sm border border-yellow-200 rounded-lg">
              <div className="text-xs text-yellow-600 font-medium mb-2">AI Generated Redraft:</div>
              <div className="max-h-[200px] overflow-y-auto mb-3">
                <TextArea
                  value={redraftReviewStates.get(item.text).text}
                  onChange={e => onRedraftReviewStatesChange(prev => 
                    new Map(prev).set(item.text, {
                      ...prev.get(item.text),
                      text: e.target.value
                    })
                  )}
                  autoSize={{ minRows: 3, maxRows: 6 }}
                  className="text-sm redraft-preview"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button 
                  size="small" 
                  onClick={() => {
                    onRedraftReviewStatesChange(prev => {
                      const next = new Map(prev);
                      next.delete(item.text);
                      return next;
                    });
                  }}
                  className="hover:bg-red-600 hover:text-white hover:border-red-600 transition-colors"
                >
                  Reject
                </Button>
                <Button 
                  size="small" 
                  onClick={() => handleRegenerateRedraft(item)}
                  className="hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-colors"
                >
                  Regenerate
                </Button>
                <Button 
                  size="small" 
                  type="primary" 
                  onClick={() => handleAcceptRedraft(item)}
                  className="bg-green-500 hover:bg-green-600 border-green-500 hover:border-green-600"
                >
                  Accept Changes
                </Button>
              </div>
            </div>
          )}
        </div>
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
            defaultActiveKey={['risky', 'redrafted']} 
            className="shadow-sm space-y-2"
          >
            {/* Redrafted Clauses Panel */}
            {redraftedClauses.size > 0 && (
              <Panel 
                header={
                  <div className="flex items-center">
                    <EditOutlined className="text-green-500 mr-2 text-lg" />
                    <span className="font-semibold text-green-700">
                      Redrafted Clauses ({redraftedClauses.size})
                    </span>
                  </div>
                } 
                key="redrafted"
                className="bg-green-50/50 border-green-100 rounded-md overflow-hidden"
              >
                <List
                  dataSource={[...acceptable, ...risky, ...missing].filter(item => redraftedClauses.has(item.text))}
                  renderItem={item => (
                    <List.Item 
                      className="bg-white mb-3 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 border border-green-100/50
                        first:mt-0 last:mb-0"
                    >
                      <div className="w-full px-4 py-3">
                        <div className="flex items-center justify-between mb-2.5">
                          <Text strong className="text-gray-800 text-base">
                            {item.title}
                          </Text>
                          <Button 
                            type="link" 
                            size="small"
                            className="text-green-600 hover:text-green-700"
                            onClick={(e) => {
                              e.stopPropagation();
                              const redraftedText = redraftedTexts.get(item.text);
                              logger.info("Attempting to scroll to redrafted text:", {
                                redraftedText: redraftedText?.substring(0, 100),
                                originalText: item.text?.substring(0, 100),
                                hasRedraft: !!redraftedText,
                                textLength: redraftedText?.length
                              });
                              
                              if (!redraftedText) {
                                message.warning('Redrafted text not found');
                                return;
                              }
                              
                              scrollToClause(redraftedText);
                            }}
                            icon={<CheckCircleOutlined />}
                          >
                            Go to clause →
                          </Button>
                        </div>
                        
                        <div className="grid grid-cols-1 gap-2">
                          <div className="bg-gray-50/70 rounded-md p-2.5 text-gray-600 text-sm">
                            <div className="text-xs text-gray-500 mb-1 font-medium">Original:</div>
                            {item.text}
                          </div>

                          <div className="bg-green-50/50 rounded-md p-2.5 text-gray-700 text-sm">
                            <div className="text-xs text-green-600 mb-1 font-medium">Redrafted:</div>
                            {redraftedTexts.get(item.text)}
                          </div>

                          <div className="bg-gray-50/70 rounded-md p-2.5 text-gray-600 text-sm">
                            <div className="text-xs text-gray-500 mb-1 font-medium flex items-center">
                              <InfoCircleOutlined className="mr-1.5 text-green-500" />
                              Analysis:
                            </div>
                            {item.explanation}
                          </div>
                        </div>
                      </div>
                    </List.Item>
                  )}
                />
              </Panel>
            )}

            {/* Favorable Clauses Panel */}
            <Panel 
              header={
                <div className="flex items-center">
                  <CheckCircleOutlined className="text-blue-500 mr-2 text-lg" />
                  <span className="font-semibold text-blue-700">
                    Favorable Clauses ({acceptable.filter(item => !redraftedClauses.has(item.text)).length})
                  </span>
                </div>
              } 
              key="acceptable"
              className="bg-blue-50/50 border-blue-100 rounded-md overflow-hidden"
            >
              <List
                dataSource={acceptable.filter(item => !redraftedClauses.has(item.text))}
                renderItem={item => renderClauseItem(item, 'acceptable')}
              />
            </Panel>

            <Panel 
              header={
                <div className="flex items-center">
                  <WarningOutlined className="text-yellow-500 mr-2 text-lg" />
                  <span className="font-semibold text-yellow-700">
                    Clauses Needing Review ({risky.filter(item => !redraftedClauses.has(item.text)).length})
                  </span>
                </div>
              } 
              key="risky"
              className="bg-yellow-50/50 border-yellow-100 rounded-md overflow-hidden"
            >
              <List
                dataSource={risky.filter(item => !redraftedClauses.has(item.text))}
                renderItem={item => renderClauseItem(item, 'risky')}
              />
            </Panel>

            <Panel 
              header={
                <div className="flex items-center">
                  <ExclamationCircleOutlined className="text-red-500 mr-2 text-lg" />
                  <span className="font-semibold text-red-700">
                    Missing Protections ({missing.filter(item => !redraftedClauses.has(item.text)).length})
                  </span>
                </div>
              } 
              key="missing"
              className="bg-red-50/50 border-red-100 rounded-md overflow-hidden"
            >
              <List
                dataSource={missing.filter(item => !redraftedClauses.has(item.text))}
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
          onRedraftModalVisibility(false);
          onRedraftContentChange('');
          onSelectedClauseChange(null);
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
              onChange={e => onRedraftContentChange(e.target.value)}
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