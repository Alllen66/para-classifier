import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from './ui/card'
import { Button } from './ui/button'
import { Progress } from './ui/progress'
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from './ui/badge'
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from './ui/alert-dialog'
import { Loader2, FileText, CheckCircle, XCircle, FolderTree, Brain, AlertTriangle, ArrowRight, Home, Shuffle, FolderKanban, FolderPlus, Shield } from 'lucide-react'
import { API_ENDPOINTS } from '../config/api'

// 新的：递归渲染目录结构，支持新增文件夹标记和复杂结构
const renderTree = (data, currentPath = '', level = 0, isProjectStructure = false) => {
  if (!data) return null
  
  
  return (
    <ul className="pl-4">
      {Object.entries(data).map(([key, value]) => {
        // 跳过特殊的__files__键，它会在父级处理
        if (key === '__files__') return null
        
        const isFile = typeof value === 'string'
        const isSubdirectory = typeof value === 'object' && value !== null && !Array.isArray(value)
        const isFileList = Array.isArray(value)
        
        // 优化新增判断逻辑
        const isPARATopLevel = level === 0 && (
          key.includes('Projects') || key.includes('Areas') || 
          key.includes('Resources') || key.includes('Archive')
        )
        
        // 新增判断：
        // 1. 不是PARA顶级分类
        // 2. 层级大于0（即是子目录）
        // 3. 是目录或文件列表（不是单个文件）
        const isNewFolder = !isPARATopLevel && level > 0 && (isSubdirectory || isFileList)

        if (isFile) { 
          return <li key={key} className="text-sm text-gray-600 flex items-center">📄 {value}</li>
        }

        return (
          <li key={key}>
            <div className="flex items-center space-x-2">
              <span className="font-semibold text-gray-800 flex items-center">
                {isSubdirectory || isFileList ? '📂' : '📁'} {key}
              </span>
              {isNewFolder && (
                <Badge variant="secondary" className="text-xs bg-green-100 text-green-800 border-green-200">
                  <FolderPlus className="h-3 w-3 mr-1" />
                  新增
                </Badge>
              )}
            </div>
            
            {/* 处理子目录 */}
            {isSubdirectory && renderTree(value, `${currentPath}/${key}`, level + 1, true)}
            
            {/* 处理文件列表 */}
            {isFileList && (
              <ul className="pl-4">
                {value.map((file, index) => (
                  <li key={index} className="text-sm text-gray-600 flex items-center">📄 {file}</li>
                ))}
              </ul>
            )}
            
            {/* 处理包含__files__的复杂结构 */}
            {isSubdirectory && value.__files__ && Array.isArray(value.__files__) && (
              <ul className="pl-4">
                {value.__files__.map((file, index) => (
                  <li key={`file-${index}`} className="text-sm text-gray-600 flex items-center">📄 {file}</li>
                ))}
              </ul>
            )}
          </li>
        )
      })}
    </ul>
  )
}

// 基于directory_structure准确获取目标基础路径
const getTargetBasePath = (mappingTable, directoryStructure) => {
  
  if (!mappingTable || mappingTable.length === 0 || !directoryStructure) {
    return ''
  }
  
  // 获取directory_structure的顶级目录名
  const topLevelDirs = Object.keys(directoryStructure)
  
  // 从第一个文件路径中找到这些顶级目录的位置
  const firstPath = mappingTable[0].new_directory
  
  const parts = firstPath.split('/').filter(part => part.trim() !== '')
  
  // 找到第一个匹配顶级目录的位置
  for (let i = parts.length - 1; i >= 0; i--) {
    
    if (topLevelDirs.includes(parts[i])) {
      // 找到了顶级目录，那么它之前的所有部分就是目标基础路径
      const basePath = parts.slice(0, i).join('/')
      return basePath
    }
  }
  
  return ''
}

