import React, { useState, useCallback, useRef } from 'react';
import { Controls } from './components/Controls.tsx';
import { Scene } from './components/Scene.tsx';
import { ViewCube } from './components/ViewCube.tsx';
import PerformanceMonitor from './components/PerformanceMonitor.tsx';
import { ModelData } from './types';
import { DEFAULT_MODEL_1_URL, DEFAULT_MODEL_2_URL } from './constants';
import { Upload, Info } from 'lucide-react';
import type { OrbitControls as OrbitControlsType } from 'three-stdlib';

const INITIAL_MODELS: ModelData[] = [
  {
    id: 'model-1',
    name: '现实',
    url: '/远征队 完整 现实.glb',
    rectangularPartUrl: '/远征队 矩形整体 现实.glb',
    otherPartUrl: '/远征队 塔仓 现实.glb',
    position: [-1.5, 0, 0],
    rotation: [0, 0, 0],
    scale: [10, 10, 10],
    visible: true,
    selected: false,
    opacity: 1.0,
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
    scale: [10, 10, 10], 
    visible: true,
    selected: false,
    opacity: 1.0,
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
  const cameraControlsRef = useRef<OrbitControlsType | null>(null);

  const handleSelectModel = useCallback((id: string | null) => {
    setSelectedId(id);
    setModels(prev => prev.map(m => ({
      ...m,
      selected: m.id === id
    })));
  }, []);

  const handleUpdateModel = useCallback((id: string, updates: Partial<ModelData>) => {
    setModels(prev => prev.map(m => {
      if (m.id === id) {
        return { ...m, ...updates };
      }
      return m;
    }));
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, modelIndex: number) => {
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
  };

  const getStatusMessage = () => {
    if (selectedId) {
      const selectedModel = models.find(m => m.id === selectedId);
      return `已选中：${selectedModel?.name} - 单指旋转，双指移动`;
    }
    return '全局视角：单指旋转场景，双指平移视角';
  };

  return (
    <div className="w-full h-screen relative bg-gradient-to-br from-blue-50 to-white overflow-hidden font-sans text-slate-800">
      {/* Debug loading indicator (Conditionally Hidden) */}
      {SHOW_LOADING_INDICATOR && (
        <div className="fixed top-0 left-0 right-0 p-4 bg-blue-500 text-white text-center z-50">
          ArchiView 3D 正在加载...
        </div>
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
    </div>
  );
};

export default App;