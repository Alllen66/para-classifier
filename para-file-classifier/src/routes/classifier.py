import os
import json
import uuid
import threading
from datetime import datetime
from flask import Blueprint, request, jsonify
from werkzeug.utils import secure_filename
from volcenginesdkarkruntime import Ark

classifier_bp = Blueprint('classifier', __name__)

# 存储分析任务的状态
analysis_tasks = {}

# 豆包API配置
DEFAULT_MODEL = "doubao-seed-1-6-thinking-250615"

def get_file_info(file_path):
    """获取文件基本信息"""
    try:
        stat = os.stat(file_path)
        return {
            'name': os.path.basename(file_path),
            'size': stat.st_size,
            'extension': os.path.splitext(file_path)[1].lower(),
            'modified_time': datetime.fromtimestamp(stat.st_mtime).isoformat(),
            'path': file_path,
            'original_directory': os.path.basename(os.path.dirname(file_path))
        }
    except Exception as e:
        return None

def read_file_content(file_path, max_chars=500):
    """读取文件内容（仅文本文件）"""
    text_extensions = ['.txt', '.md', '.py', '.js', '.html', '.css', '.json', '.xml', '.csv', '.doc', '.docx']
    
    try:
        ext = os.path.splitext(file_path)[1].lower()
        if ext not in text_extensions:
            return "非文本文件，无法预览"
            
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read(max_chars)
            return content
    except Exception as e:
        return f"读取文件内容失败: {e}"

def scan_target_directory_structure(target_path):
    """扫描目标文件夹的现有目录结构"""
    structure = {}
    try:
        if not os.path.exists(target_path):
            return {}
        
        for item in os.listdir(target_path):
            item_path = os.path.join(target_path, item)
            if os.path.isdir(item_path):
                # 记录一级目录
                subdirs = []
                try:
                    for subitem in os.listdir(item_path):
                        subitem_path = os.path.join(item_path, subitem)
                        if os.path.isdir(subitem_path):
                            subdirs.append(subitem)
                except PermissionError:
                    continue
                structure[item] = subdirs
        
        # 详细打印目录结构
        for dir_name, subdirs in structure.items():
            if subdirs:
                for subdir in subdirs[:5]:  # 只显示前5个子目录
                if len(subdirs) > 5:
            else:
        return structure
    except Exception as e:
        print(f"❌ 扫描目标目录结构失败: {e}")
        return {}

def validate_classification_plan(classification_plan, existing_structure, target_base_path):
    """验证AI返回的分类方案是否使用了现有目录结构"""
    errors = []
    warnings = []
    
    # 检查必要的键
    if 'mapping_table' not in classification_plan:
        errors.append("缺少 mapping_table 键")
    if 'directory_structure' not in classification_plan:
        errors.append("缺少 directory_structure 键")
    
    if errors:
        return {'valid': False, 'errors': errors, 'warnings': warnings}
    
    existing_dirs = set(existing_structure.keys())
    mapping_table = classification_plan.get('mapping_table', [])
    
    
    # 验证每个文件的新路径
    for i, item in enumerate(mapping_table):
        if 'new_directory' not in item:
            errors.append(f"文件 {item.get('filename', 'unknown')} 缺少 new_directory 字段")
            continue
            
        new_path = item['new_directory']
        
        # 检查路径是否以目标路径开头
        if not new_path.startswith(target_base_path):
            errors.append(f"文件 {item.get('filename')} 的路径不在目标目录下: {new_path}")
            continue
        
        # 提取一级目录
        relative_path = new_path[len(target_base_path):].lstrip('/')
        if not relative_path:
            errors.append(f"文件 {item.get('filename')} 的路径无效: {new_path}")
            continue
            
        first_dir = relative_path.split('/')[0]
        
        # 检查一级目录是否在现有目录中
        if first_dir not in existing_dirs:
            errors.append(f"文件 {item.get('filename')} 使用了不存在的一级目录: {first_dir}")
        
        # 检查是否包含歧义标记
        if "(歧义，需讨论)" in new_path:
            warnings.append(f"文件 {item.get('filename')} 被标记为歧义文件")
        
        # 检查项目文件是否被错误归档
        filename = item.get('filename', '').lower()
        if first_dir in existing_dirs and any(archive_keyword in first_dir.lower() for archive_keyword in ['archive', '归档', '04-']):
            if any(project_keyword in filename for project_keyword in ['项目', 'project', '复盘', '总结', '经验']):
                warnings.append(f"文件 {item.get('filename')} 包含项目相关内容但被放入归档目录，请检查是否应该放入Projects")
        
        # 检查资源文件是否放错位置
        if filename.endswith(('.md', '.pdf', '.doc', '.docx')) and any(project_keyword in filename for project_keyword in ['项目', 'project']):
            if first_dir in existing_dirs and any(resource_keyword in first_dir.lower() for resource_keyword in ['resource', '资源', '03-']):
                warnings.append(f"文件 {item.get('filename')} 似乎是项目文件但被放入资源目录，请检查分类")
    
    # 验证目录结构
    directory_structure = classification_plan.get('directory_structure', {})
    for top_dir in directory_structure.keys():
        if top_dir not in existing_dirs:
            errors.append(f"目录结构中包含不存在的一级目录: {top_dir}")
    
    is_valid = len(errors) == 0
    print(f"📋 验证结果: {'通过' if is_valid else '失败'}, 错误数: {len(errors)}, 警告数: {len(warnings)}")
    
    return {
        'valid': is_valid,
        'errors': errors,
        'warnings': warnings
    }

