import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Progress } from './ui/progress'
import { Alert, AlertDescription } from './ui/alert'
import { Checkbox } from './ui/checkbox'
import { Badge } from './ui/badge'
import { CheckCircle, XCircle, FolderTree, ArrowRight, Home, AlertTriangle } from 'lucide-react'
import { API_ENDPOINTS } from '../config/api'

const MigrationPage = ({ classifications }) => {
  const [migrationStatus, setMigrationStatus] = useState('preparing')
  const [migrationResults, setMigrationResults] = useState(null)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  // 如果没有分类数据，重定向到首页
  if (!classifications || classifications.length === 0) {
    navigate('/')
    return null
  }

  useEffect(() => {
    const startMigration = async () => {
      try {
        setMigrationStatus('migrating')
        
        
        const migrationData = {
          classifications: classifications.map(item => ({
            source_path: item.source_path,
            target_path: item.suggested_path
          }))
        }
        
        
        const response = await fetch(API_ENDPOINTS.migrate, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            classifications: classifications.map(item => ({
              source_path: item.source_path,
              target_path: item.suggested_path
            }))
          })
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || '迁移失败')
        }

        const data = await response.json()
        setMigrationResults(data)
        setMigrationStatus('completed')
      } catch (err) {
        setError(err.message)
        setMigrationStatus('error')
      }
    }

    // 延迟1秒开始迁移，让用户看到准备状态
    const timer = setTimeout(startMigration, 1000)
    return () => clearTimeout(timer)
  }, [classifications])

  // 获取新建文件夹列表
  const getNewFolders = () => {
    const folders = new Set()
    classifications.forEach(item => {
      const dir = item.suggested_path.substring(0, item.suggested_path.lastIndexOf('/'))
      folders.add(dir)
    })
    return Array.from(folders).sort()
  }

  // 获取分类统计
  const getCategoryStats = () => {
    const stats = { Projects: 0, Areas: 0, Resources: 0, Archive: 0, Other: 0 }
    classifications.forEach(item => {
      const parts = item.suggested_path.split('/')
      for (const part of parts) {
        if (['Projects', 'Areas', 'Resources', 'Archive'].includes(part)) {
          stats[part]++
          return
        }
      }
      stats.Other++
    })
    return stats
  }

  const renderPreparingState = () => (
    <Card>
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
        <CardTitle className="text-2xl text-blue-600">准备迁移</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="text-center">
          <p className="text-lg text-gray-600 mb-4">
            即将迁移 {classifications.length} 个文件
          </p>
        </div>

        {/* 新建文件夹预览 */}
        <div>
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
            <FolderTree className="h-5 w-5 mr-2" />
            将创建的文件夹：
          </h3>
          <div className="bg-gray-50 rounded-lg p-4 max-h-40 overflow-y-auto">
            {getNewFolders().map((folder, index) => (
              <div key={index} className="font-mono text-sm text-gray-700 py-1">
                {folder}
              </div>
            ))}
          </div>
        </div>

        {/* 分类统计 */}
        <div>
          <h3 className="font-semibold text-gray-900 mb-3">分类统计：</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(getCategoryStats()).map(([category, count]) => (
              count > 0 && (
                <div key={category} className="text-center p-3 bg-blue-50 rounded-lg">
                  <div className="text-xl font-bold text-blue-900">{count}</div>
                  <div className="text-sm text-blue-700">{category}</div>
                </div>
              )
            ))}
          </div>
        </div>

        {/* 注意事项 */}
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>注意事项：</strong>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>此操作将移动文件到新位置</li>
              <li>请确保目标路径正确</li>
              <li>建议先备份重要文件</li>
              <li>如果目标文件已存在，将跳过迁移</li>
            </ul>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  )

  const renderMigratingState = () => (
    <Card>
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
        <CardTitle className="text-2xl text-blue-600">正在迁移文件</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="text-center">
          <p className="text-lg text-gray-600">
            正在移动 {classifications.length} 个文件...
          </p>
        </div>
        <Progress value={50} className="h-3" />
        <div className="text-center text-sm text-gray-500">
          <p>请耐心等待，正在创建文件夹并移动文件</p>
        </div>
      </CardContent>
    </Card>
  )

  const renderCompletedState = () => (
    <Card>
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <CheckCircle className="h-12 w-12 text-green-600" />
        </div>
        <CardTitle className="text-2xl text-green-600">迁移完成</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 迁移摘要 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-900">
              {migrationResults?.summary.success || 0}
            </div>
            <div className="text-sm text-green-700">成功迁移</div>
          </div>
          <div className="text-center p-4 bg-yellow-50 rounded-lg">
            <div className="text-2xl font-bold text-yellow-900">
              {migrationResults?.summary.skipped || 0}
            </div>
            <div className="text-sm text-yellow-700">跳过文件</div>
          </div>
          <div className="text-center p-4 bg-red-50 rounded-lg">
            <div className="text-2xl font-bold text-red-900">
              {migrationResults?.summary.failed || 0}
            </div>
            <div className="text-sm text-red-700">失败文件</div>
          </div>
        </div>

        {/* 详细结果 */}
        {migrationResults && (
          <div className="space-y-4">
            {/* 跳过的文件 */}
            {migrationResults.results.skipped.length > 0 && (
              <div>
                <h3 className="font-semibold text-yellow-800 mb-2 flex items-center">
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  跳过的文件 ({migrationResults.results.skipped.length})
                </h3>
                <div className="bg-yellow-50 rounded-lg p-4 max-h-32 overflow-y-auto">
                  {migrationResults.results.skipped.map((item, index) => (
                    <div key={index} className="text-sm text-yellow-800 py-1">
                      {item.source.split('/').pop()} - {item.reason}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 失败的文件 */}
            {migrationResults.results.failed.length > 0 && (
              <div>
                <h3 className="font-semibold text-red-800 mb-2 flex items-center">
                  <XCircle className="h-4 w-4 mr-2" />
                  失败的文件 ({migrationResults.results.failed.length})
                </h3>
                <div className="bg-red-50 rounded-lg p-4 max-h-32 overflow-y-auto">
                  {migrationResults.results.failed.map((item, index) => (
                    <div key={index} className="text-sm text-red-800 py-1">
                      {item.source.split('/').pop()} - {item.error}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 操作按钮 */}
        <div className="flex justify-center space-x-4">
          <Button onClick={() => navigate('/')}>
            <Home className="h-4 w-4 mr-2" />
            返回首页
          </Button>
        </div>

        <div className="text-center text-sm text-gray-500">
          <p>文件已按照 PARA 方法成功分类整理</p>
        </div>
      </CardContent>
    </Card>
  )

  const renderErrorState = () => (
    <Card>
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <XCircle className="h-12 w-12 text-red-600" />
        </div>
        <CardTitle className="text-2xl text-red-600">迁移失败</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>

        <div className="flex justify-center space-x-4">
          <Button variant="outline" onClick={() => navigate('/results')}>
            返回结果页
          </Button>
          <Button onClick={() => navigate('/')}>
            返回首页
          </Button>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {migrationStatus === 'preparing' && renderPreparingState()}
      {migrationStatus === 'migrating' && renderMigratingState()}
      {migrationStatus === 'completed' && renderCompletedState()}
      {migrationStatus === 'error' && renderErrorState()}
    </div>
  )
}

export default MigrationPage

