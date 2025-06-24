import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { FolderOpen, Sparkles, ArrowRight, Info, Loader2, AlertCircle, KeyRound, FolderSearch, ChevronDown, ChevronRight } from 'lucide-react'
import { Alert, AlertDescription } from './ui/alert'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible'

const HomePage = ({ setAnalysisData }) => {
  const [sourcePath, setSourcePath] = useState('')
  const [targetPath, setTargetPath] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [loading, setLoading] = useState(false)
  const [testingKey, setTestingKey] = useState(false)
  const [keyTestResult, setKeyTestResult] = useState(null)
  const [error, setError] = useState('')
  const [isElectron, setIsElectron] = useState(false)
  const [showPathGuide, setShowPathGuide] = useState(false)
  const [showApiGuide, setShowApiGuide] = useState(false)
  const navigate = useNavigate()

  // 检查是否在Electron环境中
  useEffect(() => {
    setIsElectron(window.electron && window.electron.selectDirectory)
  }, [])

  // 处理路径输入，去除前后的引号
  const cleanPath = (path) => {
    if (!path) return path
    // 去除前后的单引号或双引号
    return path.replace(/^['"]|['"]$/g, '').trim()
  }

  const handleSelectFolder = async (setter) => {
    try {
      // 检查是否在Electron环境中
      if (window.electron && window.electron.selectDirectory) {
        const path = await window.electron.selectDirectory()
        if (path) {
          setter(path)
        }
      } else {
        // 在浏览器环境中，使用文件夹选择API（如果支持）
        if (window.showDirectoryPicker) {
          const dirHandle = await window.showDirectoryPicker()
          setter(dirHandle.name) // 显示文件夹名称
        } else {
          // 如果不支持，提示用户手动输入
          setError('当前环境不支持文件夹选择，请手动输入完整路径。例如：/Users/username/Documents/文件夹名')
        }
      }
    } catch (err) {
      console.error('选择文件夹失败:', err)
      if (err.name === 'AbortError') {
        // 用户取消了选择
        return
      }
      setError('无法通过按钮选择文件夹，请手动输入完整路径。')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!sourcePath || !targetPath) {
      console.error('❌ 路径验证失败')
      setError('请选择源文件夹和目标文件夹')
      return
    }
    if (!apiKey) {
      console.error('❌ API Key验证失败')
      setError('请输入您的豆包 API Key')
      return
    }

    setLoading(true)
    setError('')
    
    try {
      const requestBody = {
        source_path: sourcePath,
        target_path: targetPath,
        api_key: apiKey,
      }
      
      const response = await fetch('http://localhost:5002/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      const data = await response.json()

      if (!response.ok) {
        console.error('❌ 后端返回错误:', data)
        throw new Error(data.error || '分析启动失败')
      }

      setAnalysisData({
        taskId: data.task_id,
        sourcePath,
        targetPath,
      })
      navigate('/analysis')
      
    } catch (err) {
      console.error('💥 分析请求失败:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const testApiKey = async () => {
    if (!apiKey) {
      console.error('❌ API Key为空')
      setError('请先输入 API Key')
      return
    }

    setTestingKey(true)
    setKeyTestResult(null)
    setError('')

    try {
      const response = await fetch('http://localhost:5002/api/test-api-key', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          api_key: apiKey,
        }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setKeyTestResult({
          success: true,
          message: data.message,
          model: data.model,
          endpoint: data.api_endpoint,
          testResponse: data.test_response
        })
      } else {
        console.error('❌ API Key测试失败:', data)
        setKeyTestResult({
          success: false,
          error: data.error,
          detail: data.detail
        })
      }
    } catch (err) {
      console.error('💥 API Key测试异常:', err)
      setKeyTestResult({
        success: false,
        error: '测试请求失败',
        detail: err.message
      })
    } finally {
      setTestingKey(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* 头部 */}
      <div className="text-center mb-12">
        <div className="flex items-center justify-center mb-4">
          <Sparkles className="h-12 w-12 text-blue-600 mr-3" />
          <h1 className="text-4xl font-bold text-gray-900">
            PARA 智能文件分类工具
          </h1>
        </div>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          使用 AI 智能分析您的文件，按照 PARA 方法自动生成分类建议，让文件管理变得简单高效
        </p>
      </div>

      {/* PARA 方法介绍 */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Info className="h-5 w-5 mr-2" />
            什么是 PARA 方法？
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-2">Projects</h3>
              <p className="text-sm text-blue-700">有明确截止日期和具体结果的工作</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <h3 className="font-semibold text-green-900 mb-2">Areas</h3>
              <p className="text-sm text-green-700">需要持续维护的责任范围</p>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <h3 className="font-semibold text-yellow-900 mb-2">Resources</h3>
              <p className="text-sm text-yellow-700">未来可能有用的参考资料</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-2">Archive</h3>
              <p className="text-sm text-gray-700">来自前三个类别的非活跃项目</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 主要表单 */}
      <Card>
        <CardHeader>
          <CardTitle>开始智能分类</CardTitle>
          <CardDescription>
            选择或输入您的文件夹路径，AI 将自动分析并生成 PARA 分类建议
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 源文件夹路径 */}
            <div className="space-y-2">
              <Label htmlFor="sourcePath">第一步：输入要整理的文件夹路径 *</Label>
              <Input
                id="sourcePath"
                type="text"
                placeholder="请输入完整路径，例如：/Users/username/Documents/待整理文件"
                value={sourcePath}
                onChange={(e) => setSourcePath(cleanPath(e.target.value))}
                required
              />
              <Collapsible open={showPathGuide} onOpenChange={setShowPathGuide}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-xs text-gray-500 p-0 h-auto">
                    {showPathGuide ? (
                      <ChevronDown className="h-3 w-3 mr-1" />
                    ) : (
                      <ChevronRight className="h-3 w-3 mr-1" />
                    )}
                    💡 如何快速获取文件夹路径？
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2">
                  <div className="text-xs text-gray-500 space-y-1 bg-gray-50 p-3 rounded-md">
                    <p className="font-medium">快捷获取路径方法：</p>
                    <ul className="ml-4 space-y-1">
                      <li>• <strong>Mac用户</strong>：在访达中右键文件夹 → 按住Option键 → 点击"将路径名拷贝"</li>
                      <li>• <strong>Windows用户</strong>：在文件夹地址栏点击，Ctrl+A全选后Ctrl+C复制完整路径</li>
                    </ul>
                    <p className="font-medium mt-2">💡 支持的路径格式：</p>
                    <ul className="ml-4 space-y-1">
                      <li>• 普通路径：<code>/Users/username/Documents/文件夹</code></li>
                      <li>• 带引号路径：<code>'/Users/username/Documents/文件夹'</code></li>
                      <li>• 双引号路径：<code>"/Users/username/Documents/文件夹"</code></li>
                    </ul>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
            
            {/* 目标文件夹路径 */}
            <div className="space-y-2">
              <Label htmlFor="targetPath">第二步：输入目标文件夹路径 *</Label>
              <Input
                id="targetPath"
                type="text"
                placeholder="请输入完整路径，例如：/Users/username/Documents/PARA"
                value={targetPath}
                onChange={(e) => setTargetPath(cleanPath(e.target.value))}
                required
              />
              <p className="text-xs text-gray-500">
                💡 提示：这是整理后文件的存放位置，建议创建一个新的文件夹用于存放分类结果
              </p>
            </div>

            {/* API Key */}
            <div className="space-y-2">
              <Label htmlFor="apiKey">第三步：输入您的豆包 API Key *</Label>
              <div className="flex items-center space-x-2">
                <KeyRound className="h-5 w-5 text-gray-400" />
                <Input
                  id="apiKey"
                  type="password"
                  placeholder="输入您的豆包-火山引擎 API Key"
                  value={apiKey}
                  onChange={(e) => {
                    setApiKey(e.target.value)
                    setKeyTestResult(null) // 清除之前的测试结果
                  }}
                  required
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={testApiKey}
                  disabled={testingKey || !apiKey}
                >
                  {testingKey ? (
                    <>
                      <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                      测试中
                    </>
                  ) : (
                    '测试'
                  )}
                </Button>
              </div>
              
              <Collapsible open={showApiGuide} onOpenChange={setShowApiGuide}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-xs text-gray-500 p-0 h-auto">
                    {showApiGuide ? (
                      <ChevronDown className="h-3 w-3 mr-1" />
                    ) : (
                      <ChevronRight className="h-3 w-3 mr-1" />
                    )}
                    🔑 如何获取豆包 API Key？
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2">
                  <div className="text-xs text-gray-500 space-y-2 bg-gray-50 p-3 rounded-md">
                    <p className="font-medium">获取步骤：</p>
                    <ol className="ml-4 space-y-1">
                      <li>1. 访问 <a href="https://console.volcengine.com/ark" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline">火山引擎控制台</a></li>
                      <li>2. 注册/登录火山引擎账号</li>
                      <li>3. 进入"豆包大模型"或"方舟"服务</li>
                      <li>4. 在API密钥管理页面创建新的API Key</li>
                      <li>5. 复制生成的API Key并粘贴到上方输入框</li>
                    </ol>
                    <p className="mt-2 font-medium">⚠️ API Key 仅用于本次分析，不会被存储。建议先测试API Key有效性。</p>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
            
            {/* API Key测试结果 */}
            {keyTestResult && (
              <Alert variant={keyTestResult.success ? "default" : "destructive"} className="mt-2">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {keyTestResult.success ? (
                    <div>
                      <div className="font-medium text-green-800">✅ {keyTestResult.message}</div>
                      <div className="text-sm text-green-700 mt-1">
                        模型: {keyTestResult.model}<br/>
                        端点: {keyTestResult.endpoint}<br/>
                        测试响应: {keyTestResult.testResponse}
                      </div>

                    </div>
                  ) : (
                    <div>
                      <div className="font-medium">❌ {keyTestResult.error}</div>
                      {keyTestResult.detail && (
                        <div className="text-sm mt-1">详情: {JSON.stringify(keyTestResult.detail)}</div>
                      )}
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {/* 错误提示 */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* 提交按钮 */}
            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  正在启动分析...
                </>
              ) : (
                <>
                  开始智能分类
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default HomePage

