import React, { useState, useCallback, useRef, useMemo } from 'react';
import { Controls } from './components/Controls.tsx';
import { Scene } from './components/Scene.tsx';
import { ViewCube } from './components/ViewCube.tsx';
import PerformanceMonitor from './components/PerformanceMonitor.tsx';
import { ModelGallery } from './components/ModelGallery.tsx';
import { SingleModelViewer } from './components/SingleModelViewer.tsx';
import { ModelData, HistoryState, CameraPreset } from './types';
import { GalleryModel } from './galleryData';
import { DEFAULT_MODEL_1_URL, DEFAULT_MODEL_2_URL, HISTORY_CONFIG, CAMERA_PRESETS } from './constants';
import { Upload, Info, Undo2, Redo2, Camera, HelpCircle, Eye, EyeOff, Home, Grid3X3, MoreHorizontal, X } from 'lucide-react';
import type { OrbitControls as OrbitControlsType } from 'three-stdlib';

// 视图模式类型
type ViewMode = 'compare' | 'gallery' | 'single';

const INITIAL_MODELS: ModelData[] = [
  {
    id: 'model-1',
    name: '现实',
    url: '/远征队 完整 现实.glb',
    rectangularPartUrl: '/远征队 矩形整体 现实.glb',
    otherPartUrl: '/远征队 塔仓 现实.glb',
    position: [-1.5, 0, 0],
    rotation: [0, 0, 0],
    scale: [30, 30, 30],
    visible: true,
    selected: false,
    opacity: 1.0,
    locked: false,
    partialVisibility: {
      rectangularParts: true,
      otherParts: true
    }
  },
  {
    id: 'model-2',
    name: '锚定',
    url: '/远征队 完整 锚定.glb',
    rectangularPartUrl: '/远征队 矩形整体 锚定.glb',
    otherPartUrl: '/远征队 塔仓 锚定.glb',
    position: [1.5, 0.005, 0],
    rotation: [0, 0, 0],
    scale: [30, 30, 30], 
    visible: true,
    selected: false,
    opacity: 1.0,
    locked: false,
    partialVisibility: {
      rectangularParts: true,
      otherParts: true
    }
  },
];

// Add a loading indicator to verify models are loading properly
const LOADING_MESSAGE = "模型加载中...";

// Hide file upload buttons
const SHOW_UPLOAD_BUTTONS = false;

// Hide loading indicator
const SHOW_LOADING_INDICATOR = false;

// Hide FPS button
const SHOW_FPS_BUTTON = false;