// 从路径中提取分类信息
const extractCategoryFromPath = (filePath, targetBasePath, directoryStructure) => {
  
  if (!targetBasePath || targetBasePath === '') {
    
    // 如果没有targetBasePath，尝试从目录结构中推断
    if (directoryStructure && Object.keys(directoryStructure).length > 0) {
      const topLevelDirs = Object.keys(directoryStructure)
      
      for (const topDir of topLevelDirs) {
        if (filePath.includes(topDir)) {
          const pathAfterTop = filePath.split(topDir)[1]
          if (pathAfterTop) {
            const pathParts = pathAfterTop.split('/').filter(part => part.length > 0)
            
            return {
              level1: topDir,
              level2: pathParts[0] || '',
              level3: pathParts[1] || ''
            }
          }
          return { level1: topDir, level2: '', level3: '' }
        }
      }
    }
    
    return { level1: '', level2: '', level3: '' }
  }
  
  // 移除文件名，只保留目录路径
  const directoryPath = filePath.substring(0, filePath.lastIndexOf('/'))
  
  // 检查是否在目标文件夹内
  if (!directoryPath.includes(targetBasePath)) {
    return { level1: '', level2: '', level3: '' }
  }
  
  // 获取相对于目标基础路径的相对路径
  const relativePath = directoryPath.substring(directoryPath.indexOf(targetBasePath) + targetBasePath.length)
  
  // 移除开头的斜杠
  const cleanPath = relativePath.startsWith('/') ? relativePath.substring(1) : relativePath
  const pathParts = cleanPath.split('/').filter(part => part.length > 0)
  
  const result = {
    level1: pathParts[0] || '',
    level2: pathParts[1] || '',
    level3: pathParts[2] || ''
  }
  
  return result
}

