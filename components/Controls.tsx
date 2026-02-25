import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { RotateCw, Box, ChevronDown, ChevronUp, RotateCcw, X, Hand, Move, ZoomIn, MousePointer2, Eye, EyeOff, Layers, Compass, SlidersHorizontal, Smartphone, Navigation, Lock, Unlock, MapPin, Video, ChevronRight } from 'lucide-react';
import { ModelData, CameraPreset } from '../types';
import { ANIMATION_CONFIG, MOBILE_CONFIG } from '../constants';

interface ControlsProps {
  models: ModelData[];
  onUpdate: (id: string, updates: Partial<ModelData>) => void;
  selectedId: string | null;
  onCameraPreset?: (preset: CameraPreset) => void;
}

// 简化的模型控制面板 - 只保留分部控制和线框/锁定
const ControlPanel: React.FC<{ 
  model: ModelData; 
  onUpdate: (id: string, updates: Partial<ModelData>) => void;
  isActive: boolean;
  isMobile: boolean;
}> = ({ model, onUpdate, isActive, isMobile }) => {
  // 动态按钮尺寸
  const buttonClass = isMobile 
    ? 'min-h-[48px] p-2.5' 
    : 'min-h-[40px] p-2';
  const iconSize = isMobile ? 20 : 16;

  // 分部隐藏控制函数
  const togglePartialVisibility = (part: 'rectangular' | 'other' | 'all') => {
    const currentVisibility = model.partialVisibility || { rectangularParts: true, otherParts: true };
    
    let newVisibility = { ...currentVisibility };
    
    switch(part) {
      case 'rectangular':
        newVisibility.rectangularParts = !currentVisibility.rectangularParts;
        break;
      case 'other':
        newVisibility.otherParts = !currentVisibility.otherParts;
        break;
      case 'all':
        const allVisible = currentVisibility.rectangularParts && currentVisibility.otherParts;
        newVisibility = { rectangularParts: !allVisible, otherParts: !allVisible };
        break;
    }
    
    onUpdate(model.id, { partialVisibility: newVisibility });
  };

  return (
    <div className={`rounded-xl transition-colors duration-200 border ${isActive ? 'bg-white/80 border-blue-400 shadow-lg' : 'bg-white/70 border-gray-200/70 shadow-md'}`}>
      <div className="p-2.5 space-y-2">
        {/* 分部控制 + 线框/锁定 - 单行5列 */}
        <div className="grid grid-cols-5 gap-1.5">
          <button
            onClick={() => togglePartialVisibility('rectangular')}
            className={`flex flex-col items-center justify-center ${buttonClass} border rounded-xl transition-transform touch-manipulation active:scale-90 ${
              model.partialVisibility?.rectangularParts !== false 
                ? 'bg-green-50 border-green-300 text-green-700' 
                : 'bg-gray-50 border-gray-200 text-gray-400'
            }`}
          >
            <span className={isMobile ? 'text-lg' : 'text-base'}>■</span>
            <span className="text-[9px] font-medium">矩形</span>
          </button>
          <button
            onClick={() => togglePartialVisibility('other')}
            className={`flex flex-col items-center justify-center ${buttonClass} border rounded-xl transition-transform touch-manipulation active:scale-90 ${
              model.partialVisibility?.otherParts !== false 
                ? 'bg-blue-50 border-blue-300 text-blue-700' 
                : 'bg-gray-50 border-gray-200 text-gray-400'
            }`}
          >
            <span className={isMobile ? 'text-lg' : 'text-base'}>●</span>
            <span className="text-[9px] font-medium">塔仓</span>
          </button>
          <button
            onClick={() => togglePartialVisibility('all')}
            className={`flex flex-col items-center justify-center ${buttonClass} border rounded-xl transition-transform touch-manipulation active:scale-90 ${
              (model.partialVisibility?.rectangularParts !== false && model.partialVisibility?.otherParts !== false)
                ? 'bg-purple-50 border-purple-300 text-purple-700' 
                : 'bg-gray-50 border-gray-200 text-gray-400'
            }`}
          >
            <span className={isMobile ? 'text-lg' : 'text-base'}>■●</span>
            <span className="text-[9px] font-medium">全部</span>
          </button>
          <button
            onClick={() => {
              const currentMode = model.wireframe ?? false;
              onUpdate(model.id, { wireframe: !currentMode });
            }}
            className={`flex flex-col items-center justify-center ${buttonClass} border rounded-xl transition-transform touch-manipulation active:scale-90 ${
              model.wireframe 
                ? 'bg-blue-500 border-blue-500 text-white' 
                : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Layers size={iconSize} />
            <span className="text-[9px] font-medium">线框</span>
          </button>
          <button
            onClick={() => {
              const isLocked = model.locked ?? false;
              onUpdate(model.id, { locked: !isLocked });
            }}
            className={`flex flex-col items-center justify-center ${buttonClass} border rounded-xl transition-transform touch-manipulation active:scale-90 ${
              model.locked 
                ? 'bg-red-500 border-red-500 text-white' 
                : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
            }`}
          >
            {model.locked ? <Lock size={iconSize} /> : <Unlock size={iconSize} />}
            <span className="text-[9px] font-medium">{model.locked ? '锁定' : '移动'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export const Controls: React.FC<ControlsProps> = ({ models, onUpdate, selectedId, onCameraPreset }) => {
  // 手势提示状态
  const [showGestureTip, setShowGestureTip] = useState(() => {
    if (typeof window !== 'undefined') {
      return !localStorage.getItem('gesture-tip-seen');
    }
    return false;
  });
  
  // 控制面板容器引用 - 用于检测外部点击
  const panelContainerRef = useRef<HTMLDivElement>(null);
  
  // 移动端检测
  const isMobile = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           window.innerWidth < 768 ||
           'ontouchstart' in window;
  }, []);
  
  // 选项卡状态 - 0=现实模型, 1=锚定模型
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  
  // 控制面板展开状态 - 移动端默认折叠
  const [isPanelExpanded, setIsPanelExpanded] = useState(!isMobile);
  
  // 获取当前活动模型
  const activeModel = models[activeTabIndex];
  
  // 监听全局点击事件 - 点击外部时收起面板
  useEffect(() => {
    if (!isMobile) return;
    
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (!isPanelExpanded) return;
      
      const target = event.target as Node;
      
      if (panelContainerRef.current && !panelContainerRef.current.contains(target)) {
        setIsPanelExpanded(false);
      }
    };
    
    document.addEventListener('pointerdown', handleClickOutside, { passive: true });
    
    return () => {
      document.removeEventListener('pointerdown', handleClickOutside);
    };
  }, [isMobile, isPanelExpanded]);
  
  const handleCloseTip = useCallback(() => {
    setShowGestureTip(false);
    if (typeof window !== 'undefined') {
      localStorage.setItem('gesture-tip-seen', 'true');
    }
  }, []);

  return (
    <>
      {/* 手势提示卡片 - 图文结合优化版 */}
      {showGestureTip && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 pointer-events-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden animate-in fade-in zoom-in duration-300">
            {/* 标题栏 */}
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4 relative">
              <h3 className="text-white font-bold text-lg flex items-center gap-2">
                <Hand size={20} className="animate-pulse" />
                操作指南
              </h3>
              <button
                onClick={handleCloseTip}
                className="absolute top-4 right-4 p-1.5 hover:bg-white/20 rounded-full transition-colors"
                aria-label="关闭"
              >
                <X size={18} className="text-white" />
              </button>
            </div>
            
            {/* 手势说明列表 - 添加滚动支持 */}
            <div className="p-4 space-y-3 max-h-[60vh] overflow-y-auto">
              {/* 单指旋转 */}
              <div className="flex items-start gap-3 p-2.5 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors">
                <div className="flex-shrink-0 w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                  <RotateCw size={20} className="text-white" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-gray-800 text-sm mb-0.5">单指拖动</div>
                  <div className="text-xs text-gray-600">旋转查看模型各个角度</div>
                </div>
              </div>
                          
              {/* 双指缩放 */}
              <div className="flex items-start gap-3 p-2.5 bg-green-50 rounded-xl hover:bg-green-100 transition-colors">
                <div className="flex-shrink-0 w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                  <ZoomIn size={20} className="text-white" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-gray-800 text-sm mb-0.5">双指捨合</div>
                  <div className="text-xs text-gray-600">放大或缩小视图</div>
                </div>
              </div>
                          
              {/* 点击模型 */}
              <div className="flex items-start gap-3 p-2.5 bg-orange-50 rounded-xl hover:bg-orange-100 transition-colors">
                <div className="flex-shrink-0 w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center">
                  <MousePointer2 size={20} className="text-white" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-gray-800 text-sm mb-0.5">点击并拖动模型</div>
                  <div className="text-xs text-gray-600">选中后可在地面上移动位置，支持全视角跟随</div>
                </div>
              </div>
                          
              {/* ViewCube导航立方体 */}
              <div className="flex items-start gap-3 p-2.5 bg-indigo-50 rounded-xl hover:bg-indigo-100 transition-colors">
                <div className="flex-shrink-0 w-10 h-10 bg-indigo-500 rounded-full flex items-center justify-center">
                  <Navigation size={20} className="text-white" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-gray-800 text-sm mb-0.5">导航立方体</div>
                  <div className="text-xs text-gray-600">右上角3D立方体，点击切换预设视角，拖动旋转视图</div>
                </div>
              </div>
                          
              {/* 透明度调节 */}
              <div className="flex items-start gap-3 p-2.5 bg-purple-50 rounded-xl hover:bg-purple-100 transition-colors">
                <div className="flex-shrink-0 w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center">
                  <SlidersHorizontal size={20} className="text-white" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-gray-800 text-sm mb-0.5">透明度调节</div>
                  <div className="text-xs text-gray-600">底部控制栏滑块可调节模型透明度</div>
                </div>
              </div>
                          
              {/* 移动端优化 */}
              <div className="flex items-start gap-3 p-2.5 bg-teal-50 rounded-xl hover:bg-teal-100 transition-colors">
                <div className="flex-shrink-0 w-10 h-10 bg-teal-500 rounded-full flex items-center justify-center">
                  <Smartphone size={20} className="text-white" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-gray-800 text-sm mb-0.5">移动端优化</div>
                  <div className="text-xs text-gray-600">界面已适配手机/平板，触摸操作更流畅</div>
                </div>
              </div>
            </div>
            
            {/* 底部按钮 */}
            <div className="px-6 pb-6">
              <button
                onClick={handleCloseTip}
                className="w-full py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl active:scale-98 transition-transform"
              >
                开始体验
              </button>
              <p className="text-center text-xs text-gray-400 mt-3">此提示仅显示一次</p>
            </div>
          </div>
        </div>
      )}
      
      {/* 模型控制面板 - 统一使用选项卡切换布局 */}
      <div 
        ref={panelContainerRef}
        className={`absolute left-0 right-0 pointer-events-auto ${
          isMobile ? 'px-3' : 'px-4 max-w-lg mx-auto'
        }`}
        style={{ 
          bottom: isMobile 
            ? 'max(16px, calc(env(safe-area-inset-bottom, 0px) + 8px))'
            : 'max(20px, calc(env(safe-area-inset-bottom, 0px) + 12px))',
        }}
      >
        {/* 选项卡切换按钮组 + 展开/收起按钮 */}
        <div className={`flex mb-2 bg-white/70 rounded-2xl p-1.5 shadow-lg border border-gray-200/70 ${
          isMobile ? 'gap-1' : 'gap-2'
        }`}>
          {models.map((model, index) => (
            <button
              key={model.id}
              onClick={() => {
                setActiveTabIndex(index);
                // 移动端点击标签时展开面板
                if (isMobile && !isPanelExpanded) {
                  setIsPanelExpanded(true);
                }
              }}
              className={`flex-1 flex items-center justify-center gap-2 rounded-xl font-bold transition-colors touch-manipulation ${
                isMobile 
                  ? 'py-3 px-4 text-sm min-h-[48px]' 
                  : 'py-2.5 px-6 text-sm'
              } ${
                activeTabIndex === index
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md'
                  : 'bg-transparent text-gray-600 hover:bg-gray-100'
              }`}
            >
              {/* 指示图标 */}
              <span className={`w-2 h-2 rounded-full ${
                activeTabIndex === index 
                  ? 'bg-white' 
                  : index === 0 ? 'bg-green-400' : 'bg-orange-400'
              }`} />
              {model.name}
            </button>
          ))}
          
          {/* 移动端展开/收起按钮 */}
          {isMobile && (
            <button
              onClick={() => setIsPanelExpanded(!isPanelExpanded)}
              className={`flex items-center justify-center rounded-xl transition-transform touch-manipulation min-w-[48px] ${
                isPanelExpanded 
                  ? 'bg-gray-200 text-gray-600' 
                  : 'bg-blue-100 text-blue-600'
              }`}
            >
              {isPanelExpanded ? (
                <ChevronDown size={22} />
              ) : (
                <ChevronUp size={22} />
              )}
            </button>
          )}
        </div>
        
        {/* 当前选中的模型控制面板 - 简化版 */}
        <div className={`transition-[max-height,opacity] duration-300 ease-out overflow-hidden ${
          (isPanelExpanded || !isMobile) && activeModel
            ? 'max-h-[200px] opacity-100 transform translate-y-0'
            : 'max-h-0 opacity-0 transform translate-y-4'
        }`}>
          {activeModel && (
            <ControlPanel 
              model={activeModel} 
              onUpdate={onUpdate} 
              isActive={selectedId === activeModel.id}
              isMobile={isMobile}
            />
          )}
        </div>
        
        {/* 视角切换按钮组 - 丝滑折叠动画 */}
        {onCameraPreset && (
          <div className={`transition-[max-height,opacity] duration-300 ease-out overflow-hidden mt-2 ${
            (isPanelExpanded || !isMobile)
              ? 'max-h-[200px] opacity-100 transform translate-y-0'
              : 'max-h-0 opacity-0 transform translate-y-4'
          }`}>
            <div className="bg-white/70 rounded-xl p-2 shadow-lg border border-gray-200/70">
              <div className="flex items-center gap-1 mb-1.5">
                <Video size={14} className="text-gray-500" />
                <span className="text-xs text-gray-500 font-medium">视角切换</span>
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                {[
                  { key: 'front', label: '前' },
                  { key: 'back', label: '后' },
                  { key: 'side', label: '侧' },
                  { key: 'top', label: '顶' },
                  { key: 'iso', label: '等轴' },
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => onCameraPreset(key as CameraPreset)}
                    className={`py-2 px-2 text-xs font-medium rounded-lg transition-colors touch-manipulation active:scale-95 ${
                      isMobile ? 'min-h-[44px]' : 'min-h-[36px]'
                    } bg-gray-50 hover:bg-blue-50 text-gray-600 hover:text-blue-600 border border-gray-200`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};