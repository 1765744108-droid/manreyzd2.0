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

const ControlPanel: React.FC<{ 
  model: ModelData; 
  onUpdate: (id: string, updates: Partial<ModelData>) => void;
  isActive: boolean;
  onReset: () => void;
  isMobile: boolean;
}> = ({ model, onUpdate, isActive, onReset, isMobile }) => {
  // 折叠状态
  const [isCollapsed, setIsCollapsed] = useState(false);
  // 长按相关状态
  const [isLongPressing, setIsLongPressing] = useState(false);
  const [longPressDirection, setLongPressDirection] = useState<'up' | 'down' | null>(null);
  // 透明度本地状态（用于节流）
  const [localOpacity, setLocalOpacity] = useState((model.opacity ?? 1) * 100);
  const opacityTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // 动态按钮尺寸 - 移动端更大
  const buttonClass = isMobile 
    ? 'min-h-[52px] p-3' 
    : 'min-h-[44px] p-2.5';
  const iconSize = isMobile ? 22 : 18;
  
  // 使用 useRef 保存定时器引用，避免闭包问题
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  // 使用 useRef 保存最新的 model 位置，确保动画中能获取最新值
  const positionRef = useRef(model.position);
  // 保存当前是否正在长按及方向
  const isPressingRef = useRef(false);
  const directionRef = useRef<'up' | 'down' | null>(null);
  // 上一帧时间戳
  const lastTimeRef = useRef<number>(0);
  
  // 同步更新 positionRef
  useEffect(() => {
    positionRef.current = model.position;
  }, [model.position]);
  
  // 同步外部透明度变化
  useEffect(() => {
    setLocalOpacity((model.opacity ?? 1) * 100);
  }, [model.opacity]);
  
  // 清理透明度定时器
  useEffect(() => {
    return () => {
      if (opacityTimerRef.current) {
        clearTimeout(opacityTimerRef.current);
      }
    };
  }, []);
  
  // 透明度节流更新
  const handleOpacityChange = useCallback((value: number) => {
    setLocalOpacity(value);
    
    // 清除之前的定时器
    if (opacityTimerRef.current) {
      clearTimeout(opacityTimerRef.current);
    }
    
    // 节流100ms后才更新父组件状态
    opacityTimerRef.current = setTimeout(() => {
      onUpdate(model.id, { opacity: value / 100 });
    }, 100);
  }, [model.id, onUpdate]);
  
  const rotateModel = (axis: 'x' | 'z') => {
    const rad = Math.PI / 2; // 90 degrees
    const currentRot = [...model.rotation];
    
    if (axis === 'x') {
      currentRot[0] += rad;
    } else {
      currentRot[2] += rad;
    }
    
    onUpdate(model.id, { rotation: [currentRot[0], currentRot[1], currentRot[2]] });
  };

  const rotateClockwise = () => {
    const rad = Math.PI / 4; // 45 degrees
    const currentRot = [...model.rotation];
    currentRot[1] += rad; // Rotate around Y axis
    
    onUpdate(model.id, { rotation: [currentRot[0], currentRot[1], currentRot[2]] });
  };

  // 分部隐藏控制函数
  const togglePartialVisibility = (part: 'rectangular' | 'other' | 'all') => {
    const currentVisibility = model.partialVisibility || { rectangularParts: true, otherParts: true };
    
    let newVisibility = { ...currentVisibility };
    
    switch(part) {
      case 'rectangular':
        // 切换矩形立体部分
        newVisibility.rectangularParts = !currentVisibility.rectangularParts;
        break;
      case 'other':
        // 切换其他部分
        newVisibility.otherParts = !currentVisibility.otherParts;
        break;
      case 'all':
        // 切换所有部分（同步切换）
        const allVisible = currentVisibility.rectangularParts && currentVisibility.otherParts;
        newVisibility = { rectangularParts: !allVisible, otherParts: !allVisible };
        break;
    }
    
    onUpdate(model.id, { partialVisibility: newVisibility });
  };
  
  // 使用 requestAnimationFrame 实现丝滑动画
  const animateHeight = useCallback((timestamp: number) => {
    if (!isPressingRef.current || !directionRef.current) return;
    
    // 计算时间增量，实现基于时间的动画（不依赖帧率）
    const deltaTime = lastTimeRef.current ? (timestamp - lastTimeRef.current) / 1000 : 0.016;
    lastTimeRef.current = timestamp;
    
    // 速度：每秒移动 0.15 单位，更丝滑
    const speed = 0.15;
    const step = speed * deltaTime;
    
    const currentPos = [...positionRef.current];
    
    if (directionRef.current === 'up') {
      currentPos[1] += step;
    } else {
      currentPos[1] = Math.max(0, currentPos[1] - step);
    }
    
    // 同时更新 ref 和调用 onUpdate
    positionRef.current = [currentPos[0], currentPos[1], currentPos[2]];
    onUpdate(model.id, { position: [currentPos[0], currentPos[1], currentPos[2]] });
    
    // 继续下一帧动画
    animationFrameRef.current = requestAnimationFrame(animateHeight);
  }, [model.id, onUpdate]);

  const adjustHeight = useCallback((direction: 'up' | 'down') => {
    const step = 0.025;
    const currentPos = [...positionRef.current];
    
    if (direction === 'up') {
      currentPos[1] += step;
    } else {
      currentPos[1] = Math.max(0, currentPos[1] - step);
    }
    
    positionRef.current = [currentPos[0], currentPos[1], currentPos[2]];
    onUpdate(model.id, { position: [currentPos[0], currentPos[1], currentPos[2]] });
  }, [model.id, onUpdate]);

  // 清除所有定时器和动画帧
  const clearAllTimers = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    isPressingRef.current = false;
    directionRef.current = null;
    lastTimeRef.current = 0;
  }, []);

  // 长按开始处理函数
  const startLongPress = useCallback((direction: 'up' | 'down') => (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    // 清除现有的计时器
    clearAllTimers();
    
    // 设置长按方向
    setLongPressDirection(direction);
    
    // 防抖动延迟150ms开始长按检测
    longPressTimerRef.current = setTimeout(() => {
      setIsLongPressing(true);
      isPressingRef.current = true;
      directionRef.current = direction;
      lastTimeRef.current = 0;
      
      // 使用 requestAnimationFrame 启动丝滑动画
      animationFrameRef.current = requestAnimationFrame(animateHeight);
    }, 150);
  }, [animateHeight, clearAllTimers]);

  // 长按停止处理函数
  const stopLongPress = useCallback(() => {
    clearAllTimers();
    setIsLongPressing(false);
    setLongPressDirection(null);
  }, [clearAllTimers]);

  // 组件卸载时清除定时器
  useEffect(() => {
    return () => {
      clearAllTimers();
    };
  }, [clearAllTimers]);

  return (
    <div className={`rounded-xl backdrop-blur-md transition-all duration-300 border ${isActive ? 'bg-white/95 border-blue-400 shadow-lg ring-2 ring-blue-200' : 'bg-white/90 border-gray-200 shadow-md'}`}>
      {/* 标题栏 */}
      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex items-center gap-2">
          <Box size={isMobile ? 18 : 14} className={isActive ? "text-blue-500" : "text-gray-500"} />
          <span className={`font-bold ${isMobile ? 'text-base' : 'text-sm'} ${isActive ? "text-blue-700" : "text-gray-700"}`}>{model.name}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onReset}
            className={`${buttonClass} hover:bg-gray-100 rounded-lg active:scale-90 transition-all touch-manipulation`}
            title="重置视图"
          >
            <RotateCcw size={iconSize - 2} className="text-gray-600" />
          </button>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={`${buttonClass} hover:bg-gray-100 rounded-lg active:scale-90 transition-all touch-manipulation`}
            title={isCollapsed ? "展开" : "折叠"}
          >
            {isCollapsed ? <ChevronUp size={iconSize - 2} /> : <ChevronDown size={iconSize - 2} />}
          </button>
        </div>
      </div>

      {/* 可折叠内容 */}
      {!isCollapsed && (
        <div className="px-3 pb-3 space-y-3">
          {/* 分部控制 - 3列 */}
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => togglePartialVisibility('rectangular')}
              className={`flex flex-col items-center justify-center ${buttonClass} border rounded-xl transition-all touch-manipulation active:scale-90 ${
                model.partialVisibility?.rectangularParts !== false 
                  ? 'bg-green-50 border-green-300 text-green-700' 
                  : 'bg-gray-50 border-gray-200 text-gray-400'
              }`}
            >
              <span className={isMobile ? 'text-xl' : 'text-lg'}>■</span>
              <span className="text-[10px] mt-0.5 font-medium">矩形</span>
            </button>
            <button
              onClick={() => togglePartialVisibility('other')}
              className={`flex flex-col items-center justify-center ${buttonClass} border rounded-xl transition-all touch-manipulation active:scale-90 ${
                model.partialVisibility?.otherParts !== false 
                  ? 'bg-blue-50 border-blue-300 text-blue-700' 
                  : 'bg-gray-50 border-gray-200 text-gray-400'
              }`}
            >
              <span className={isMobile ? 'text-xl' : 'text-lg'}>●</span>
              <span className="text-[10px] mt-0.5 font-medium">塔仓</span>
            </button>
            <button
              onClick={() => togglePartialVisibility('all')}
              className={`flex flex-col items-center justify-center ${buttonClass} border rounded-xl transition-all touch-manipulation active:scale-90 ${
                (model.partialVisibility?.rectangularParts !== false && model.partialVisibility?.otherParts !== false)
                  ? 'bg-purple-50 border-purple-300 text-purple-700' 
                  : 'bg-gray-50 border-gray-200 text-gray-400'
              }`}
            >
              <span className={isMobile ? 'text-xl' : 'text-lg'}>■●</span>
              <span className="text-[10px] mt-0.5 font-medium">全部</span>
            </button>
          </div>

          {/* 旋转控制 - 3列 */}
          <div className="grid grid-cols-3 gap-2">
            <button 
              onClick={() => rotateModel('x')}
              className={`flex flex-col items-center justify-center ${buttonClass} bg-gray-50 hover:bg-blue-50 border border-gray-200 rounded-xl active:scale-90 transition-all touch-manipulation`}
            >
              <RotateCw size={iconSize} className="text-gray-600" />
              <span className="text-[10px] text-gray-500 mt-0.5 font-medium">X轴</span>
            </button>
            <button 
              onClick={() => rotateModel('z')}
              className={`flex flex-col items-center justify-center ${buttonClass} bg-gray-50 hover:bg-blue-50 border border-gray-200 rounded-xl active:scale-90 transition-all touch-manipulation`}
            >
              <RotateCw size={iconSize} className="text-gray-600" />
              <span className="text-[10px] text-gray-500 mt-0.5 font-medium">Z轴</span>
            </button>
            <button 
              onClick={rotateClockwise}
              className={`flex flex-col items-center justify-center ${buttonClass} bg-gray-50 hover:bg-green-50 border border-gray-200 rounded-xl active:scale-90 transition-all touch-manipulation`}
            >
              <RotateCw size={iconSize} className="text-green-600" />
              <span className="text-[10px] text-green-500 mt-0.5 font-medium">Y轴</span>
            </button>
          </div>

          {/* 高度调节 - 2列 */}
          <div className="grid grid-cols-2 gap-2">
            <button 
              onClick={() => adjustHeight('up')}
              onMouseDown={startLongPress('up')}
              onMouseUp={stopLongPress}
              onMouseLeave={stopLongPress}
              onTouchStart={startLongPress('up')}
              onTouchEnd={stopLongPress}
              className={`flex items-center justify-center gap-2 ${buttonClass} bg-gray-50 hover:bg-purple-50 border border-gray-200 rounded-xl active:scale-90 transition-all touch-manipulation ${isLongPressing && longPressDirection === 'up' ? 'bg-purple-100 border-purple-400' : ''}`}
            >
              <span className="text-xl font-bold text-purple-600">↑</span>
              <span className="text-sm text-purple-600 font-medium">升高</span>
            </button>
            <button 
              onClick={() => adjustHeight('down')}
              onMouseDown={startLongPress('down')}
              onMouseUp={stopLongPress}
              onMouseLeave={stopLongPress}
              onTouchStart={startLongPress('down')}
              onTouchEnd={stopLongPress}
              className={`flex items-center justify-center gap-2 ${buttonClass} bg-gray-50 hover:bg-purple-50 border border-gray-200 rounded-xl active:scale-90 transition-all touch-manipulation ${isLongPressing && longPressDirection === 'down' ? 'bg-purple-100 border-purple-400' : ''}`}
            >
              <span className="text-xl font-bold text-purple-600">↓</span>
              <span className="text-sm text-purple-600 font-medium">降低</span>
            </button>
          </div>
          
          {/* 透明度滑块 - 单独一行，全宽 */}
          <div className="bg-gray-50 rounded-xl p-3 border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-600 font-medium">透明度</span>
              <span className="text-xs text-blue-600 font-bold">{Math.round(localOpacity)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={localOpacity}
              onChange={(e) => handleOpacityChange(parseInt(e.target.value))}
              className="w-full h-3 bg-gray-200 rounded-full appearance-none cursor-pointer accent-blue-500 touch-manipulation"
              style={{ 
                WebkitAppearance: 'none',
                background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${localOpacity}%, #e5e7eb ${localOpacity}%, #e5e7eb 100%)`
              }}
            />
          </div>

          {/* 线框和锁定 - 2列 */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                const currentMode = model.wireframe ?? false;
                onUpdate(model.id, { wireframe: !currentMode });
              }}
              className={`flex items-center justify-center gap-2 ${buttonClass} border rounded-xl transition-all touch-manipulation active:scale-90 ${
                model.wireframe 
                  ? 'bg-blue-500 border-blue-500 text-white' 
                  : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Layers size={iconSize} />
              <span className="text-sm font-medium">线框</span>
            </button>
            <button
              onClick={() => {
                const isLocked = model.locked ?? false;
                onUpdate(model.id, { locked: !isLocked });
              }}
              className={`flex items-center justify-center gap-2 ${buttonClass} border rounded-xl transition-all touch-manipulation active:scale-90 ${
                model.locked 
                  ? 'bg-red-500 border-red-500 text-white' 
                  : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
              }`}
            >
              {model.locked ? <Lock size={iconSize} /> : <Unlock size={iconSize} />}
              <span className="text-sm font-medium">{model.locked ? '已锁定' : '未锁定'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export const Controls: React.FC<ControlsProps> = ({ models, onUpdate, selectedId, onCameraPreset }) => {
  // 保存初始状态
  const initialStatesRef = useRef<Map<string, { position: [number, number, number], rotation: [number, number, number] }>>(new Map());
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
    if (!isMobile) return; // 只在移动端启用
    
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      // 如果面板未展开，不处理
      if (!isPanelExpanded) return;
      
      const target = event.target as Node;
      
      // 检查点击是否在控制面板内部
      if (panelContainerRef.current && !panelContainerRef.current.contains(target)) {
        setIsPanelExpanded(false);
      }
    };
    
    // 使用 pointerdown 以同时支持触摸和鼠标
    document.addEventListener('pointerdown', handleClickOutside, { passive: true });
    
    return () => {
      document.removeEventListener('pointerdown', handleClickOutside);
    };
  }, [isMobile, isPanelExpanded]);
  
  useEffect(() => {
    // 初始化时保存每个模型的初始状态
    models.forEach(model => {
      if (!initialStatesRef.current.has(model.id)) {
        initialStatesRef.current.set(model.id, {
          position: [...model.position],
          rotation: [...model.rotation]
        });
      }
    });
  }, []); // 只在组件挂载时执行一次

  const handleReset = useCallback((modelId: string) => {
    const initialState = initialStatesRef.current.get(modelId);
    if (initialState) {
      onUpdate(modelId, {
        position: [...initialState.position],
        rotation: [...initialState.rotation]
      });
    }
  }, [onUpdate]);
  
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
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 pointer-events-auto">
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
                className="w-full py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl active:scale-98 transition-all"
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
        <div className={`flex mb-2 bg-white/95 backdrop-blur-md rounded-2xl p-1.5 shadow-lg border border-gray-200 ${
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
              className={`flex-1 flex items-center justify-center gap-2 rounded-xl font-bold transition-all touch-manipulation ${
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
              className={`flex items-center justify-center rounded-xl transition-all touch-manipulation min-w-[48px] ${
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
        
        {/* 当前选中的模型控制面板 - 丝滑折叠动画 */}
        <div className={`transition-all duration-300 ease-out overflow-hidden ${
          (isPanelExpanded || !isMobile) && activeModel
            ? 'max-h-[600px] opacity-100 transform translate-y-0'
            : 'max-h-0 opacity-0 transform translate-y-4'
        }`}>
          {activeModel && (
            <ControlPanel 
              model={activeModel} 
              onUpdate={onUpdate} 
              isActive={selectedId === activeModel.id}
              onReset={() => handleReset(activeModel.id)}
              isMobile={isMobile}
            />
          )}
        </div>
        
        {/* 视角切换按钮组 - 丝滑折叠动画 */}
        {onCameraPreset && (
          <div className={`transition-all duration-300 ease-out overflow-hidden mt-2 ${
            (isPanelExpanded || !isMobile)
              ? 'max-h-[200px] opacity-100 transform translate-y-0'
              : 'max-h-0 opacity-0 transform translate-y-4'
          }`}>
            <div className="bg-white/95 backdrop-blur-md rounded-xl p-2 shadow-lg border border-gray-200">
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
                    className={`py-2 px-2 text-xs font-medium rounded-lg transition-all touch-manipulation active:scale-95 ${
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