import React, { useEffect } from 'react';
import { Collapse, Typography, List, Tag, Spin, Empty, Button } from 'antd';
import { 
  CheckCircleOutlined, 
  WarningOutlined, 
  ExclamationCircleOutlined,
  ReloadOutlined 
} from '@ant-design/icons';
import { logger } from '../../api';

const { Panel } = Collapse;
const { Text, Title } = Typography;

const ClauseAnalysis = React.memo(({ results, loading }) => {
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

//   useEffect(() => {
//     if (results) {
//       logger.info('ClauseAnalysis received results:', results);
//       logger.info('Acceptable clauses:', results.acceptable);
//       if (results.acceptable?.length > 0) {
//         logger.info('First acceptable clause:', results.acceptable[0]);
//         logger.info('First acceptable clause title:', results.acceptable[0]?.title);
//         logger.info('First acceptable clause text:', results.acceptable[0]?.text);
//       }
//     }
//   }, [results]);

//   logger.info('Raw ClauseAnalysis results:', results);


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
            renderItem={item => {
              try {
                return (
                  <List.Item className="bg-white rounded-lg mb-2 p-4">
                    <div className="w-full">
                      <div className="flex items-center justify-between">
                        <Text strong className="text-lg">{item.title}</Text>
                        <Tag color="success">Acceptable</Tag>
                      </div>
                      {item.text !== 'N/A' ? (
                        <div className="mt-2 text-gray-600 border-l-4 border-green-400 pl-3">
                          {item.text}
                        </div>
                      ) : null}
                      <div className="mt-2 text-gray-500 text-sm bg-gray-50 p-2 rounded">
                        <Text type="secondary">Analysis: </Text>
                        {item.explanation}
                      </div>
                    </div>
                  </List.Item>
                );
              } catch (error) {
                logger.error('Error rendering clause item:', error);
                return null;
              }
            }}
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
            renderItem={item => (
              <List.Item className="bg-white rounded-lg mb-2 p-4">
                <div className="w-full">
                  <div className="flex items-center justify-between">
                    <Text strong className="text-lg text-yellow-600">{item.title}</Text>
                    <Tag color="warning">Needs Review</Tag>
                  </div>
                  {item.text !== 'N/A' ? (
                    <div className="mt-2 text-gray-600 border-l-4 border-yellow-400 pl-3">
                      {item.text}
                    </div>
                  ) : null}
                  <div className="mt-2 text-gray-500 text-sm bg-yellow-50 p-2 rounded">
                    <Text type="warning">Risk Analysis: </Text>
                    {item.explanation}
                  </div>
                </div>
              </List.Item>
            )}
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
            renderItem={item => (
              <List.Item className="bg-white rounded-lg mb-2 p-4">
                <div className="w-full">
                  <div className="flex items-center justify-between">
                    <Text strong className="text-lg text-red-600">{item.title}</Text>
                    <Tag color="error">Missing</Tag>
                  </div>
                  <div className="mt-2 text-gray-500 text-sm bg-red-50 p-2 rounded">
                    <Text type="danger">Recommendation: </Text>
                    {item.explanation}
                  </div>
                </div>
              </List.Item>
            )}
          />
        </Panel>
      </Collapse>
    </div>
  );
});

export default ClauseAnalysis; 