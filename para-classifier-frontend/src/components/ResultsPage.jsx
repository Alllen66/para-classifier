import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Checkbox } from './ui/checkbox'
import { Badge } from './ui/badge'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from './ui/table'
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog'
import { Label } from './ui/label'
import { 
  FileText, 
  Edit, 
  CheckCircle2, 
  ArrowRight, 
  Download,
  Filter,
  Search,
  FolderTree,
  Brain
} from 'lucide-react'

const ResultsPage = ({ results, onMigrate }) => {
  const [selectedFiles, setSelectedFiles] = useState(new Set())
  const [editingFile, setEditingFile] = useState(null)
  const [editPath, setEditPath] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCategory, setFilterCategory] = useState('all')
  const [directoryStructure, setDirectoryStructure] = useState({})
  const [showStructure, setShowStructure] = useState(false)
  const navigate = useNavigate()

  // 如果没有结果，重定向到首页
  if (!results || results.length === 0) {
    navigate('/')
    return null
  }

  // 处理后的结果数据
  const processedResults = useMemo(() => {
    return results.map((result, index) => ({
      ...result,
      id: index,
      category: extractCategory(result.suggested_path),
      subcategory: extractSubcategory(result.suggested_path),
      selected: selectedFiles.has(index)
    }))
  }, [results, selectedFiles])

  // 过滤和搜索
  const filteredResults = useMemo(() => {
    return processedResults.filter(result => {
      const matchesSearch = result.file_info.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           result.suggested_path.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesFilter = filterCategory === 'all' || result.category === filterCategory
      return matchesSearch && matchesFilter
    })
  }, [processedResults, searchTerm, filterCategory])

  // 提取分类
  function extractCategory(path) {
    const parts = path.split('/')
    for (const part of parts) {
      if (['Projects', 'Areas', 'Resources', 'Archive'].includes(part)) {
        return part
      }
    }
    return 'Other'
  }

  // 提取子分类
  function extractSubcategory(path) {
    const parts = path.split('/')
    const categoryIndex = parts.findIndex(part => 
      ['Projects', 'Areas', 'Resources', 'Archive'].includes(part)
    )
    if (categoryIndex >= 0 && categoryIndex + 1 < parts.length) {
      return parts[categoryIndex + 1]
    }
    return ''
  }

  // 获取分类统计
  const categoryStats = useMemo(() => {
    const stats = { Projects: 0, Areas: 0, Resources: 0, Archive: 0, Other: 0 }
    processedResults.forEach(result => {
      stats[result.category] = (stats[result.category] || 0) + 1
    })
    return stats
  }, [processedResults])

  // 获取子分类统计
  const subcategoryStats = useMemo(() => {
    const stats = {}
    processedResults.forEach(result => {
      if (result.subcategory) {
        stats[result.subcategory] = (stats[result.subcategory] || 0) + 1
      }
    })
    return Object.entries(stats)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10) // 显示前10个子分类
  }, [processedResults])

  // 全选/取消全选
  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedFiles(new Set(filteredResults.map(r => r.id)))
    } else {
      setSelectedFiles(new Set())
    }
  }

  // 单个文件选择
  const handleFileSelect = (fileId, checked) => {
    const newSelected = new Set(selectedFiles)
    if (checked) {
      newSelected.add(fileId)
    } else {
      newSelected.delete(fileId)
    }
    setSelectedFiles(newSelected)
  }

  // 开始编辑
  const handleEdit = (result) => {
    setEditingFile(result)
    setEditPath(result.suggested_path)
  }

  // 保存编辑
  const handleSaveEdit = () => {
    if (editingFile && editPath) {
      // 更新结果
      const updatedResults = results.map(result => 
        result.source_path === editingFile.source_path 
          ? { ...result, suggested_path: editPath }
          : result
      )
      onMigrate(updatedResults)
      setEditingFile(null)
      setEditPath('')
    }
  }

  // 开始迁移
  const handleMigrate = () => {
    const selectedResults = results.filter((_, index) => selectedFiles.has(index))
    onMigrate(selectedResults)
    navigate('/migration')
  }

  // 导出结果
  const handleExport = () => {
    const exportData = filteredResults.map(result => ({
      fileName: result.file_info.name,
      sourcePath: result.source_path,
      suggestedPath: result.suggested_path,
      category: result.category,
      subcategory: result.subcategory,
      fileSize: result.file_info.size,
      fileType: result.file_info.extension
    }))

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
      type: 'application/json' 
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'para-classification-results.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  const getCategoryColor = (category) => {
    const colors = {
      Projects: 'bg-blue-100 text-blue-800',
      Areas: 'bg-green-100 text-green-800',
      Resources: 'bg-yellow-100 text-yellow-800',
      Archive: 'bg-gray-100 text-gray-800',
      Other: 'bg-purple-100 text-purple-800'
    }
    return colors[category] || colors.Other
  }

  // 渲染目录结构
  const renderDirectoryStructure = () => {
    // 从结果中构建目录结构
    const structure = {}
    processedResults.forEach(result => {
      const parts = result.suggested_path.split('/')
      const category = extractCategory(result.suggested_path)
      const subcategory = extractSubcategory(result.suggested_path)
      
      if (!structure[category]) {
        structure[category] = {}
      }
      if (subcategory && !structure[category][subcategory]) {
        structure[category][subcategory] = []
      }
      
      // 提取三级分类
      const categoryIndex = parts.findIndex(part => 
        ['Projects', 'Areas', 'Resources', 'Archive'].includes(part)
      )
      if (categoryIndex >= 0 && categoryIndex + 2 < parts.length) {
        const thirdLevel = parts[categoryIndex + 2]
        if (subcategory && !structure[category][subcategory].includes(thirdLevel)) {
          structure[category][subcategory].push(thirdLevel)
        }
      }
    })

    return (
      <Dialog open={showStructure} onOpenChange={setShowStructure}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Brain className="h-5 w-5 mr-2" />
              AI 生成的智能目录结构
            </DialogTitle>
            <DialogDescription>
              基于您的文件内容和用途，AI 智能生成的 PARA 分类目录结构
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {Object.entries(structure).map(([level1, level2Dict]) => (
              <div key={level1} className="border rounded-lg p-4">
                <div className="font-bold text-lg mb-3 flex items-center">
                  <Badge className={getCategoryColor(level1)}>
                    {level1}
                  </Badge>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(level2Dict).map(([level2, level3List]) => (
                    <div key={level2} className="bg-gray-50 rounded p-3">
                      <div className="font-semibold text-gray-900 mb-2">📂 {level2}</div>
                      {level3List.length > 0 && (
                        <div className="space-y-1">
                          {level3List.map((level3, index) => (
                            <div key={index} className="text-sm text-gray-700 ml-4">
                              📄 {level3}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button onClick={() => setShowStructure(false)}>
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* 头部 */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-bold text-gray-900">智能分类结果</h1>
          <Button 
            variant="outline" 
            onClick={() => setShowStructure(true)}
            className="flex items-center"
          >
            <FolderTree className="h-4 w-4 mr-2" />
            查看目录结构
          </Button>
        </div>
        
        {/* 统计信息 */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          {Object.entries(categoryStats).map(([category, count]) => (
            <Card key={category}>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-gray-900">{count}</div>
                <div className="text-sm text-gray-600">{category}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* 子分类统计 */}
        {subcategoryStats.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">主要子分类</h3>
            <div className="flex flex-wrap gap-2">
              {subcategoryStats.map(([subcategory, count]) => (
                <Badge key={subcategory} variant="secondary" className="text-sm">
                  {subcategory} ({count})
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* 搜索和过滤 */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="搜索文件名或路径..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">所有分类</option>
            <option value="Projects">Projects</option>
            <option value="Areas">Areas</option>
            <option value="Resources">Resources</option>
            <option value="Archive">Archive</option>
            <option value="Other">Other</option>
          </select>
        </div>

        {/* 操作按钮 */}
        <div className="flex flex-wrap gap-4">
          <Button
            onClick={handleMigrate}
            disabled={selectedFiles.size === 0}
            className="flex items-center"
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            迁移选中文件 ({selectedFiles.size})
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            导出结果
          </Button>
          <Button variant="outline" onClick={() => navigate('/')}>
            重新分析
          </Button>
        </div>
      </div>

      {/* 结果表格 */}
      <Card>
        <CardHeader>
          <CardTitle>文件分类详情 ({filteredResults.length} 个文件)</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedFiles.size === filteredResults.length && filteredResults.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead>文件名</TableHead>
                <TableHead>一级分类</TableHead>
                <TableHead>二级分类</TableHead>
                <TableHead>建议路径</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredResults.map((result) => (
                <TableRow key={result.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedFiles.has(result.id)}
                      onCheckedChange={(checked) => handleFileSelect(result.id, checked)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <FileText className="h-4 w-4 text-gray-400" />
                      <span className="font-medium">{result.file_info.name}</span>
                    </div>
                    <div className="text-xs text-gray-500">
                      {result.file_info.extension} • {Math.round(result.file_info.size / 1024)} KB
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getCategoryColor(result.category)}>
                      {result.category}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {result.subcategory && (
                      <Badge variant="outline" className="text-xs">
                        {result.subcategory}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="font-mono text-xs text-gray-900 max-w-xs truncate">
                      {result.suggested_path}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(result)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 目录结构对话框 */}
      {renderDirectoryStructure()}

      {/* 编辑对话框 */}
      <Dialog open={!!editingFile} onOpenChange={() => setEditingFile(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑文件路径</DialogTitle>
            <DialogDescription>
              修改 {editingFile?.file_info.name} 的分类路径
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>原路径</Label>
              <div className="font-mono text-sm text-gray-600 bg-gray-50 p-2 rounded">
                {editingFile?.source_path}
              </div>
            </div>
            <div>
              <Label htmlFor="editPath">新路径</Label>
              <Input
                id="editPath"
                value={editPath}
                onChange={(e) => setEditPath(e.target.value)}
                placeholder="输入新的文件路径"
              />
            </div>
            <div className="text-sm text-gray-500">
              <p>PARA 分类建议：</p>
              <ul className="list-disc list-inside space-y-1 mt-2">
                <li><strong>Projects</strong> - 有截止日期的项目</li>
                <li><strong>Areas</strong> - 持续维护的领域</li>
                <li><strong>Resources</strong> - 参考资料</li>
                <li><strong>Archive</strong> - 归档内容</li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingFile(null)}>
              取消
            </Button>
            <Button onClick={handleSaveEdit}>
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default ResultsPage

