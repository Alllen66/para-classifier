// API配置文件 - 自动检测开发/生产环境
const isDevelopment = import.meta.env.DEV || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'

// API基础URL配置
export const API_BASE_URL = isDevelopment 
  ? 'http://localhost:5002'  // 开发环境
  : window.location.origin   // 生产环境：使用当前页面的域名

console.log(`🌐 API Base URL: ${API_BASE_URL} (${isDevelopment ? '开发环境' : '生产环境'})`)

// API端点配置
export const API_ENDPOINTS = {
  testApiKey: `${API_BASE_URL}/api/test-api-key`,
  analyze: `${API_BASE_URL}/api/analyze`,
  classificationStatus: (taskId) => `${API_BASE_URL}/api/classification/${taskId}`,
  migrate: `${API_BASE_URL}/api/migrate`,
  health: `${API_BASE_URL}/health`
}

// 通用的fetch封装函数
export const apiRequest = async (url, options = {}) => {
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
    },
  }
  
  const requestOptions = {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...options.headers,
    },
  }
  
  try {
    const response = await fetch(url, requestOptions)
    return response
  } catch (error) {
    console.error('API请求失败:', error)
    throw error
  }
} 