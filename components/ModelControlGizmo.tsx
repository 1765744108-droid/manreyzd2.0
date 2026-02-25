import React, { useCallback, useRef, useEffect, useState } from 'react';
import { Html } from '@react-three/drei';
import { ModelData } from '../types';
import { RotateCw, RotateCcw, ChevronUp, ChevronDown, X, RefreshCw } from 'lucide-react';

interface ModelControlGizmoProps {
  model: ModelData;
  onUpdate: (id: string, updates: Partial<ModelData>) => void;
  onClose: () => void;
  isMobile: boolean;
  initialPosition: { position: [number, number, number]; rotation: [number, number, number] };
}

export const ModelControlGizmo: React.FC<ModelControlGizmoProps> = ({
  model,
  onUpdate,
  onClose,
  isMobile,
  initialPosition,
}) => {
  // 透明度和高度的本地状态
  const [localOpacity, setLocalOpacity] = useState((model.opacity ?? 1) * 100);
  const [localHeight, setLocalHeight] = useState(model.position[1]);
  
  // 长按相关
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const isPressingRef = useRef(false);
  const directionRef = useRef<'up' | 'down' | null>(null);
  const lastTimeRef = useRef<number>(0);
  const positionRef = useRef(model.position);
  
  // 透明度节流定时器
  const opacityTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // 同步外部变化
  useEffect(() => {
    setLocalOpacity((model.opacity ?? 1) * 100);
    setLocalHeight(model.position[1]);
    positionRef.current = model.position;
  }, [model.opacity, model.position]);
  
  // 清理定时器
  const clearAllTimers = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (opacityTimerRef.current) {
      clearTimeout(opacityTimerRef.current);
      opacityTimerRef.current = null;
    }
    isPressingRef.current = false;
    directionRef.current = null;
    lastTimeRef.current = 0;
  }, []);
  
  useEffect(() => {
    return () => clearAllTimers();
  }, [clearAllTimers]);
  
  // 旋转控制
  const rotateModel = useCallback((axis: 'x' | 'y' | 'z', direction: number = 1) => {
    const rad = (Math.PI / 4) * direction; // 45度
    const currentRot = [...model.rotation];
    
    if (axis === 'x') currentRot[0] += rad;
    else if (axis === 'y') currentRot[1] += rad;
    else currentRot[2] += rad;
    
    onUpdate(model.id, { rotation: [currentRot[0], currentRot[1], currentRot[2]] });
  }, [model.id, model.rotation, onUpdate]);
  
  // 高度调节动画
  const animateHeight = useCallback((timestamp: number) => {
    if (!isPressingRef.current || !directionRef.current) return;
    
    const deltaTime = lastTimeRef.current ? (timestamp - lastTimeRef.current) / 1000 : 0.016;
    lastTimeRef.current = timestamp;
    
    const speed = 0.15;
    const step = speed * deltaTime;
    
    const currentPos = [...positionRef.current];
    
    if (directionRef.current === 'up') {
      currentPos[1] += step;
    } else {
      currentPos[1] = Math.max(0, currentPos[1] - step);
    }
    
    positionRef.current = [currentPos[0], currentPos[1], currentPos[2]];
    setLocalHeight(currentPos[1]);
    onUpdate(model.id, { position: [currentPos[0], currentPos[1], currentPos[2]] });
    
    animationFrameRef.current = requestAnimationFrame(animateHeight);
  }, [model.id, onUpdate]);
  
  // 高度调节
  const adjustHeight = useCallback((direction: 'up' | 'down') => {
    const step = 0.025;
    const currentPos = [...positionRef.current];
    
    if (direction === 'up') {
      currentPos[1] += step;
    } else {
      currentPos[1] = Math.max(0, currentPos[1] - step);
    }
    
    positionRef.current = [currentPos[0], currentPos[1], currentPos[2]];
    setLocalHeight(currentPos[1]);
    onUpdate(model.id, { position: [currentPos[0], currentPos[1], currentPos[2]] });
  }, [model.id, onUpdate]);
  
  // 长按开始
  const startLongPress = useCallback((direction: 'up' | 'down') => (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    clearAllTimers();
    
    longPressTimerRef.current = setTimeout(() => {
      isPressingRef.current = true;
      directionRef.current = direction;
      lastTimeRef.current = 0;
      animationFrameRef.current = requestAnimationFrame(animateHeight);
    }, 150);
  }, [animateHeight, clearAllTimers]);
  
  // 长按结束
  const stopLongPress = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    clearAllTimers();
  }, [clearAllTimers]);
  
  // 透明度变化 - 添加节流减少重渲染
  const handleOpacityChange = useCallback((value: number) => {
    setLocalOpacity(value);
    
    // 清除之前的定时器
    if (opacityTimerRef.current) {
      clearTimeout(opacityTimerRef.current);
    }
    
    // 节流150ms后才更新
    opacityTimerRef.current = setTimeout(() => {
      onUpdate(model.id, { opacity: value / 100 });
    }, 150);
  }, [model.id, onUpdate]);
  
  // 重置
  const handleReset = useCallback(() => {
    onUpdate(model.id, {
      position: [...initialPosition.position],
      rotation: [...initialPosition.rotation],
    });
    positionRef.current = initialPosition.position;
    setLocalHeight(initialPosition.position[1]);
  }, [model.id, initialPosition, onUpdate]);
  
  const buttonSize = isMobile ? 44 : 36;
  const iconSize = isMobile ? 20 : 16;
  
  return (
    <Html
      position={[0, 2.5, 0]}
      center
      style={{
        pointerEvents: 'auto',
        userSelect: 'none',
        touchAction: 'none',
      }}
      zIndexRange={[100, 0]}
    >
      <div 
        className="relative"
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        {/* 主控制面板 - 简化样式 */}
        <div className={`bg-black/80 rounded-2xl p-3 shadow-xl border border-white/10 ${
          isMobile ? 'min-w-[180px]' : 'min-w-[160px]'
        }`}>
          {/* 标题栏 - 简化 */}
          <div className="flex items-center justify-between mb-2 pb-2 border-b border-white/10">
            <span className={`text-white font-bold ${isMobile ? 'text-sm' : 'text-xs'}`}>
              {model.name}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={handleReset}
                className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                title="重置"
              >
                <RefreshCw size={iconSize - 2} className="text-white/80" />
              </button>
              <button
                onClick={onClose}
                className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X size={iconSize - 2} className="text-white/80" />
              </button>
            </div>
          </div>
          
          {/* 旋转控制 - 简化 */}
          <div className="mb-2">
            <span className="text-white/50 text-[9px] mb-1 block">旋转</span>
            <div className="flex items-center justify-center gap-1.5">
              {/* X轴旋转 */}
              <button
                onClick={() => rotateModel('x')}
                className="flex flex-col items-center justify-center bg-white/10 active:bg-blue-500/50 rounded-lg"
                style={{ width: buttonSize, height: buttonSize }}
              >
                <RotateCw size={iconSize} className="text-red-400" />
                <span className="text-[7px] text-white/60">X</span>
              </button>
              
              {/* Y轴旋转 */}
              <button
                onClick={() => rotateModel('y')}
                className="flex flex-col items-center justify-center bg-white/10 active:bg-green-500/50 rounded-lg"
                style={{ width: buttonSize, height: buttonSize }}
              >
                <RotateCw size={iconSize} className="text-green-400" />
                <span className="text-[7px] text-white/60">Y</span>
              </button>
              
              {/* Z轴旋转 */}
              <button
                onClick={() => rotateModel('z')}
                className="flex flex-col items-center justify-center bg-white/10 active:bg-blue-500/50 rounded-lg"
                style={{ width: buttonSize, height: buttonSize }}
              >
                <RotateCw size={iconSize} className="text-blue-400" />
                <span className="text-[7px] text-white/60">Z</span>
              </button>
            </div>
          </div>
          
          {/* 高度调节 - 简化 */}
          <div className="mb-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-white/50 text-[9px]">高度</span>
              <span className="text-white/70 text-[9px] font-mono">{localHeight.toFixed(2)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => adjustHeight('down')}
                onMouseDown={startLongPress('down')}
                onMouseUp={stopLongPress}
                onMouseLeave={stopLongPress}
                onTouchStart={startLongPress('down')}
                onTouchEnd={stopLongPress}
                className="flex-1 flex items-center justify-center bg-white/10 active:bg-purple-500/50 rounded-lg py-1.5"
              >
                <ChevronDown size={iconSize} className="text-purple-400" />
              </button>
              <button
                onClick={() => adjustHeight('up')}
                onMouseDown={startLongPress('up')}
                onMouseUp={stopLongPress}
                onMouseLeave={stopLongPress}
                onTouchStart={startLongPress('up')}
                onTouchEnd={stopLongPress}
                className="flex-1 flex items-center justify-center bg-white/10 active:bg-purple-500/50 rounded-lg py-1.5"
              >
                <ChevronUp size={iconSize} className="text-purple-400" />
              </button>
            </div>
          </div>
          
          {/* 透明度调节 - 简化 */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-white/50 text-[9px]">透明度</span>
              <span className="text-white/70 text-[9px] font-mono">{Math.round(localOpacity)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={localOpacity}
              onChange={(e) => handleOpacityChange(parseInt(e.target.value))}
              className="w-full h-1.5 bg-white/20 rounded-full appearance-none cursor-pointer touch-manipulation"
              style={{ 
                WebkitAppearance: 'none',
                background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${localOpacity}%, rgba(255,255,255,0.2) ${localOpacity}%, rgba(255,255,255,0.2) 100%)`
              }}
            />
          </div>
        </div>
        
        {/* 连接线指示器 - 简化 */}
        <div className="absolute left-1/2 -bottom-3 w-px h-3 bg-white/20" />
        <div className="absolute left-1/2 -bottom-4 w-1.5 h-1.5 rounded-full bg-white/30 -translate-x-1/2" />
      </div>
    </Html>
  );
};

export default ModelControlGizmo;
