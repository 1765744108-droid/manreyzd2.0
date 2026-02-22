import React, { useState, useRef, useCallback, useEffect } from 'react';
import { RotateCw, Box, ChevronDown, ChevronUp, RotateCcw, X, Hand, Move, ZoomIn, MousePointer2, Eye, EyeOff, Layers, Compass, SlidersHorizontal, Smartphone, Navigation, Lock, Unlock, MapPin } from 'lucide-react';
import { ModelData } from '../types';
import { ANIMATION_CONFIG } from '../constants';

interface ControlsProps {
  models: ModelData[];
  onUpdate: (id: string, updates: Partial<ModelData>) => void;
  selectedId: string | null;
}

const ControlPanel: React.FC<{ 
  model: ModelData; 
  onUpdate: (id: string, updates: Partial<ModelData>) => void;
  isActive: boolean;
  onReset: () => void;
}> = ({ model, onUpdate, isActive, onReset }) => {
  // 折叠状态
  const [isCollapsed, setIsCollapsed] = useState(false);
  // 长按相关状态
  const [isLongPressing, setIsLongPressing] = useState(false);
  const [longPressDirection, setLongPressDirection] = useState<'up' | 'down' | null>(null);
  // 透明度本地状态（用于节流）
  const [localOpacity, setLocalOpacity] = useState((model.opacity ?? 1) * 100);
  const opacityTimerRef = useRef<NodeJS.Timeout | null>(null);
  
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
      {/* 紧凑标题栏 - 增大触摸区域 */}
      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex items-center gap-2">
          <Box size={14} className={isActive ? "text-blue-500" : "text-gray-500"} />
          <span className={`font-bold text-sm ${isActive ? "text-blue-700" : "text-gray-700"}`}>{model.name}</span>
        </div>
        <div className="flex items-center gap-1">
          {/* 重置按钮 */}
          <button
            onClick={onReset}
            className="p-2.5 hover:bg-gray-100 rounded-lg active:scale-95 transition-all touch-manipulation"
            title="重置视图"
          >
            <RotateCcw size={16} className="text-gray-600" />
          </button>
          {/* 折叠按钮 */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2.5 hover:bg-gray-100 rounded-lg active:scale-95 transition-all touch-manipulation"
            title={isCollapsed ? "展开" : "折叠"}
          >
            {isCollapsed ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {/* 可折叠内容 - 移动端优化布局 */}
      {!isCollapsed && (
        <div className="px-3 pb-3 space-y-2">
          {/* 分部控制 - 横向紧凑，添加文字标签 */}
          <div className="grid grid-cols-3 gap-1.5">
            <button
              onClick={() => togglePartialVisibility('rectangular')}
              className={`flex flex-col items-center justify-center py-2.5 px-2 border rounded-lg transition-all touch-manipulation min-h-[52px] active:scale-95 ${
                  model.partialVisibility?.rectangularParts !== false 
                    ? 'bg-green-50 border-green-300 text-green-700' 
                    : 'bg-gray-50 border-gray-200 text-gray-400'
                }`}
                title="矩形部分"
              >
                <span className="text-base">■</span>
                <span className="text-[10px] mt-0.5 font-medium">矩形</span>
              </button>
              <button
                onClick={() => togglePartialVisibility('other')}
                className={`flex flex-col items-center justify-center py-2.5 px-2 border rounded-lg transition-all touch-manipulation min-h-[52px] active:scale-95 ${
                  model.partialVisibility?.otherParts !== false 
                    ? 'bg-blue-50 border-blue-300 text-blue-700' 
                    : 'bg-gray-50 border-gray-200 text-gray-400'
                }`}
                title="塔仓部分"
              >
                <span className="text-base">●</span>
                <span className="text-[10px] mt-0.5 font-medium">塔仓</span>
              </button>
              <button
                onClick={() => togglePartialVisibility('all')}
                className={`flex flex-col items-center justify-center py-2.5 px-2 border rounded-lg transition-all touch-manipulation min-h-[52px] active:scale-95 ${
                  (model.partialVisibility?.rectangularParts !== false && model.partialVisibility?.otherParts !== false)
                    ? 'bg-purple-50 border-purple-300 text-purple-700' 
                    : 'bg-gray-50 border-gray-200 text-gray-400'
                }`}
                title="全部"
              >
                <span className="text-base">■●</span>
                <span className="text-[10px] mt-0.5 font-medium">全部</span>
              </button>
            </div>
          
          {/* 位置显示 - 移动端可选隐藏 */}
          <div className="hidden sm:flex items-center gap-1.5 text-[10px] text-gray-500 bg-gray-50 rounded-lg px-2.5 py-1.5">
            <MapPin size={12} />
            <span>X:{model.position[0].toFixed(1)}</span>
            <span>Y:{model.position[1].toFixed(1)}</span>
            <span>Z:{model.position[2].toFixed(1)}</span>
          </div>

          {/* 旋转和高度控制合并 - 5列紧凑布局，增大触摸目标 */}
          <div className="grid grid-cols-5 gap-1.5">
            <button 
              onClick={() => rotateModel('x')}
              className="flex flex-col items-center justify-center py-2.5 bg-gray-50 hover:bg-blue-50 border border-gray-200 rounded-lg active:scale-95 transition-all touch-manipulation min-h-[52px]"
              title="X轴"
            >
              <RotateCw size={18} className="text-gray-600" />
              <span className="text-[10px] text-gray-500 mt-0.5 font-medium">X</span>
            </button>
            <button 
              onClick={() => rotateModel('z')}
              className="flex flex-col items-center justify-center py-2.5 bg-gray-50 hover:bg-blue-50 border border-gray-200 rounded-lg active:scale-95 transition-all touch-manipulation min-h-[52px]"
              title="Z轴"
            >
              <RotateCw size={18} className="text-gray-600" />
              <span className="text-[10px] text-gray-500 mt-0.5 font-medium">Z</span>
            </button>
            <button 
              onClick={rotateClockwise}
              className="flex flex-col items-center justify-center py-2.5 bg-gray-50 hover:bg-green-50 border border-gray-200 rounded-lg active:scale-95 transition-all touch-manipulation min-h-[52px]"
              title="顺时针"
            >
              <RotateCw size={18} className="text-green-600" />
              <span className="text-[10px] text-green-500 mt-0.5 font-medium">Y</span>
            </button>
            <button 
              onClick={() => adjustHeight('up')}
              onMouseDown={startLongPress('up')}
              onMouseUp={stopLongPress}
              onMouseLeave={stopLongPress}
              onTouchStart={startLongPress('up')}
              onTouchEnd={stopLongPress}
              className={`flex flex-col items-center justify-center py-2.5 bg-gray-50 hover:bg-purple-50 border border-gray-200 rounded-lg active:scale-95 transition-all touch-manipulation min-h-[52px] ${isLongPressing && longPressDirection === 'up' ? 'bg-purple-100 border-purple-400' : ''}`}
              title="升高"
            >
              <span className="text-xl font-bold text-purple-600">↑</span>
            </button>
            <button 
              onClick={() => adjustHeight('down')}
              onMouseDown={startLongPress('down')}
              onMouseUp={stopLongPress}
              onMouseLeave={stopLongPress}
              onTouchStart={startLongPress('down')}
              onTouchEnd={stopLongPress}
              className={`flex flex-col items-center justify-center py-2.5 bg-gray-50 hover:bg-purple-50 border border-gray-200 rounded-lg active:scale-95 transition-all touch-manipulation min-h-[52px] ${isLongPressing && longPressDirection === 'down' ? 'bg-purple-100 border-purple-400' : ''}`}
              title="降低"
            >
              <span className="text-xl font-bold text-purple-600">↓</span>
            </button>
          </div>
          
          {/* 透明度、线框模式和锁定控制 */}
          <div className="flex gap-1.5 items-center">
            <div className="flex-1">
              <div className="text-[10px] text-gray-500 mb-1 font-medium">透明度</div>
              <input
                type="range"
                min="0"
                max="100"
                value={localOpacity}
                onChange={(e) => handleOpacityChange(parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
            </div>
            <button
              onClick={() => {
                const currentMode = model.wireframe ?? false;
                onUpdate(model.id, { wireframe: !currentMode });
              }}
              className={`p-2.5 border rounded-lg transition-all touch-manipulation min-w-[48px] min-h-[48px] flex items-center justify-center active:scale-95 ${
                model.wireframe 
                  ? 'bg-blue-500 border-blue-500 text-white' 
                  : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
              }`}
              title="线框模式"
            >
              <Layers size={18} />
            </button>
            <button
              onClick={() => {
                const isLocked = model.locked ?? false;
                onUpdate(model.id, { locked: !isLocked });
              }}
              className={`p-2.5 border rounded-lg transition-all touch-manipulation min-w-[48px] min-h-[48px] flex items-center justify-center active:scale-95 ${
                model.locked 
                  ? 'bg-red-500 border-red-500 text-white' 
                  : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
              }`}
              title={model.locked ? "解锁模型" : "锁定模型"}
            >
              {model.locked ? <Lock size={18} /> : <Unlock size={18} />}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export const Controls: React.FC<ControlsProps> = ({ models, onUpdate, selectedId }) => {
  // 保存初始状态
  const initialStatesRef = useRef<Map<string, { position: [number, number, number], rotation: [number, number, number] }>>(new Map());
  // 手势提示状态
  const [showGestureTip, setShowGestureTip] = useState(() => {
    // 检查是否已经显示过提示（使用 localStorage）
    if (typeof window !== 'undefined') {
      return !localStorage.getItem('gesture-tip-seen');
    }
    return false;
  });
  
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
      
      {/* 模型控制面板 - 移动端优化布局 */}
      <div 
        className="absolute left-0 right-0 flex flex-row gap-2 px-3 pointer-events-none sm:px-4 sm:gap-3" 
        style={{ 
          // 移动端底部距离，考虑安全区域和浏览器UI
          bottom: 'max(20px, calc(env(safe-area-inset-bottom, 0px) + 12px))',
        }}
      >
        {models.map((model) => (
          <div key={model.id} className="flex-1 pointer-events-auto max-w-[50%]">
            <ControlPanel 
              model={model} 
              onUpdate={onUpdate} 
              isActive={selectedId === model.id}
              onReset={() => handleReset(model.id)}
            />
          </div>
        ))}
      </div>
    </>
  );
};