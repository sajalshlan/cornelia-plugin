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
import { logger, redraftComment } from '../../api';

const { Panel } = Collapse;
const { Text, Title, Paragraph } = Typography;
const { TextArea } = Input;

const ClauseAnalysis = React.memo(({ results, loading, selectedParty, getTagColor }) => {
  const [isRedraftModalVisible, setIsRedraftModalVisible] = useState(false);
  const [redraftContent, setRedraftContent] = useState('');
  const [selectedClause, setSelectedClause] = useState(null);
  const [generatedRedraft, setGeneratedRedraft] = useState(null);
  const redraftTextAreaRef = useRef(null);
  const [isGeneratingRedraft, setIsGeneratingRedraft] = useState(false);
  const [redraftedClauses, setRedraftedClauses] = useState(new Set());
  const [redraftedTexts, setRedraftedTexts] = useState(new Map());

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
      setIsGeneratingRedraft(true);
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
        setGeneratedRedraft({ text: result, clause: selectedClause });
      }
    } catch (error) {
      message.error('Failed to generate redraft: ' + error.message);
    } finally {
      setIsGeneratingRedraft(false);
    }
  };

  const handleRegenerateRedraft = () => {
    setGeneratedRedraft(null);
    setIsRedraftModalVisible(true);
  };

  const handleRejectRedraft = () => {
    setGeneratedRedraft(null);
  };

  const handleAcceptRedraft = async () => {
    try {
      await Word.run(async (context) => {
        // Get the text to search for - either the current redrafted text or the original
        const searchText = redraftedTexts.get(generatedRedraft.clause.text) || generatedRedraft.clause.text;
        
        const searchResults = context.document.body.search(searchText);
        context.load(searchResults);
        await context.sync();

        if (searchResults.items.length > 0) {
          searchResults.items[0].insertText(generatedRedraft.text, Word.InsertLocation.replace);
          await context.sync();
          
          // Update both our tracking states
          setRedraftedClauses(prev => new Set([...prev, generatedRedraft.clause.text]));
          setRedraftedTexts(prev => new Map(prev).set(generatedRedraft.clause.text, generatedRedraft.text));
          
          setGeneratedRedraft(null);
          message.success('Text redrafted successfully');
        } else {
          // If we can't find the current text, try the original as fallback
          if (searchText !== generatedRedraft.clause.text) {
            const originalSearchResults = context.document.body.search(generatedRedraft.clause.text);
            context.load(originalSearchResults);
            await context.sync();

            if (originalSearchResults.items.length > 0) {
              originalSearchResults.items[0].insertText(generatedRedraft.text, Word.InsertLocation.replace);
              await context.sync();
              
              setRedraftedClauses(prev => new Set([...prev, generatedRedraft.clause.text]));
              setRedraftedTexts(prev => new Map(prev).set(generatedRedraft.clause.text, generatedRedraft.text));
              
              setGeneratedRedraft(null);
              message.success('Text redrafted successfully');
            } else {
              throw new Error('Could not find the clause text in the document');
            }
          }
        }
      });
    } catch (error) {
      console.error('Error applying redraft:', error);
      message.error('Failed to apply redraft: ' + error.message);
    }
  };

  const handleRedraftClick = (item) => {
    setSelectedClause({
      ...item,
      // If this clause has been redrafted before, use its current text
      text: redraftedTexts.get(item.text) || item.text
    });
    setIsRedraftModalVisible(true);
  };

  const { acceptable = [], risky = [], missing = [] } = JSON.parse(results) || {};
  
  const renderPartyContext = () => {
    if (!selectedParty) return null;
    
    return (
      <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
        <div className="flex items-center gap-2 mb-2">
          <UserOutlined className="text-blue-500" />
          <Text strong>Analyzing from perspective of:</Text>
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
          <div className="mt-3 flex justify-end">
            <Button
              type={redraftedClauses.has(item.text) ? "default" : "primary"}
              size="middle"
              icon={redraftedClauses.has(item.text) ? <CheckCircleOutlined /> : <EditOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                handleRedraftClick(item);
              }}
              loading={isGeneratingRedraft && selectedClause?.text === item.text}
              className={`${redraftedClauses.has(item.text) ? "text-green-600 border-green-600" : ""}`}
            >
              {redraftedClauses.has(item.text) ? 'Redraft Again' : 'Suggest Improvements'}
            </Button>
          </div>
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
            <Text className="mt-4 text-gray-500">Analyzing clauses from {selectedParty?.name}'s perspective...</Text>
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
            loading={isGeneratingRedraft}
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
              placeholder="Give instructions for redrafting this clause..."
              className="redraft-textarea"
            />
          </>
        )}
      </Modal>

      {generatedRedraft && (
        <Modal
          title="Review Redrafted Clause"
          open={true}
          onCancel={handleRejectRedraft}
          footer={
            <div className="flex justify-end space-x-3">
              <Button 
                key="reject" 
                icon={<CloseCircleOutlined />} 
                onClick={handleRejectRedraft}
              >
                Discard
              </Button>
              <Button 
                key="regenerate" 
                icon={<SyncOutlined />} 
                onClick={handleRegenerateRedraft}
              >
                Regenerate
              </Button>
              <Button 
                key="accept" 
                type="primary" 
                icon={<CheckCircleOutlined />} 
                onClick={handleAcceptRedraft}
              >
                Accept Changes
              </Button>
            </div>
          }
          width={600}
        >
          <div className="mb-4 p-3 bg-gray-50 rounded">
            <Text strong>Original:</Text>
            <div className="mt-2">{generatedRedraft.clause.text}</div>
          </div>
          <div className="p-3 border-l-4 border-green-400">
            <Text strong>Redrafted Version:</Text>
            <div className="mt-2">{generatedRedraft.text}</div>
          </div>
        </Modal>
      )}
    </>
  );
});

export default ClauseAnalysis; 