def fix_classification_paths(classification_plan, existing_structure, target_base_path):
    """尝试修复分类方案中的路径问题"""
    if not existing_structure:
        return None
    
    existing_dirs = list(existing_structure.keys())
    mapping_table = classification_plan.get('mapping_table', [])
    
    
    # PARA目录映射规则
    para_mapping = {
        'project': [d for d in existing_dirs if any(keyword in d.lower() for keyword in ['project', '项目', '01-', '10-'])],
        'area': [d for d in existing_dirs if any(keyword in d.lower() for keyword in ['area', '领域', '02-', '20-'])],
        'resource': [d for d in existing_dirs if any(keyword in d.lower() for keyword in ['resource', '资源', '03-', '30-'])],
        'archive': [d for d in existing_dirs if any(keyword in d.lower() for keyword in ['archive', '归档', '04-', '40-'])]
    }
    
    fixed_count = 0
    
    for item in mapping_table:
        new_path = item.get('new_directory', '')
        if not new_path:
            continue
            
        # 提取当前使用的一级目录
        relative_path = new_path[len(target_base_path):].lstrip('/')
        if not relative_path:
            continue
            
        current_first_dir = relative_path.split('/')[0]
        
        # 如果一级目录不在现有目录中，尝试修复
        if current_first_dir not in existing_dirs:
            
            # 尝试找到最佳匹配
            best_match = None
            
            # 智能判断文件应该放在哪个分类
            filename = item.get('filename', '').lower()
            original_lower = current_first_dir.lower()
            
            # 优先根据文件名内容判断
            if any(keyword in filename for keyword in ['项目', 'project', '复盘', '总结', '经验']):
                best_match = para_mapping['project'][0] if para_mapping['project'] else existing_dirs[0]
            elif any(keyword in filename for keyword in ['教程', 'tutorial', '指南', 'guide', '模板', 'template']):
                best_match = para_mapping['resource'][0] if para_mapping['resource'] else existing_dirs[0]
            # 然后根据原目录名称猜测PARA分类
            elif any(keyword in original_lower for keyword in ['project', '项目']):
                best_match = para_mapping['project'][0] if para_mapping['project'] else existing_dirs[0]
            elif any(keyword in original_lower for keyword in ['area', '领域']):
                best_match = para_mapping['area'][0] if para_mapping['area'] else existing_dirs[0]
            elif any(keyword in original_lower for keyword in ['resource', '资源']):
                best_match = para_mapping['resource'][0] if para_mapping['resource'] else existing_dirs[0]
            elif any(keyword in original_lower for keyword in ['archive', '归档']):
                best_match = para_mapping['archive'][0] if para_mapping['archive'] else existing_dirs[0]
            else:
                # 默认使用第一个现有目录
                best_match = existing_dirs[0]
            
            if best_match:
                # 替换一级目录
                path_parts = relative_path.split('/')
                path_parts[0] = best_match
                new_relative_path = '/'.join(path_parts)
                item['new_directory'] = os.path.join(target_base_path, new_relative_path).replace('\\', '/')
                fixed_count += 1
    
    if fixed_count > 0:
        return classification_plan
    else:
        print("❌ 没有路径需要修复或修复失败")
        return None