const App: React.FC = () => {
  const [models, setModels] = useState<ModelData[]>(INITIAL_MODELS);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showPerformanceMonitor, setShowPerformanceMonitor] = useState<boolean>(false);
  const [showHelp, setShowHelp] = useState<boolean>(false);
  const [showMoreMenu, setShowMoreMenu] = useState<boolean>(false); // 更多菜单状态
  const cameraControlsRef = useRef<OrbitControlsType | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  
  // 视图模式状态
  const [viewMode, setViewMode] = useState<ViewMode>('compare');
  const [selectedGalleryModel, setSelectedGalleryModel] = useState<GalleryModel | null>(null);
  
  // 撤销/重做历史
  const [history, setHistory] = useState<HistoryState[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const isUndoRedoRef = useRef(false);
  
  // 添加历史记录
  const pushHistory = useCallback((newModels: ModelData[], action: string) => {
    if (isUndoRedoRef.current) {
      isUndoRedoRef.current = false;
      return;
    }
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push({
        models: JSON.parse(JSON.stringify(newModels)),
        timestamp: Date.now(),
        action
      });
      // 限制历史记录数量
      if (newHistory.length > HISTORY_CONFIG.MAX_HISTORY_LENGTH) {
        newHistory.shift();
        return newHistory;
      }
      return newHistory;
    });
    setHistoryIndex(prev => Math.min(prev + 1, HISTORY_CONFIG.MAX_HISTORY_LENGTH - 1));
  }, [historyIndex]);
  
  // 撤销
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      isUndoRedoRef.current = true;
      const prevState = history[historyIndex - 1];
      setModels(JSON.parse(JSON.stringify(prevState.models)));
      setHistoryIndex(prev => prev - 1);
    }
  }, [history, historyIndex]);
  
  // 重做
  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      isUndoRedoRef.current = true;
      const nextState = history[historyIndex + 1];
      setModels(JSON.parse(JSON.stringify(nextState.models)));
      setHistoryIndex(prev => prev + 1);
    }
  }, [history, historyIndex]);
  
  // 截图功能
  const handleScreenshot = useCallback(() => {
    const canvas = document.querySelector('canvas');
    if (canvas) {
      const link = document.createElement('a');
      link.download = `3D模型截图_${new Date().toISOString().slice(0,10)}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    }
  }, []);
  
  // 预设视角
  const handleCameraPreset = useCallback((preset: CameraPreset) => {
    if (!cameraControlsRef.current) return;
    const config = CAMERA_PRESETS[preset.toUpperCase() as keyof typeof CAMERA_PRESETS];
    if (config) {
      const controls = cameraControlsRef.current;
      controls.object.position.set(...config.position);
      controls.target.set(...config.target);
      controls.update();
    }
  }, []);
  
  // 重置视角
  const handleResetView = useCallback(() => {
    handleCameraPreset('iso');
  }, [handleCameraPreset]);
  
  // 键盘快捷键
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + Z: 撤销
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }
      // Ctrl/Cmd + Y 或 Ctrl/Cmd + Shift + Z: 重做
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        handleRedo();
      }
      // Ctrl/Cmd + S: 截图
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleScreenshot();
      }
      // H: 显示帮助
      if (e.key === 'h' || e.key === 'H') {
        setShowHelp(prev => !prev);
      }
      // 1-5: 预设视角
      if (e.key === '1') handleCameraPreset('front');
      if (e.key === '2') handleCameraPreset('back');
      if (e.key === '3') handleCameraPreset('side');
      if (e.key === '4') handleCameraPreset('top');
      if (e.key === '5') handleCameraPreset('iso');
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo, handleScreenshot, handleCameraPreset]);

  const handleSelectModel = useCallback((id: string | null) => {
    setSelectedId(id);
    setModels(prev => prev.map(m => ({
      ...m,
      selected: m.id === id
    })));
  }, []);

  const handleUpdateModel = useCallback((id: string, updates: Partial<ModelData>) => {
    setModels(prev => {
      // 查找目标模型
      const targetIndex = prev.findIndex(m => m.id === id);
      if (targetIndex === -1) return prev;
      
      const target = prev[targetIndex];
      
      // 浅比较检查是否真正需要更新
      let hasChanges = false;
      for (const key of Object.keys(updates) as (keyof ModelData)[]) {
        if (target[key] !== updates[key]) {
          hasChanges = true;
          break;
        }
      }
      
      // 没有变化则返回原数组，避免重渲染
      if (!hasChanges) return prev;
      
      // 只更新变化的模型
      const newModels = [...prev];
      newModels[targetIndex] = { ...target, ...updates };
      
      // 记录到历史（仅对重要操作）
      if (updates.position || updates.rotation || updates.opacity !== undefined || updates.wireframe !== undefined) {
        pushHistory(newModels, `更新${target.name}`);
      }
      
      return newModels;
    });
  }, [pushHistory]);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>, modelIndex: number) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setModels(prev => {
        const newModels = [...prev];
        newModels[modelIndex] = {
          ...newModels[modelIndex],
          url: url,
        };
        return newModels;
      });
    }
  }, []);

  const getStatusMessage = () => {
    if (selectedId) {
      const selectedModel = models.find(m => m.id === selectedId);
      return `已选中：${selectedModel?.name} - 单指旋转，双指移动`;
    }
    return '全局视角：单指旋转场景，双指平移视角';
  };

  return (
    <div className="w-full h-screen relative bg-gradient-to-br from-blue-50 to-white overflow-hidden font-sans text-slate-800"
      style={{
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        paddingLeft: 'env(safe-area-inset-left, 0px)',
        paddingRight: 'env(safe-area-inset-right, 0px)',
      }}
    >
      {/* Debug loading indicator (Conditionally Hidden) */}
      {SHOW_LOADING_INDICATOR && (
        <div className="fixed top-0 left-0 right-0 p-4 bg-blue-500 text-white text-center z-50">
          ArchiView 3D 正在加载...
        </div>
      )}
      
      {/* 工具栏 - 移动端精简布局 */}
      <div 
        className="absolute z-20 flex gap-1.5"
        style={{
          top: 'max(12px, calc(env(safe-area-inset-top, 0px) + 8px))',
          left: 'max(12px, env(safe-area-inset-left, 8px))',
        }}
      >
        {/* 模型库按钮 - 核心入口，始终显示 */}
        <button
          onClick={() => setViewMode('gallery')}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 rounded-xl shadow-lg text-white font-medium transition-all touch-manipulation active:scale-95"
          title="模型库"
        >
          <Grid3X3 size={20} />
          <span className="text-sm">模型库</span>
        </button>
        
        {/* 重置视角 */}
        <button
          onClick={handleResetView}
          className="p-3 bg-white hover:bg-gray-50 rounded-xl shadow-lg text-gray-700 transition-all touch-manipulation active:scale-95"
          title="重置视角"
        >
          <Home size={20} />
        </button>
        
        {/* 帮助 */}
        <button
          onClick={() => setShowHelp(true)}
          className="p-3 bg-white hover:bg-blue-50 rounded-xl shadow-lg text-blue-600 transition-all touch-manipulation active:scale-95"
          title="操作帮助"
        >
          <HelpCircle size={20} />
        </button>
        
        {/* 更多菜单按钮 */}
        <div className="relative">
          <button
            onClick={() => setShowMoreMenu(!showMoreMenu)}
            className={`p-3 rounded-xl shadow-lg transition-all touch-manipulation active:scale-95 ${
              showMoreMenu ? 'bg-gray-200 text-gray-700' : 'bg-white hover:bg-gray-50 text-gray-700'
            }`}
            title="更多功能"
          >
            {showMoreMenu ? <X size={20} /> : <MoreHorizontal size={20} />}
          </button>
          
          {/* 更多菜单弹出层 */}
          {showMoreMenu && (
            <div 
              className="absolute top-full left-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-200 py-2 min-w-[160px] animate-menu-open"
              onClick={() => setShowMoreMenu(false)}
            >
              {/* 撤销 */}
              <button
                onClick={handleUndo}
                disabled={historyIndex <= 0}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors touch-manipulation ${
                  historyIndex > 0 
                    ? 'text-gray-700 hover:bg-gray-50 active:bg-gray-100' 
                    : 'text-gray-300 cursor-not-allowed'
                }`}
              >
                <Undo2 size={18} />
                <span className="text-sm font-medium">撤销</span>
              </button>
              
              {/* 重做 */}
              <button
                onClick={handleRedo}
                disabled={historyIndex >= history.length - 1}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors touch-manipulation ${
                  historyIndex < history.length - 1 
                    ? 'text-gray-700 hover:bg-gray-50 active:bg-gray-100' 
                    : 'text-gray-300 cursor-not-allowed'
                }`}
              >
                <Redo2 size={18} />
                <span className="text-sm font-medium">重做</span>
              </button>
              
              <div className="h-px bg-gray-200 my-1" />
              
              {/* 截图 */}
              <button
                onClick={handleScreenshot}
                className="w-full flex items-center gap-3 px-4 py-3 text-left text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors touch-manipulation"
              >
                <Camera size={18} />
                <span className="text-sm font-medium">截图保存</span>
              </button>
            </div>
          )}
        </div>
      </div>
      
      {/* 点击外部关闭更多菜单 */}
      {showMoreMenu && (
        <div 
          className="fixed inset-0 z-10"
          onClick={() => setShowMoreMenu(false)}
        />
      )}
      
      {/* 3D Scene Layer */}
      <div className="absolute inset-0 z-0">
        <Scene 
          models={models} 
          onSelectModel={handleSelectModel}
          onUpdateModel={handleUpdateModel}
          cameraControlsRef={cameraControlsRef}
        />
      </div>
      
      {/* Performance Monitor */}
      <PerformanceMonitor show={showPerformanceMonitor} />
      
      {/* ViewCube 导航立方体 */}
      <ViewCube mainCameraControlsRef={cameraControlsRef} />

      {/* UI Overlay */}
      <div className="absolute inset-0 z-10 pointer-events-none flex flex-col justify-between">
        
        {/* Header / Controls */}
        <div className="pointer-events-auto">
          <Controls 
            models={models} 
            onUpdate={handleUpdateModel} 
            selectedId={selectedId}
            onCameraPreset={handleCameraPreset}
          />
        </div>

        {/* Footer / Status / Uploads */}
        <div className="hidden bg-white/90 backdrop-blur shadow-lg border-t border-gray-200 p-4 pb-8 sm:pb-4 pointer-events-auto transition-transform duration-300">
          
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 max-w-4xl mx-auto">
            
            {/* Status Message */}
            <div className="flex items-center gap-2 text-sm font-medium text-slate-600 bg-slate-100 px-3 py-1.5 rounded-full">
              <Info size={16} className="text-blue-500" />
              <span>{getStatusMessage()}</span>
            </div>

            {/* Performance Monitor Toggle */}
            {SHOW_FPS_BUTTON && (
              <button 
                className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 active:bg-gray-100 shadow-sm transition-colors text-xs text-slate-700"
                onClick={() => setShowPerformanceMonitor(prev => !prev)}
                title={showPerformanceMonitor ? '隐藏性能监控' : '显示性能监控'}
              >
                {showPerformanceMonitor ? '隐藏FPS' : '显示FPS'}
              </button>
            )}

            {/* File Uploads (Conditionally Hidden) */}
            {SHOW_UPLOAD_BUTTONS && (
              <div className="flex gap-3">
                {models.map((model, idx) => (
                  <div key={model.id} className="relative">
                    <input
                      type="file"
                      accept=".glb,.gltf"
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      onChange={(e) => handleFileUpload(e, idx)}
                      title={`上传 ${model.name} 文件`}
                    />
                    <button className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 active:bg-gray-100 shadow-sm transition-colors text-xs sm:text-sm text-slate-700">
                      <Upload size={14} className="text-slate-500" />
                      <span>替换{model.name}</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="text-center mt-3">
             <p className="text-[10px] text-gray-400">支持 .glb 格式 • 两个模型可独立控制 • 重叠部分自动透视</p>
          </div>
        </div>

      </div>
      
      {/* 帮助弹窗 - 移动端优化 */}
      {showHelp && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center"
          style={{
            paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          }}
        >
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md overflow-hidden animate-in slide-in-from-bottom sm:fade-in sm:zoom-in duration-300">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-5 py-4 flex justify-between items-center">
              <h3 className="text-white font-bold text-lg">操作指南</h3>
              <button
                onClick={() => setShowHelp(false)}
                className="text-white/80 hover:text-white transition-colors p-2 -mr-2 touch-manipulation"
              >
                ✕
              </button>
            </div>
            <div className="p-4 space-y-3 max-h-[50vh] sm:max-h-[60vh] overflow-y-auto">
              {/* 移动端手势指南 */}
              <div className="block sm:hidden space-y-2">
                <div className="bg-blue-50 p-3 rounded-xl">
                  <div className="font-semibold text-gray-800 text-sm">单指拖动</div>
                  <div className="text-xs text-gray-500 mt-1">旋转查看视角</div>
                </div>
                <div className="bg-green-50 p-3 rounded-xl">
                  <div className="font-semibold text-gray-800 text-sm">双指捂合</div>
                  <div className="text-xs text-gray-500 mt-1">缩放视图</div>
                </div>
                <div className="bg-orange-50 p-3 rounded-xl">
                  <div className="font-semibold text-gray-800 text-sm">点击模型拖动</div>
                  <div className="text-xs text-gray-500 mt-1">移动模型位置</div>
                </div>
                <div className="bg-purple-50 p-3 rounded-xl">
                  <div className="font-semibold text-gray-800 text-sm">右上角导航立方体</div>
                  <div className="text-xs text-gray-500 mt-1">点击切换视角，拖动旋转</div>
                </div>
              </div>
              {/* 桌面端指南 */}
              <div className="hidden sm:grid grid-cols-2 gap-2 text-sm">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="font-semibold text-gray-800">鼠标左键拖动</div>
                  <div className="text-xs text-gray-500">旋转视角</div>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="font-semibold text-gray-800">鼠标右键拖动</div>
                  <div className="text-xs text-gray-500">平移视角</div>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="font-semibold text-gray-800">滚轮</div>
                  <div className="text-xs text-gray-500">缩放视角</div>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="font-semibold text-gray-800">点击模型拖动</div>
                  <div className="text-xs text-gray-500">移动模型位置</div>
                </div>
              </div>
              <div className="border-t pt-3 hidden sm:block">
                <div className="text-xs font-semibold text-gray-600 mb-2">键盘快捷键</div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex justify-between"><span className="text-gray-500">Ctrl+Z</span><span>撤销</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Ctrl+Y</span><span>重做</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Ctrl+S</span><span>截图</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">H</span><span>帮助</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">1-5</span><span>预设视角</span></div>
                </div>
              </div>
            </div>
            <div className="px-5 pb-5">
              <button
                onClick={() => setShowHelp(false)}
                className="w-full py-3 bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white font-semibold rounded-xl transition-colors touch-manipulation"
              >
                我知道了
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* 模型画廊 */}
      {viewMode === 'gallery' && (
        <ModelGallery
          onSelectModel={(model) => {
            setSelectedGalleryModel(model);
            setViewMode('single');
          }}
          onBack={() => setViewMode('compare')}
        />
      )}
      
      {/* 单模型查看器 */}
      {viewMode === 'single' && selectedGalleryModel && (
        <SingleModelViewer
          model={selectedGalleryModel}
          onBack={() => setViewMode('gallery')}
        />
      )}
    </div>
  );
};

export default App;