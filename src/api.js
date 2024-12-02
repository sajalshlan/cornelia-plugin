import axios from 'axios';

const BASE_URL = 'https://127.0.0.1:8000/api';

// Create a debug output div with better styling
const createDebugDiv = () => {
  const div = document.createElement('div');
  div.id = 'debug-output';
  div.style.cssText = `
    position: fixed;
    bottom: 0;
    right: 0;
    width: 400px;
    max-height: 300px;
    overflow-y: auto;
    background-color: rgba(0, 0, 0, 0.9);
    color: #fff;
    padding: 10px;
    font-family: monospace;
    font-size: 12px;
    z-index: 9999;
    border-top-left-radius: 8px;
    box-shadow: -2px -2px 10px rgba(0, 0, 0, 0.2);
  `;
  document.body.appendChild(div);
  return div;
};

// Enhanced debug logger with better formatting
const createDebugger = (namespace) => {
  const getColorForNamespace = (ns) => {
    switch (ns) {
      case 'app:api:info': return '#3498db';  // blue
      case 'app:api:error': return '#e74c3c'; // red
      case 'app:api:warn': return '#f1c40f';  // yellow
      case 'app:api:debug': return '#2ecc71'; // green
      default: return '#fff';
    }
  };

  return (...args) => {
    const timestamp = new Date().toISOString();
    const color = getColorForNamespace(namespace);
    
    // Format the arguments
    const formattedArgs = args.map(arg => {
      if (typeof arg === 'object') {
        return JSON.stringify(arg, null, 2);
      }
      return arg;
    }).join(' ');

    // Create formatted message
    const logMessage = `
      <div style="margin-bottom: 8px; border-left: 3px solid ${color}; padding-left: 8px;">
        <div style="color: #666; font-size: 10px;">${timestamp}</div>
        <div style="color: ${color};">[${namespace}]</div>
        <div style="color: #fff; white-space: pre-wrap;">${formattedArgs}</div>
      </div>
    `;
    
    // Console output
    console.log(`[${timestamp}] [${namespace}]`, ...args);
    
    // Debug div output
    if (process.env.NODE_ENV === 'development') {
      try {
        const debugDiv = document.getElementById('debug-output') || createDebugDiv();
        debugDiv.insertAdjacentHTML('afterbegin', logMessage);
        
        // Keep only last 100 logs
        const logs = debugDiv.children;
        if (logs.length > 100) {
          debugDiv.removeChild(logs[logs.length - 1]);
        }
      } catch (e) {
        console.warn('Debug div creation failed:', e);
      }
    }
  };
};

// Export the logger
export const logger = {
  info: createDebugger('app:api:info'),
  error: createDebugger('app:api:error'),
  warn: createDebugger('app:api:warn'),
  debug: createDebugger('app:api:debug')
};

// Enable all loggers by default
if (createDebugger.enable) {
  createDebugger.enable('app:api:*');
}

// Create axios instance
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 180000,
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoiYWNjZXNzIiwiZXhwIjoxNzMzMjYyMzc1LCJpYXQiOjE3MzMxNTQzNzUsImp0aSI6IjQzMzJhY2YwMjNkOTQ5OWY5M2NiYWIwZDRjNzI3Yzg4IiwidXNlcl9pZCI6M30.bhqBhkvvKCOOE18XqxbsysEJgi1ZOWM8p51Y0l_IvPk'
  },
});

// Debug interceptor
// api.interceptors.request.use(request => {
//   logger.info('Starting Request: %O', {
//     url: request.url,
//     method: request.method,
//     headers: request.headers,
//     baseURL: request.baseURL
//   });
//   return request;
// });

// api.interceptors.response.use(
//   response => {
//     logger.info('Response: %O', {
//       status: response.status,
//       headers: response.headers,
//       data: response.data
//     });
//     return response;
//   },
//   error => {
//     logger.error('Response Error: %O', {
//       message: error.message,
//       status: error.response?.status,
//       data: error.response?.data,
//       headers: error.response?.headers
//     });
//     return Promise.reject(error);
//   }
// );

export const performAnalysis = async (type, text, fileName, onProgress, signal) => {
  // logger.info(`🚀 Starting ${type} analysis for ${fileName}...`);
  
  try {
    onProgress && onProgress(fileName, 0);

    const requestBody = {
      analysis_type: type,
      text: text,
      include_history: type === 'ask'
    };

    // logger.info('Request body: %O', requestBody);

    const response = await api.post('/perform_analysis/', requestBody, {
      signal,
      onDownloadProgress: (progressEvent) => {
        const percentCompleted = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        );
        onProgress && onProgress(fileName, percentCompleted);
      }
    });

    // logger.info(`✅ ${type} analysis completed for ${fileName}: %O`, response.data);
    return response.data.success ? response.data.result : null;
    
  } catch (error) {
    if (error.name === 'AbortError' || error.name === 'CanceledError') {
      logger.warn(`🛑 ${type} analysis was manually aborted for ${fileName}`);
    } else {
      logger.error(`❌ Error in ${type} analysis for ${fileName}: %O`, error);
    }
    onProgress && onProgress(fileName, 0);
    throw error;
  }
};

// Add a specific test function
export const testEndpoint = async () => {
  try {
    const response = await api.get('/profile/');
    logger.info('Test successful: %O', response.data);
    return response.data;
  } catch (error) {
    logger.error('Test failed: %O', error);
    throw error;
  }
};

export const replyToComment = async (comment, documentContent, instructions = '', replies = []) => {
  try {
    const response = await api.post('/reply_to_comment/', {
      comment,
      documentContent,
      instructions,
      replies
    });
    
    return response.data.success ? response.data.result : null;
  } catch (error) {
    logger.error('Error in replying to comment: %O', error);
    throw error;
  }
};

export const redraftComment = async (comment, documentContent, selectedText, instructions = '', replies = []) => {
  try {
    const response = await api.post('/redraft_comment/', {
      comment,
      documentContent,
      selectedText,
      instructions,
      replies
    });
    
    return response.data.success ? response.data.result : null;
  } catch (error) {
    logger.error('Error in redrafting comment: %O', error);
    throw error;
  }
};

export const analyzeDocumentClauses = async (text) => {
  try {
    const response = await api.post('/analyze_clauses/', {
      text: text
    });
    return response.data.success ? response.data.result : null;
  } catch (error) {
    logger.error('Error in clause analysis:', error);
    throw error;
  }
};

export default api;