def generate_classification_plan_with_ai(files_info, target_base_path, api_key):
    """(新) 使用 AI 为所有文件生成一个完整的分类方案"""
    
    
    # 扫描目标文件夹的现有结构
    existing_structure = scan_target_directory_structure(target_base_path)
    
    # 4. 优化边界处理：处理空目录的情况
    if not existing_structure:
        # 创建标准PARA目录结构
        standard_para_dirs = ['01-Projects', '02-Areas', '03-Resources', '04-Archives']
        for dir_name in standard_para_dirs:
            dir_path = os.path.join(target_base_path, dir_name)
            os.makedirs(dir_path, exist_ok=True)
        
        # 重新扫描结构
        existing_structure = scan_target_directory_structure(target_base_path)
    
    # 构建文件摘要信息
    files_summary = []
    for file_info in files_info:
        summary = {
            'filename': file_info['name'],
            'original_directory': file_info['original_directory'],
            'content_preview': file_info.get('content_preview', '')[:200]
        }
        files_summary.append(summary)
    

    # 2. 强化AI提示词：更明确要求使用现有目录，添加更多示例
    existing_dirs_list = list(existing_structure.keys())
    
    prompt = f"""
你是一位顶级的个人知识管理专家，精通 PARA 方法。你的任务是为用户提供一个完整、智能且可操作的文件整理方案。

**⚠️ 重要约束条件 - 必须严格遵守：**
1. 你必须且只能使用以下现有目录作为一级分类：{existing_dirs_list}
2. 绝对不可以创建新的一级目录
3. 所有文件的新路径都必须以这些现有目录之一开头
4. 如果你不确定如何分类某个文件，请在路径中标注"(歧义，需讨论)"

**PARA 方法核心原则:**
- **Projects (项目):** 正在进行的、有明确目标和交付日期的任务。包括项目计划、进度记录、复盘总结、项目资料等。只要项目还在推进或有参考价值，都应归入此类。
- **Areas (领域):** 需要持续关注和维护的个人或工作责任区，没有明确的结束日期。如个人成长、健康管理、财务规划等。
- **Resources (资源):** 对多个项目或领域都有用的参考资料和信息。如技术文档、模板、工具使用指南、学习资料等。
- **Archives (归档):** 明确已经完全结束、不再有任何价值或参考意义的内容。注意：项目复盘、总结、经验记录通常仍有参考价值，应放在Projects中。

**❗重要分类指导原则:**
1. **项目复盘≠归档**: "项目复盘.md"、"项目总结.md"、"经验分享.md" 等文件通常应该放在Projects中，因为它们对后续项目有参考价值
2. **活跃判断标准**: 
   - Projects: 正在进行的项目 + 有参考价值的项目资料(包括复盘、总结)
   - Archives: 真正过时、无参考价值、完全废弃的内容
3. **疑惑时优先Projects**: 当不确定是否归档时，优先放入Projects或相关Areas

**现有目录结构详情:**
```json
{json.dumps(existing_structure, ensure_ascii=False, indent=2)}
```

**智能匹配规则示例:**
- 包含"project"、"项目"、数字编号(如"01-"、"10-")的目录通常对应Projects
- 包含"area"、"领域"、"20-"的目录通常对应Areas  
- 包含"resource"、"资源"、"30-"的目录通常对应Resources
- 包含"archive"、"归档"、"40-"的目录通常对应Archives

**文件分类具体示例:**
📁 **放入Projects的文件:**
- "副业探索-知识付费项目复盘.md" → 01-Projects/副业项目/知识付费/
- "电商推荐系统优化项目复盘.md" → 01-Projects/电商项目/推荐系统/
- "项目计划.md"、"进度报告.pdf" → 01-Projects/对应项目/
- "经验总结.md"、"教训记录.md" → 01-Projects/对应项目/

📁 **放入Resources的文件:**
- "编程技巧.md"、"设计模板.psd" → 03-Resources/技术资料/
- "行业分析报告.pdf" → 03-Resources/行业研究/

📁 **放入Archives的文件:**
- "2020年废弃的想法.md" → 04-Archives/历史记录/
- "过时的技术文档.pdf" → 04-Archives/技术资料/

**文件列表:**
```json
{json.dumps(files_summary, ensure_ascii=False, indent=2)}
```

**目标根目录:** `{target_base_path}`

---

**任务一: 生成"文件名-原目录-新目录"映射表 (mapping_table)**

**严格要求:**
- 新目录路径格式：`{target_base_path}/[必须是现有一级目录]/[二级分类]/[三级分类可选]/文件名`
- 一级目录必须从这个列表中选择：{existing_dirs_list}
- 示例正确路径：`{target_base_path}/{existing_dirs_list[0] if existing_dirs_list else "01-Projects"}/编程学习/Python基础/example.py`
- 错误路径示例：`{target_base_path}/Projects/...` (因为Projects不在现有目录列表中)

**⚠️ 关键分类注意事项:**
- 包含"项目"、"复盘"、"总结"、"经验"的文件，优先考虑放入Projects目录
- 只有真正过时、无价值的内容才放入Archives
- 当文件名包含具体项目名称时(如"电商项目"、"副业项目")，应放入对应的Projects子目录
- 技术文档、教程、模板等通用资料放入Resources

**任务二: 生成新目录的完整结构 (directory_structure)**
- 顶级键必须且只能是现有目录：{existing_dirs_list}
- 不要创建新的顶级目录

**任务三: 生成讨论点 (discussion_points)**
对于无法明确分类的文件，提供建议。

**最终输出格式:**
```json
{{
  "mapping_table": [
    {{
      "filename": "文件名.ext",
      "original_directory": "原目录",
      "new_directory": "{target_base_path}/[现有目录]/子分类/文件名.ext"
    }}
  ],
  "directory_structure": {{
    "{existing_dirs_list[0] if existing_dirs_list else "01-Projects"}": {{}},
    "{existing_dirs_list[1] if len(existing_dirs_list) > 1 else "02-Areas"}": {{}}
  }},
  "discussion_points": []
}}
```
"""

    try:
        if not api_key:
            raise ValueError("API Key 未提供")


        # 使用豆包SDK
        client = Ark(api_key=api_key)
        
        completion = client.chat.completions.create(
            model=DEFAULT_MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1,
            max_tokens=4000
        )
        
        ai_response = completion.choices[0].message.content.strip()
        
        # 尝试解析 AI 返回的 JSON
        try:
            # 提取 JSON 部分
            start_idx = ai_response.find('{')
            end_idx = ai_response.rfind('}') + 1
            if start_idx == -1 or end_idx == 0:
                raise json.JSONDecodeError("无法在AI响应中找到JSON对象", ai_response, 0)
            
            json_str = ai_response[start_idx:end_idx]
            classification_plan = json.loads(json_str)

            # 3. 添加结果验证：检查AI返回的路径是否使用了现有目录
            validation_result = validate_classification_plan(classification_plan, existing_structure, target_base_path)
            if validation_result['valid']:
                if validation_result['warnings']:
                return classification_plan
            else:
                print(f"❌ 分类方案验证失败: {validation_result['errors']}")
                fixed_plan = fix_classification_paths(classification_plan, existing_structure, target_base_path)
                if fixed_plan:
                    return fixed_plan
                else:
                    print("❌ 路径修复失败")
                    return None
        except json.JSONDecodeError as e:
            print(f"❌ AI 返回的不是有效的 JSON: {ai_response[:500]}..., 错误: {e}")
            return None
            
    except Exception as e:
        print(f"💥 AI 分类方案生成异常: {e}")
        import traceback
        print(f"📋 异常详情:\n{traceback.format_exc()}")
        return None

