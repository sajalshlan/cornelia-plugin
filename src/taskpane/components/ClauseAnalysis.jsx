import React, { useEffect } from 'react';
import { Collapse, Typography, List, Tag, Spin, Empty, Button } from 'antd';
import { 
  CheckCircleOutlined, 
  WarningOutlined, 
  ExclamationCircleOutlined,
  ReloadOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import { logger } from '../../api';

const { Panel } = Collapse;
const { Text, Title } = Typography;

const ClauseAnalysis = React.memo(({ results, loading }) => {
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

  const { acceptable = [], risky = [], missing = [] } = JSON.parse(results) || {};
  
  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center p-8 h-full">
        <Spin size="large" />
        <Text className="mt-4 text-gray-500">Analyzing document clauses...</Text>
      </div>
    );
  }

  if (!results) {
    return (
      <div className="flex flex-col justify-center items-center p-8">
        <Empty
          description="No analysis results available"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        >
          <Button type="primary" icon={<ReloadOutlined />}>
            Analyze Again
          </Button>
        </Empty>
      </div>
    );
  }

  const renderClauseItem = (item, type) => (
    <List.Item 
      className="bg-white rounded-lg mb-2 p-4 cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => item.text !== 'N/A' && scrollToClause(item.text)}
    >
      <div className="w-full">
        <div className="flex items-center justify-between">
          <Text strong className="text-lg">{item.title}</Text>
          <Tag color={type === 'acceptable' ? 'success' : type === 'risky' ? 'warning' : 'error'}>
            {type === 'acceptable' ? 'Acceptable' : type === 'risky' ? 'Needs Review' : 'Missing'}
          </Tag>
        </div>
        
        {/* Clause Text Section */}
        {item.text !== 'N/A' && (
          <div className="mt-2 text-gray-600 border-l-4 border-green-400 pl-3">
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

        {/* Explanation Section */}
        <div className="mt-2 text-gray-500 bg-gray-50 p-2 rounded">
          <Text italic>
            <InfoCircleOutlined className="mr-2" />
            {item.explanation}
          </Text>
        </div>
      </div>
    </List.Item>
  );

  return (
    <div className="p-4">
      <Title level={4} className="mb-4">Document Clause Analysis</Title>
      <Collapse defaultActiveKey={['risky']} className="w-full shadow-sm">
        <Panel 
          header={
            <div className="flex items-center">
              <CheckCircleOutlined className="text-green-500 mr-2" />
              <span className="font-medium">Acceptable Clauses ({acceptable?.length || 0})</span>
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
              <span className="font-medium">Risky Clauses ({risky?.length || 0})</span>
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
              <span className="font-medium">Missing Clauses ({missing?.length || 0})</span>
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
    </div>
  );
});

export default ClauseAnalysis; 