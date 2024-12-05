import React, { useState, useEffect } from 'react';
import { Form, Input, Button, message, Typography, Alert } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';

const { Title, Text } = Typography;

const Login = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const { login, authError, clearError } = useAuth();

  useEffect(() => {
    if (authError) {
      message.error(authError, 3);
    }
    return () => {
      clearError(); // Clear error when component unmounts
    };
  }, [authError, clearError]);

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const result = await login(values.username, values.password);
      
      if (result.success) {
        message.success({
          content: (
            <div className="text-center py-1">
              <div className="text-base text-gray-600">
                Welcome back, <span className="text-lg font-semibold text-[#1677ff]">{values.username}</span>
              </div>
            </div>
          ),
          duration: 3,
        });
      } else {
        message.error(result.error || 'Login failed', 3);
        setTimeout(() => {
          setLoading(false);
        }, 3000);
        return;
      }
    } catch (error) {
      console.error('Login error:', error);
    } finally {
      if (!loading) {
        setLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md bg-white rounded-lg shadow-md p-8">
        <div className="text-center mb-8">
          <Title level={2} className="text-gray-800">Welcome to Cornelia</Title>
          <Text className="text-gray-500">Sign in to continue</Text>
        </div>

        {authError && (
          <Alert
            message={authError}
            type="error"
            showIcon
            className="mb-4"
            closable
            onClose={clearError}
          />
        )}

        <Form
          form={form}
          name="login"
          onFinish={onFinish}
          layout="vertical"
          className="space-y-4"
        >
          <Form.Item
            name="username"
            rules={[{ required: true, message: 'Please enter your username' }]}
          >
            <Input
              prefix={<UserOutlined className="text-gray-400" />}
              placeholder="Username"
              size="large"
              className="rounded-md"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: 'Please enter your password' }]}
          >
            <Input.Password
              prefix={<LockOutlined className="text-gray-400" />}
              placeholder="Password"
              size="large"
              className="rounded-md"
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              className="w-full bg-gradient-to-r from-blue-500 to-indigo-600"
            >
              Sign in
            </Button>
          </Form.Item>
        </Form>
      </div>
    </div>
  );
};

export default Login; 