def generate_classification_plan_with_ai_batch_tracked(files_info, target_base_path, api_key, task_id, batch_size=50):
    """AI生成分类方案 - 分批处理版本，支持任务追踪和时间统计"""
    
    # 扫描现有目录结构
    existing_structure = scan_target_directory_structure(target_base_path)
    
    # 处理空目录的情况
    if not existing_structure:
        standard_para_dirs = ['01-Projects', '02-Areas', '03-Resources', '04-Archives']
        for dir_name in standard_para_dirs:
            dir_path = os.path.join(target_base_path, dir_name)
            os.makedirs(dir_path, exist_ok=True)
        existing_structure = scan_target_directory_structure(target_base_path)
    
    # 分批处理
    total_files = len(files_info)
    total_batches = (total_files + batch_size - 1) // batch_size
    
    all_mapping_tables = []
    merged_directory_structure = {}  # 直接使用字典而不是列表
    all_discussion_points = []
    successful_batches = 0
    
    # 时间统计
    import time
    batch_times = []  # 记录每个批次的处理时间
    total_start_time = time.time()
    
    for batch_num in range(total_batches):
        batch_start_time = time.time()
        
        start_idx = batch_num * batch_size
        end_idx = min(start_idx + batch_size, total_files)
        batch_files = files_info[start_idx:end_idx]
        
        # 计算预计剩余时间
        if batch_times:
            avg_batch_time = sum(batch_times) / len(batch_times)
            remaining_batches = total_batches - batch_num
            estimated_remaining_time = avg_batch_time * remaining_batches
            
            # 格式化时间显示
            if estimated_remaining_time < 60:
                time_str = f"{int(estimated_remaining_time)}秒"
            elif estimated_remaining_time < 3600:
                minutes = int(estimated_remaining_time // 60)
                seconds = int(estimated_remaining_time % 60)
                time_str = f"{minutes}分{seconds}秒"
            else:
                hours = int(estimated_remaining_time // 3600)
                minutes = int((estimated_remaining_time % 3600) // 60)
                time_str = f"{hours}小时{minutes}分钟"
        else:
            # 第一个批次，给出经验预估：每批次约1-3分钟
            estimated_per_batch = 90  # 90秒的经验值
            estimated_remaining_time = estimated_per_batch * (total_batches - batch_num)
            time_str = f"约{int(estimated_remaining_time/60)}分钟"
        
        # 更新任务进度
        batch_progress = 70 + int((batch_num / total_batches) * 20)  # AI分析阶段占70-90%
        analysis_tasks[task_id]['stage_progress'] = batch_progress
        analysis_tasks[task_id]['message'] = f'AI正在分析第 {batch_num + 1}/{total_batches} 批次 ({len(batch_files)} 个文件)，预计还需 {time_str}...'
        analysis_tasks[task_id]['estimated_remaining_time'] = estimated_remaining_time if batch_times else None
        analysis_tasks[task_id]['average_batch_time'] = sum(batch_times) / len(batch_times) if batch_times else None
        
        if batch_times:
        
        try:
            # 调用原有的AI分析函数处理这一批文件（带重试机制）
            batch_result = None
            max_retries = 2
            
            for retry_count in range(max_retries + 1):
                try:
                    batch_result = generate_classification_plan_with_ai(batch_files, target_base_path, api_key)
                    if batch_result:
                        break  # 成功则跳出重试循环
                    else:
                except Exception as e:
                    print(f"⚠️ 第 {batch_num + 1} 批次第 {retry_count + 1} 次尝试失败: {e}")
                    if retry_count < max_retries:
                        time.sleep(2)  # 等待2秒后重试
                    else:
                        print(f"❌ 第 {batch_num + 1} 批次所有重试都失败")
            
            # 记录批次处理时间
            batch_end_time = time.time()
            batch_duration = batch_end_time - batch_start_time
            batch_times.append(batch_duration)
            
            if batch_result:
                successful_batches += 1
                
                # 收集结果
                all_mapping_tables.extend(batch_result.get('mapping_table', []))
                
                # 合并目录结构（添加调试信息）
                batch_structure = batch_result.get('directory_structure', {})
                for top_dir, sub_structure in batch_structure.items():
                
                
                for top_dir, sub_structure in batch_structure.items():
                    if top_dir not in merged_directory_structure:
                        merged_directory_structure[top_dir] = sub_structure
                    else:
                        merge_directory_structures(merged_directory_structure[top_dir], sub_structure)
                
                for top_dir in merged_directory_structure:
                    if isinstance(merged_directory_structure[top_dir], dict):
                    else:
                
                # 收集讨论点
                all_discussion_points.extend(batch_result.get('discussion_points', []))
                
                # 更新成功进度，包含时间信息
                analysis_tasks[task_id]['message'] = f'已完成 {batch_num + 1}/{total_batches} 批次，成功分类 {len(all_mapping_tables)} 个文件'
            else:
                print(f"❌ 第 {batch_num + 1} 批次处理失败，耗时 {batch_duration:.1f}秒")
                # 更新错误信息但继续处理
                analysis_tasks[task_id]['message'] = f'第 {batch_num + 1} 批次失败，继续处理剩余批次...'
                
        except Exception as e:
            batch_end_time = time.time()
            batch_duration = batch_end_time - batch_start_time
            batch_times.append(batch_duration)  # 即使失败也记录时间，用于预估
            
            print(f"💥 第 {batch_num + 1} 批次处理异常，耗时 {batch_duration:.1f}秒: {e}")
            # 继续处理下一批次，不中断整个流程
            analysis_tasks[task_id]['message'] = f'第 {batch_num + 1} 批次异常，继续处理剩余批次...'
            continue
    
    # 总处理时间统计
    total_end_time = time.time()
    total_duration = total_end_time - total_start_time
    
    # 合并所有批次的结果
    if all_mapping_tables:
        # 使用合并后的目录结构，不重新构建
        for top_dir in merged_directory_structure:
        
        final_result = {
            'mapping_table': all_mapping_tables,
            'directory_structure': merged_directory_structure,  # 直接使用合并后的结构
            'discussion_points': all_discussion_points
        }
        
        success_rate = successful_batches / total_batches * 100
        avg_time_per_batch = sum(batch_times) / len(batch_times) if batch_times else 0
        
        
        # 更新最终状态，包含时间统计
        analysis_tasks[task_id]['message'] = f'分批分析完成，成功分类 {len(all_mapping_tables)} 个文件 (成功率 {success_rate:.1f}%，总耗时 {total_duration/60:.1f}分钟)'
        analysis_tasks[task_id]['total_duration'] = total_duration
        analysis_tasks[task_id]['average_batch_time'] = avg_time_per_batch
        analysis_tasks[task_id]['estimated_remaining_time'] = 0  # 已完成
        
        return final_result
    else:
        print("❌ 所有批次都处理失败")
        analysis_tasks[task_id]['message'] = '所有批次都处理失败，请检查API Key和网络连接'
        return None

def merge_directory_structures(target, source):
    """合并两个目录结构，改进版本"""
    
    for key, value in source.items():
        if key in target:
            if isinstance(target[key], dict) and isinstance(value, dict):
                # 两边都是字典，递归合并
                merge_directory_structures(target[key], value)
            elif isinstance(target[key], list) and isinstance(value, list):
                # 两边都是列表，合并并去重
                target[key] = list(set(target[key] + value))
            elif isinstance(target[key], dict) and isinstance(value, list):
                # 目标是字典，源是列表，将列表加到字典中
                if '__files__' not in target[key]:
                    target[key]['__files__'] = []
                target[key]['__files__'].extend(value)
            elif isinstance(target[key], list) and isinstance(value, dict):
                # 目标是列表，源是字典，将列表转换为字典中的文件
                new_dict = {'__files__': target[key]}
                new_dict.update(value)
                target[key] = new_dict
            else:
                # 其他情况，源覆盖目标
                target[key] = value
        else:
            target[key] = value
    
    return target

def add_to_directory_structure(structure, file_path):
    """根据文件路径构建目录结构"""
    # 移除文件名，只保留目录路径
    parts = file_path.split('/')[:-1]  # 排除文件名
    
    current = structure
    for part in parts:
        if part and part.strip():  # 跳过空字符串
            if part not in current:
                current[part] = {}
            current = current[part]

def analyze_files_async(task_id, source_path, target_path, api_key):
    """异步分析文件 - 新的整体分析流程"""
    try:
        
        # 阶段1：扫描文件
        analysis_tasks[task_id]['status'] = 'scanning'
        analysis_tasks[task_id]['message'] = '正在扫描文件夹...'
        analysis_tasks[task_id]['stage'] = 'scanning'
        analysis_tasks[task_id]['stage_progress'] = 10
        
        files = scan_files(source_path)
        total_files = len(files)
        
        analysis_tasks[task_id]['total_files'] = total_files
        analysis_tasks[task_id]['found_files'] = total_files
        
        # 阶段2：收集文件信息
        analysis_tasks[task_id]['status'] = 'collecting'
        analysis_tasks[task_id]['message'] = '正在收集文件信息...'
        analysis_tasks[task_id]['stage'] = 'collecting'
        analysis_tasks[task_id]['stage_progress'] = 30
        analysis_tasks[task_id]['processed_files'] = 0
        
        files_info = []
        for i, file_path in enumerate(files):
            analysis_tasks[task_id]['processed_files'] = i + 1
            analysis_tasks[task_id]['current_file'] = os.path.basename(file_path)
            analysis_tasks[task_id]['stage_progress'] = 30 + int((i + 1) / total_files * 30)  # 30-60%
            
            if (i + 1) % 10 == 0 or i == 0:  # 每10个文件打印一次进度
            
            try:
                file_info = get_file_info(file_path)
                if file_info:
                    content_preview = read_file_content(file_path)
                    file_info['content_preview'] = content_preview
                    files_info.append(file_info)
            except Exception as e:
                print(f"❌ [任务 {task_id}] 收集文件信息失败 {file_path}: {e}")
                continue
        
        
        # 阶段3：AI智能分析（支持分批处理）
        analysis_tasks[task_id]['status'] = 'ai_analyzing'
        analysis_tasks[task_id]['message'] = 'AI正在分析所有文件并生成分类方案...'
        analysis_tasks[task_id]['stage'] = 'ai_analyzing'
        analysis_tasks[task_id]['stage_progress'] = 70
        analysis_tasks[task_id]['current_file'] = ''  # 清空当前文件，因为AI是批量处理
        
        if not files_info:
            analysis_tasks[task_id]['status'] = 'completed'
            analysis_tasks[task_id]['message'] = '未找到可分析的文件'
            analysis_tasks[task_id]['results'] = {}
            analysis_tasks[task_id]['stage_progress'] = 100
            return

        
        # 根据文件数量决定是否分批处理
        def get_optimal_batch_size(total_files):
            """根据文件数量智能确定最佳批次大小"""
            if total_files <= 50:
                return total_files  # 小于50个文件不分批
            elif total_files <= 200:
                return 40  # 中等数量使用40
            elif total_files <= 500:
                return 30  # 较大数量使用30
            else:
                return 25  # 大量文件使用较小批次，更稳定
        
        batch_size = get_optimal_batch_size(len(files_info))
        use_batch_processing = len(files_info) > 50  # 超过50个文件才分批
        
        if use_batch_processing:
            total_batches = (len(files_info) + batch_size - 1) // batch_size
            analysis_tasks[task_id]['message'] = f'AI正在分批分析 {len(files_info)} 个文件，共 {total_batches} 个批次...'
            classification_plan = generate_classification_plan_with_ai_batch_tracked(files_info, target_path, api_key, task_id, batch_size)
        else:
            analysis_tasks[task_id]['message'] = f'AI正在分析 {len(files_info)} 个文件...'
            classification_plan = generate_classification_plan_with_ai(files_info, target_path, api_key)
        
        # 阶段4：处理结果
        analysis_tasks[task_id]['status'] = 'processing'
        analysis_tasks[task_id]['message'] = '正在处理分析结果...'
        analysis_tasks[task_id]['stage'] = 'processing'
        analysis_tasks[task_id]['stage_progress'] = 90
        
        if classification_plan:
            # 将原始的 source_path 添加到 mapping_table 中，以备迁移使用
            source_path_map = {info['name']: info['path'] for info in files_info}
            for item in classification_plan.get('mapping_table', []):
                item['source_path'] = source_path_map.get(item['filename'])

            analysis_tasks[task_id]['status'] = 'completed'
            analysis_tasks[task_id]['message'] = '分析完成'
            analysis_tasks[task_id]['stage'] = 'completed'
            analysis_tasks[task_id]['stage_progress'] = 100
            analysis_tasks[task_id]['results'] = classification_plan
        else:
            print(f"❌ [任务 {task_id}] AI分类方案生成失败")
            analysis_tasks[task_id]['status'] = 'error'
            analysis_tasks[task_id]['message'] = '智能分类方案生成失败，请检查后端日志。'
            analysis_tasks[task_id]['stage'] = 'error'

    except Exception as e:
        print(f"💥 [任务 {task_id}] 分析过程异常: {e}")
        import traceback
        print(f"📋 [任务 {task_id}] 异常详情:\n{traceback.format_exc()}")
        analysis_tasks[task_id]['status'] = 'error'
        analysis_tasks[task_id]['message'] = f'分析失败: {str(e)}'
        analysis_tasks[task_id]['stage'] = 'error'

def scan_files(source_path):
    """扫描文件夹中的所有文件"""
    files = []
    try:
        for root, dirs, filenames in os.walk(source_path):
            # 排除常见的无需整理的目录
            dirs[:] = [d for d in dirs if d not in ['.git', 'node_modules', '__pycache__', 'venv']]
            for filename in filenames:
                # 排除常见的无需整理的文件
                if filename in ['.DS_Store']:
                    continue
                file_path = os.path.join(root, filename)
                files.append(file_path)
    except Exception as e:
        print(f"扫描文件失败: {e}")
    
    return files

@classifier_bp.route('/test-api-key', methods=['POST'])
def test_api_key():
    """测试API Key是否有效"""
    try:
        data = request.get_json()
        api_key = data.get('api_key')
        
        if not api_key:
            return jsonify({'error': '缺少 API Key'}), 400

        
        # 使用豆包SDK测试
        client = Ark(api_key=api_key)
        
        completion = client.chat.completions.create(
            model=DEFAULT_MODEL,
            messages=[{"role": "user", "content": "你好，请回复'测试成功'"}],
            temperature=0.1,
            max_tokens=50
        )
        
        ai_response = completion.choices[0].message.content
        
        return jsonify({
            'success': True,
            'message': 'API Key 验证成功',
            'model': DEFAULT_MODEL,
            'api_provider': '豆包-火山引擎',
            'test_response': ai_response
        })
            
    except Exception as e:
        error_msg = str(e)
        print(f"豆包API Key测试异常: {error_msg}")
        
        # 判断错误类型
        if 'authentication' in error_msg.lower() or 'api key' in error_msg.lower() or 'unauthorized' in error_msg.lower():
            return jsonify({
                'success': False,
                'error': 'API Key 无效或已过期',
                'detail': error_msg
            }), 401
        elif 'permission' in error_msg.lower() or 'forbidden' in error_msg.lower():
            return jsonify({
                'success': False,
                'error': '权限不足，请检查API Key权限或账户余额',
                'detail': error_msg
            }), 403
        elif 'rate limit' in error_msg.lower() or 'too many' in error_msg.lower():
            return jsonify({
                'success': False,
                'error': '请求频率过高，请稍后重试',
                'detail': error_msg
            }), 429
        elif 'timeout' in error_msg.lower():
            return jsonify({
                'success': False,
                'error': 'API请求超时，请检查网络连接',
                'detail': error_msg
            }), 408
        elif 'connection' in error_msg.lower():
            return jsonify({
                'success': False,
                'error': '无法连接到API服务器，请检查网络连接',
                'detail': error_msg
            }), 503
        else:
            return jsonify({
                'success': False,
                'error': f'测试过程中发生错误: {error_msg}',
                'detail': error_msg
            }), 500

@classifier_bp.route('/analyze', methods=['POST'])
def analyze_files():
    """开始文件分析"""
    try:
        data = request.get_json()
        source_path = data.get('source_path')
        target_path = data.get('target_path')
        api_key = data.get('api_key') # 获取API Key
        
        if not source_path or not target_path:
            return jsonify({'error': '缺少必要参数'}), 400
        
        if not api_key:
            return jsonify({'error': '缺少 API Key'}), 400

        if not os.path.exists(source_path):
            return jsonify({'error': '源文件夹不存在'}), 400
        
        task_id = str(uuid.uuid4())
        
        analysis_tasks[task_id] = {
            'status': 'started',
            'message': '开始分析...',
            'total_files': 0,
            'processed_files': 0,
            'current_file': '',
            'results': {},
            'stage': 'started',
            'stage_progress': 0,
            'found_files': 0,
            'created_at': datetime.now().isoformat()
        }
        
        thread = threading.Thread(
            target=analyze_files_async,
            args=(task_id, source_path, target_path, api_key) # 将API Key传递给线程
        )
        thread.daemon = True
        thread.start()
        
        return jsonify({'task_id': task_id, 'message': '分析已开始'})
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@classifier_bp.route('/classification/<task_id>', methods=['GET'])
def get_classification_status(task_id):
    """获取分类状态和结果"""
    if task_id not in analysis_tasks:
        return jsonify({'error': '任务不存在'}), 404
    
    task = analysis_tasks[task_id]
    
    response = {
        'task_id': task_id,
        'status': task['status'],
        'message': task['message'],
        'total_files': task['total_files'],
        'processed_files': task['processed_files'],
        'current_file': task['current_file'],
        'results': task.get('results', {}),
        'stage': task.get('stage', task['status']),
        'stage_progress': task.get('stage_progress', 0),
        'found_files': task.get('found_files', task['total_files']),
        # 添加时间统计信息
        'estimated_remaining_time': task.get('estimated_remaining_time'),
        'average_batch_time': task.get('average_batch_time'),
        'total_duration': task.get('total_duration')
    }
    
    return jsonify(response)

@classifier_bp.route('/directory-structure/<task_id>', methods=['GET'])
def get_directory_structure(task_id):
    """获取生成的目录结构"""
    if task_id not in analysis_tasks:
        return jsonify({'error': '任务不存在'}), 404
    
    task = analysis_tasks[task_id]
    
    return jsonify({
        'task_id': task_id,
        'directory_structure': task.get('directory_structure', {}),
        'status': task['status']
    })

@classifier_bp.route('/migrate', methods=['POST'])
def migrate_files():
    """执行文件迁移"""
    try:
        data = request.get_json()
        classifications = data.get('classifications', [])
        
        for i, item in enumerate(classifications[:3]):  # 只打印前3个作为示例
        if len(classifications) > 3:
        
        if not classifications:
            return jsonify({'error': '没有要迁移的文件'}), 400
        
        results = {
            'success': [],
            'failed': [],
            'skipped': []
        }
        
        for i, item in enumerate(classifications):
            source_path = item.get('source_path')
            target_path = item.get('target_path')
            filename = os.path.basename(source_path) if source_path else 'unknown'
            
            
            try:
                # 验证路径
                if not source_path or not target_path:
                    error_msg = f"路径信息不完整: source={source_path}, target={target_path}"
                    print(f"❌ {error_msg}")
                    results['failed'].append({
                        'source': source_path,
                        'target': target_path,
                        'error': error_msg
                    })
                    continue
                
                # 检查源文件是否存在
                if not os.path.exists(source_path):
                    error_msg = f"源文件不存在: {source_path}"
                    print(f"❌ {error_msg}")
                    results['failed'].append({
                        'source': source_path,
                        'target': target_path,
                        'error': '源文件不存在'
                    })
                    continue
                
                # 创建目标目录
                target_dir = os.path.dirname(target_path)
                os.makedirs(target_dir, exist_ok=True)
                
                # 检查目标文件是否已存在
                if os.path.exists(target_path):
                    results['skipped'].append({
                        'source': source_path,
                        'target': target_path,
                        'reason': '目标文件已存在'
                    })
                    continue
                
                # 移动文件
                os.rename(source_path, target_path)
                
                results['success'].append({
                    'source': source_path,
                    'target': target_path
                })
                
            except Exception as e:
                error_msg = str(e)
                print(f"💥 文件迁移失败 {filename}: {error_msg}")
                results['failed'].append({
                    'source': source_path,
                    'target': target_path,
                    'error': error_msg
                })
        
        # 打印迁移摘要
        print(f"  ❌ 失败: {len(results['failed'])} 个文件")
        
        return jsonify({
            'message': '迁移完成',
            'results': results,
            'summary': {
                'total': len(classifications),
                'success': len(results['success']),
                'failed': len(results['failed']),
                'skipped': len(results['skipped'])
            }
        })
        
    except Exception as e:
        print(f"💥 迁移过程发生异常: {e}")
        import traceback
        print(f"📋 异常详情:\n{traceback.format_exc()}")
        return jsonify({'error': str(e)}), 500