const AnalysisPage = ({ analysisData, setAnalysisResults }) => {
  const [status, setStatus] = useState(null)
  const [error, setError] = useState('')
  const [isPolling, setIsPolling] = useState(true)
  const [showMigrationConfirm, setShowMigrationConfirm] = useState(false)
  const navigate = useNavigate()

  const pollStatus = useCallback(async (taskId) => {
    try {
      const response = await fetch(API_ENDPOINTS.classificationStatus(taskId))
      
      if (!response.ok) {
        throw new Error(`获取分析状态失败 (HTTP ${response.status})`)
      }

      const data = await response.json()

      if (data.status === 'completed' || data.status === 'error') {
        setIsPolling(false)
      }
      setStatus(data)

    } catch (err) {
      console.error('💥 状态查询失败:', err)
      setError(err.message)
      setIsPolling(false)
    }
  }, [])

  useEffect(() => {
    if (!analysisData?.taskId) {
      navigate('/')
      return
    }

    // 立即执行一次
    pollStatus(analysisData.taskId)

    // 设置轮询
    const interval = setInterval(() => {
      if (isPolling) {
        pollStatus(analysisData.taskId)
      }
    }, 2000)

    return () => clearInterval(interval)
  }, [analysisData, navigate, isPolling, pollStatus])

  const handleStartMigration = () => {
    setShowMigrationConfirm(true)
  }

  const handleConfirmMigration = () => {
    setShowMigrationConfirm(false)
    executeMigration()
  }

  const executeMigration = () => {
    // 将结果转换为迁移页面期望的格式
    if (status?.results?.mapping_table) {
      
      // 转换数据格式：从 mapping_table 转换为 classifications
      const classifications = status.results.mapping_table
        .filter(item => !item.new_directory.includes('(歧义，需讨论)')) // 过滤掉歧义文件
        .map(item => ({
          source_path: item.source_path,
          suggested_path: item.new_directory,
          filename: item.filename,
          original_directory: item.original_directory
        }))
      
      
      if (classifications.length === 0) {
        alert('没有可迁移的文件（所有文件都存在分类歧义）')
        return
      }
      
      setAnalysisResults(classifications)
      navigate('/migration')
    }
  }

  const getProgressPercentage = () => {
    // 使用新的 stage_progress 字段，如果没有则回退到旧逻辑
    if (status?.stage_progress !== undefined) {
      return status.stage_progress
    }
    
    // 旧逻辑作为回退
    if (!status || status.total_files === 0) return 0
    return Math.round((status.processed_files / status.total_files) * 100)
  }

  const getCurrentStageInfo = () => {
    if (!status) return { title: '正在初始化...', description: '', showFile: false }
    
    const stage = status.stage || status.status
    
    switch (stage) {
      case 'started':
        return {
          title: '正在初始化',
          description: '正在准备文件分析任务...',
          showFile: false,
          icon: '🚀'
        }
      case 'scanning':
        return {
          title: '正在扫描文件夹',
          description: '正在寻找需要分类的文件...',
          showFile: false,
          icon: '🔍'
        }
      case 'collecting':
        return {
          title: '正在收集文件信息',
          description: `正在读取文件元数据和内容预览 (${status.processed_files}/${status.total_files})`,
          showFile: true,
          icon: '📋'
        }
      case 'ai_analyzing':
        return {
          title: 'AI 正在智能分析',
          description: status.message || `AI 正在分析 ${status.total_files} 个文件，生成PARA分类方案...`,
          showFile: false,
          icon: '🤖',
          showBatchProgress: status.message && status.message.includes('批次')
        }
      case 'processing':
        return {
          title: '正在处理分析结果',
          description: '正在验证和优化分类方案...',
          showFile: false,
          icon: '⚙️'
        }
      case 'completed':
        const totalDuration = status.total_duration
        const durationText = totalDuration 
          ? totalDuration < 60 
            ? `${totalDuration.toFixed(1)}秒`
            : `${(totalDuration / 60).toFixed(1)}分钟`
          : ''
        
        return {
          title: '分析完成',
          description: `所有文件已成功分类${durationText ? `，总耗时 ${durationText}` : ''}`,
          showFile: false,
          icon: '✅'
        }
      default:
        return {
          title: '正在处理...',
          description: status.message || '请稍候...',
          showFile: status.current_file ? true : false,
          icon: '⏳'
        }
    }
  }

  // 组件化渲染部分
  const renderProgressView = () => {
    const stageInfo = getCurrentStageInfo()
    
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="text-4xl animate-pulse">{stageInfo.icon}</div>
          </div>
          <CardTitle className="text-2xl">{stageInfo.title}</CardTitle>
          <CardDescription>{stageInfo.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">整体进度</span>
              <span>{getProgressPercentage()}%</span>
            </div>
            <Progress value={getProgressPercentage()} className="h-3" />
          </div>
          
          {/* 只在收集文件信息阶段显示当前文件 */}
          {stageInfo.showFile && status?.current_file && (
            <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
              <FileText className="h-4 w-4" />
              <span>正在处理: <span className="font-mono">{status.current_file}</span></span>
            </div>
          )}
          
          {/* 阶段指示器 */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">处理阶段</span>
              <span className="text-sm text-gray-500">
                {status?.total_files ? `${status.total_files} 个文件` : ''}
              </span>
            </div>
            <div className="flex items-center space-x-1 text-xs overflow-x-auto">
              <div className={`flex items-center space-x-1 px-2 py-1 rounded whitespace-nowrap ${
                ['started'].includes(status?.stage) ? 'bg-blue-100 text-blue-800' : 
                ['scanning', 'collecting', 'ai_analyzing', 'processing', 'completed'].includes(status?.stage) ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-600'
              }`}>
                <span>🚀</span>
                <span>初始化</span>
              </div>
              <div className="h-0.5 w-2 bg-gray-300"></div>
              <div className={`flex items-center space-x-1 px-2 py-1 rounded whitespace-nowrap ${
                ['scanning'].includes(status?.stage) ? 'bg-blue-100 text-blue-800' : 
                ['collecting', 'ai_analyzing', 'processing', 'completed'].includes(status?.stage) ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-600'
              }`}>
                <span>🔍</span>
                <span>扫描</span>
              </div>
              <div className="h-0.5 w-2 bg-gray-300"></div>
              <div className={`flex items-center space-x-1 px-2 py-1 rounded whitespace-nowrap ${
                ['collecting'].includes(status?.stage) ? 'bg-blue-100 text-blue-800' : 
                ['ai_analyzing', 'processing', 'completed'].includes(status?.stage) ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-600'
              }`}>
                <span>📋</span>
                <span>收集</span>
              </div>
              <div className="h-0.5 w-2 bg-gray-300"></div>
              <div className={`flex items-center space-x-1 px-2 py-1 rounded whitespace-nowrap ${
                ['ai_analyzing'].includes(status?.stage) ? 'bg-blue-100 text-blue-800' : 
                ['processing', 'completed'].includes(status?.stage) ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-600'
              }`}>
                <span>🤖</span>
                <span>AI分析</span>
              </div>
              <div className="h-0.5 w-2 bg-gray-300"></div>
              <div className={`flex items-center space-x-1 px-2 py-1 rounded whitespace-nowrap ${
                ['processing'].includes(status?.stage) ? 'bg-blue-100 text-blue-800' : 
                ['completed'].includes(status?.stage) ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-600'
              }`}>
                <span>⚙️</span>
                <span>处理</span>
              </div>
              <div className="h-0.5 w-2 bg-gray-300"></div>
              <div className={`flex items-center space-x-1 px-2 py-1 rounded whitespace-nowrap ${
                ['completed'].includes(status?.stage) ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-600'
              }`}>
                <span>✅</span>
                <span>完成</span>
              </div>
            </div>
          </div>
          
          {/* AI分析阶段的特殊提示 */}
          {status?.stage === 'ai_analyzing' && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center space-x-2 text-blue-800">
                <Brain className="h-5 w-5" />
                <span className="font-medium">
                  {stageInfo.showBatchProgress ? 'AI 正在分批深度分析' : 'AI 正在深度分析'}
                </span>
              </div>
              {stageInfo.showBatchProgress ? (
                <div className="mt-2 space-y-2">
                  <p className="text-sm text-blue-600">
                    {status.message}
                  </p>
                  
                  {/* 预计剩余时间显示 */}
                  {status.estimated_remaining_time !== undefined && status.estimated_remaining_time > 0 && (
                    <div className="bg-blue-100 rounded p-3">
                      <div className="flex items-center justify-between text-sm">
                        <div className="text-blue-800">
                          <span className="font-medium">⏱️ 预计剩余时间:</span>
                          <span className="ml-2">
                            {status.estimated_remaining_time < 60 
                              ? `${Math.ceil(status.estimated_remaining_time)}秒`
                              : status.estimated_remaining_time < 3600
                                ? `${Math.floor(status.estimated_remaining_time / 60)}分${Math.ceil(status.estimated_remaining_time % 60)}秒`
                                : `${Math.floor(status.estimated_remaining_time / 3600)}小时${Math.floor((status.estimated_remaining_time % 3600) / 60)}分钟`
                            }
                          </span>
                        </div>
                        {status.average_batch_time && (
                          <div className="text-blue-600 text-xs">
                            平均每批次: {status.average_batch_time.toFixed(1)}秒
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  <p className="text-xs text-blue-500">
                    📦 大数据量文件分批处理中，确保稳定性和准确性
                  </p>
                  <div className="bg-blue-100 rounded p-2 text-xs text-blue-700">
                    💡 分批处理优势：避免超时、提高成功率、实时进度反馈
                  </div>
                </div>
              ) : (
                <div className="mt-2 space-y-2">
                  <p className="text-sm text-blue-600">
                    AI 正在理解文件内容和结构，为每个文件找到最合适的PARA分类位置。这个过程需要一些时间，请耐心等待...
                  </p>
                  
                  {/* 单批次处理的预计时间 */}
                  {status.total_files && status.total_files <= 50 && (
                    <div className="bg-blue-100 rounded p-2 text-xs text-blue-700">
                      💡 预计处理时间: 约 {Math.ceil(status.total_files / 30 * 1.5)} 分钟 (基于文件数量估算)
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  const renderErrorView = () => (
    <Card className="max-w-2xl mx-auto">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <XCircle className="h-10 w-10 text-red-500" />
        </div>
        <CardTitle className="text-2xl text-red-600">分析失败</CardTitle>
        <CardDescription>{error || status?.message || '未知错误'}</CardDescription>
      </CardHeader>
      <CardFooter className="flex justify-center">
        <Button onClick={() => navigate('/')} variant="outline">返回主页</Button>
      </CardFooter>
    </Card>
  )
  
  const renderResultsView = () => {
    const { mapping_table, directory_structure, discussion_points } = status.results
    
    // 调试：输出数据结构
    
    // 提取目标基础路径
    const targetBasePath = getTargetBasePath(mapping_table, directory_structure)
    
    // 从directory_structure中提取真正的目标文件夹内容
    const getTargetDirectoryStructure = (fullStructure, basePath) => {
      
      if (!fullStructure || !basePath) {
        return fullStructure
      }
      
      // 通过路径导航到目标文件夹的内容
      const pathParts = basePath.split('/').filter(part => part.trim() !== '')
      
      let current = fullStructure
      
      // 逐层深入到目标位置
      for (let i = 0; i < pathParts.length; i++) {
        const part = pathParts[i]
        
        if (current && current[part]) {
          current = current[part]
        } else {
          Object.keys(current || {}).forEach(key => {
            if (key.includes(part) || part.includes(key)) {
            }
          })
          return fullStructure // 如果找不到，返回原结构
        }
      }
      
      return current || fullStructure
    }
    
    const targetDirectoryStructure = getTargetDirectoryStructure(directory_structure, targetBasePath)

    return (
      <div className="space-y-6">
        {/* 1. 结果总览和操作 */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-2xl flex items-center">
                  <CheckCircle className="h-6 w-6 text-green-600 mr-2" />
                  智能分类方案已生成
                </CardTitle>
                <CardDescription>AI 已为您规划好文件的新家，请审查后执行迁移。</CardDescription>
              </div>
              <Button onClick={handleStartMigration} size="lg">
                <ArrowRight className="mr-2 h-5 w-5" />
                开始迁移
              </Button>
            </div>
          </CardHeader>
        </Card>

        {/* 迁移确认对话框 */}
        <AlertDialog open={showMigrationConfirm} onOpenChange={setShowMigrationConfirm}>
          <AlertDialogContent className="max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center text-orange-600">
                <Shield className="h-5 w-5 mr-2" />
                重要提醒：文件迁移不可逆
              </AlertDialogTitle>
              <AlertDialogDescription className="space-y-3">
                <p className="text-gray-700">
                  即将开始文件迁移，此操作将<strong className="text-red-600">永久移动</strong>您的文件到新位置。
                </p>
                
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <h4 className="font-semibold text-yellow-800 mb-2">⚠️ 强烈建议在迁移前备份：</h4>
                  <ul className="text-sm text-yellow-700 space-y-1">
                    <li>• <strong>原文件夹</strong>：{analysisData?.sourcePath || '待整理的文件夹'}</li>
                    <li>• <strong>目标文件夹</strong>：{analysisData?.targetPath || '目标整理位置'}</li>
                    <li>• <strong>备份建议</strong>：复制到安全位置或创建时间点快照</li>
                  </ul>
                </div>

                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <h4 className="font-semibold text-red-800 mb-1">🚨 注意事项：</h4>
                  <ul className="text-sm text-red-700 space-y-1">
                    <li>• 文件移动后无法自动撤销</li>
                    <li>• 请确认分类方案符合预期</li>
                    <li>• 迁移过程中请勿关闭程序</li>
                  </ul>
                </div>

                <p className="text-sm text-gray-600">
                  确认要继续文件迁移吗？
                </p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-col sm:flex-row gap-2">
              <AlertDialogCancel className="w-full sm:w-auto">
                取消迁移
              </AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleConfirmMigration}
                className="w-full sm:w-auto bg-orange-600 hover:bg-orange-700"
              >
                我已备份，继续迁移
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* 2. 重要提醒：优先显示模糊文件模块 */}
        {(() => {
          // 获取歧义文件：从mapping_table中过滤包含"歧义"的文件
          const ambiguousFiles = mapping_table ? mapping_table.filter(item => 
            item.new_directory && item.new_directory.includes('歧义')
          ) : []
          
          // 获取讨论点
          const validDiscussionPoints = discussion_points && Array.isArray(discussion_points) 
            ? discussion_points.filter(item => item && item.filename && item.suggestion)
            : []
          
          
          // 如果有歧义文件或讨论点，显示模块
          const hasAmbiguousContent = ambiguousFiles.length > 0 || validDiscussionPoints.length > 0
          
          if (!hasAmbiguousContent) return null
          
          return (
            <Card className="border-orange-200 bg-orange-50">
              <CardHeader>
                <CardTitle className="flex items-center text-orange-600">
                  <AlertTriangle className="h-5 w-5 mr-2" />
                  ⚠️ 需要您决策的模糊文件 ({ambiguousFiles.length + validDiscussionPoints.length} 个)
                </CardTitle>
                <CardDescription className="text-orange-700">
                  AI 无法为以下文件确定唯一分类，需要您手动决策。自动迁移将跳过这些文件，您可以稍后手动处理。
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="max-h-[300px] overflow-y-auto space-y-3">
                  {/* 显示歧义文件 */}
                  {ambiguousFiles.map((item, index) => {
                    const categoryInfo = extractCategoryFromPath(item.new_directory, targetBasePath, directory_structure)
                    return (
                      <Alert key={`ambiguous-${index}`} variant="default" className="bg-white border-orange-300">
                        <Shuffle className="h-4 w-4" />
                        <AlertTitle className="font-semibold">{item.filename}</AlertTitle>
                        <AlertDescription>
                          路径包含歧义标记：{item.new_directory}
                          {categoryInfo.level1 && (
                            <div className="mt-1 text-sm text-gray-600">
                              建议分类：{categoryInfo.level1}
                              {categoryInfo.level2 && ` > ${categoryInfo.level2}`}
                              {categoryInfo.level3 && ` > ${categoryInfo.level3}`}
                            </div>
                          )}
                        </AlertDescription>
                      </Alert>
                    )
                  })}
                  
                  {/* 显示讨论点 */}
                  {validDiscussionPoints.map((item, index) => (
                    <Alert key={`discussion-${index}`} variant="default" className="bg-white border-orange-300">
                      <Shuffle className="h-4 w-4" />
                      <AlertTitle className="font-semibold">{item.filename}</AlertTitle>
                      <AlertDescription>{item.suggestion}</AlertDescription>
                    </Alert>
                  ))}
                </div>
              </CardContent>
            </Card>
          )
        })()}

        {/* 3. 主要内容：目录结构和文件详情并排，设置合理高度 */}
        <div className="grid lg:grid-cols-5 gap-6">
          {/* 左侧：新目录结构预览 */}
          <div className="lg:col-span-2">
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FolderTree className="h-5 w-5 mr-2" />
                  新目录结构预览
                </CardTitle>
                <CardDescription className="text-sm text-gray-500 flex items-center">
                  <FolderPlus className="h-4 w-4 mr-1 text-green-600" />
                  <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-green-100 text-green-800 border border-green-200">
                    新增
                  </span>
                  <span className="ml-2">标记新增的子目录</span>
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* 设置固定高度和滚动 */}
                <div className="h-[500px] overflow-y-auto border border-gray-100 rounded-lg p-4 bg-gray-50">
                  <div key={JSON.stringify(targetDirectoryStructure).slice(0, 50)}>
                    {renderTree(targetDirectoryStructure)}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* 右侧：文件分类详情 */}
          <div className="lg:col-span-3">
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center">
                    <FolderKanban className="h-5 w-5 mr-2" />
                    文件分类详情
                  </div>
                  <div className="text-sm text-gray-500">
                    共 {mapping_table ? mapping_table.length : 0} 个文件
                  </div>
                </CardTitle>
                <CardDescription>
                  文件名固定在左侧，显示最靠近文件的分类信息
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* 设置固定高度和滚动 */}
                <div className="h-[500px] overflow-auto border border-gray-100 rounded-lg">
                  <Table>
                    <TableHeader className="sticky top-0 bg-white z-10">
                      <TableRow>
                        <TableHead className="sticky left-0 bg-white min-w-[200px] z-20 border-r">
                          文件名
                        </TableHead>
                        <TableHead className="min-w-[120px]">一级分类</TableHead>
                        <TableHead className="min-w-[120px]">二级分类</TableHead>
                        <TableHead className="min-w-[120px]">三级分类</TableHead>
                        <TableHead className="min-w-[300px]">完整路径</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mapping_table && mapping_table.map((item, index) => {
                        const categoryInfo = extractCategoryFromPath(item.new_directory, targetBasePath, directory_structure)
                        const isAmbiguous = item.new_directory.includes('歧义')
                        
                        // 调试每个item的结构
                        if (index === 0) {
                        }
                        
                        return (
                          <TableRow key={index} className={isAmbiguous ? 'bg-orange-50 text-gray-600' : 'hover:bg-gray-50'}>
                            <TableCell className="sticky left-0 bg-white font-medium z-10 border-r">
                              <div className="flex items-center space-x-2">
                                <span className="truncate max-w-[180px]" title={item.filename}>
                                  {item.filename}
                                </span>
                                {isAmbiguous && (
                                  <Badge variant="outline" className="text-xs text-orange-600 border-orange-200">
                                    待讨论
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {categoryInfo.level1 && (
                                <Badge variant="secondary" className="text-xs">
                                  {categoryInfo.level1}
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {categoryInfo.level2 && (
                                <span className="text-sm font-medium">
                                  {categoryInfo.level2}
                                </span>
                              )}
                            </TableCell>
                            <TableCell>
                              {categoryInfo.level3 && (
                                <span className="text-sm text-gray-600">
                                  {categoryInfo.level3}
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="font-mono text-xs text-gray-500">
                              <div 
                                className="max-w-[280px] truncate text-right cursor-help hover:bg-gray-100 p-1 rounded" 
                                title={`完整路径: ${item.new_directory || 'undefined'}`}
                                onMouseEnter={(e) => {
                                }}
                              >
                                {item.new_directory || '路径缺失'}
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* 4. 快速统计信息 */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-blue-600">
                  {mapping_table ? mapping_table.length : 0}
                </div>
                <div className="text-sm text-blue-700">总文件数</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {mapping_table ? mapping_table.filter(item => !item.new_directory.includes('歧义')).length : 0}
                </div>
                <div className="text-sm text-green-700">可自动迁移</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-orange-600">
                  {(() => {
                    const ambiguousFiles = mapping_table ? mapping_table.filter(item => 
                      item.new_directory && item.new_directory.includes('歧义')
                    ) : []
                    const validDiscussionPoints = discussion_points && Array.isArray(discussion_points) 
                      ? discussion_points.filter(item => item && item.filename && item.suggestion)
                      : []
                    return ambiguousFiles.length + validDiscussionPoints.length
                  })()}
                </div>
                <div className="text-sm text-orange-700">需要决策</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-600">
                  {targetDirectoryStructure ? Object.keys(targetDirectoryStructure).length : 0}
                </div>
                <div className="text-sm text-purple-700">目录分类</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!status) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-12 w-12 text-blue-600 animate-spin" />
      </div>
    )
  }

  if (status.status === 'completed') {
    return <div className="container mx-auto px-4 py-8">{renderResultsView()}</div>
  }
  
  if (status.status === 'error') {
    return <div className="container mx-auto px-4 py-8">{renderErrorView()}</div>
  }

  return <div className="container mx-auto px-4 py-8">{renderProgressView()}</div>
}

export default AnalysisPage

