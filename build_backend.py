#!/usr/bin/env python3
"""
Python后端打包脚本
使用PyInstaller将Flask应用打包为可执行文件
"""

import os
import sys
import shutil
import subprocess
from pathlib import Path

def install_pyinstaller():
    """安装PyInstaller"""
    try:
        import PyInstaller
        print("✓ PyInstaller已安装")
    except ImportError:
        print("安装PyInstaller...")
        subprocess.check_call([sys.executable, "-m", "pip", "install", "pyinstaller"])

def create_spec_file():
    """创建PyInstaller规格文件"""
    spec_content = '''
# -*- mode: python ; coding: utf-8 -*-

block_cipher = None

a = Analysis(
    ['backend/src/main.py'],
    pathex=[],
    binaries=[],
    datas=[
        ('backend/src/models', 'src/models'),
        ('backend/src/routes', 'src/routes'),
        ('backend/src/static', 'src/static'),
    ],
    hiddenimports=[
        'flask',
        'flask_cors',
        'flask_sqlalchemy',
        'volcengine',
        'httpx',
        'pydantic',
        'werkzeug',
        'src.models.user',
        'src.routes.user',
        'src.routes.classifier'
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='para-backend',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
'''
    
    with open('para-backend.spec', 'w') as f:
        f.write(spec_content.strip())
    print("✓ 创建PyInstaller规格文件")

def build_backend():
    """构建Python后端"""
    print("开始构建Python后端...")
    
    # 安装依赖
    print("安装Python依赖...")
    subprocess.check_call([
        sys.executable, "-m", "pip", "install", "-r", 
        "backend/requirements.txt"
    ])
    
    # 安装PyInstaller
    install_pyinstaller()
    
    # 创建规格文件
    create_spec_file()
    
    # 执行打包
    print("执行PyInstaller打包...")
    subprocess.check_call([
        "pyinstaller", 
        "--clean", 
        "--noconfirm",
        "para-backend.spec"
    ])
    
    # 创建backend/dist目录并复制文件
    backend_dist_dir = Path("backend/dist")
    backend_dist_dir.mkdir(exist_ok=True)
    
    # 复制打包的可执行文件（生产模式需要）
    dist_dir = Path("dist")
    if dist_dir.exists():
        for item in dist_dir.iterdir():
            if item.is_file():
                shutil.copy2(item, backend_dist_dir)
            elif item.is_dir():
                shutil.copytree(item, backend_dist_dir / item.name, dirs_exist_ok=True)
    
    print("✓ 后端构建完成")

def main():
    """主函数"""
    if not os.path.exists("backend"):
        print("❌ 未找到backend目录")
        print("请确保在项目根目录下运行此脚本")
        sys.exit(1)
    
    try:
        build_backend()
        print("\n🎉 Python后端打包成功！")
        print("构建文件位于: ./backend/dist/")
    except subprocess.CalledProcessError as e:
        print(f"❌ 构建失败: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"❌ 未知错误: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main() 