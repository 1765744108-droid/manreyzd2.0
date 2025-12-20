import React, { useState, useRef, useCallback, useEffect } from 'react';
import { RotateCw, Box } from 'lucide-react';
import { ModelData } from '../types';

interface ControlsProps {
  models: ModelData[];
  onUpdate: (id: string, updates: Partial<ModelData>) => void;
  selectedId: string | null;
}

const ControlPanel: React.FC<{ 
  model: ModelData; 
  onUpdate: (id: string, updates: Partial<ModelData>) => void;
  isActive: boolean;
}> = ({ model, onUpdate, isActive }) => {
  // 长按相关状态
  const [isLongPressing, setIsLongPressing] = useState(false);
  const [longPressDirection, setLongPressDirection] = useState<'up' | 'down' | null>(null);
  
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
    <div className={`p-2 rounded-lg backdrop-blur-md transition-all duration-300 border ${isActive ? 'bg-white/90 border-blue-400 shadow-lg scale-105' : 'bg-white/70 border-gray-200'}`}>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5">
           <Box size={12} className={isActive ? "text-blue-500" : "text-gray-500"} />
           <span className={`font-semibold text-xs ${isActive ? "text-blue-700" : "text-gray-700"}`}>{model.name}</span>
        </div>
      </div>

      {/* 分部隐藏控制 */}
      <div className="mt-2 pt-2 border-t border-gray-200">
        <div className="text-xs font-medium text-gray-500 mb-1">分部显示</div>
        <div className="grid grid-cols-3 gap-1">
          <button
            onClick={() => togglePartialVisibility('rectangular')}
            className={`flex flex-col items-center justify-center p-1 border rounded-md transition-all text-[9px] ${
              model.partialVisibility?.rectangularParts !== false 
                ? 'bg-green-50 border-green-300 text-green-700' 
                : 'bg-gray-50 border-gray-200 text-gray-400'
            }`}
            title="切换矩形立体部分显示/隐藏"
          >
            <span className="font-medium">■</span>
            <span>矩形部分</span>
          </button>
          <button
            onClick={() => togglePartialVisibility('other')}
            className={`flex flex-col items-center justify-center p-1 border rounded-md transition-all text-[9px] ${
              model.partialVisibility?.otherParts !== false 
                ? 'bg-blue-50 border-blue-300 text-blue-700' 
                : 'bg-gray-50 border-gray-200 text-gray-400'
            }`}
            title="切换其他部分显示/隐藏"
          >
            <span className="font-medium">●</span>
            <span>其他部分</span>
          </button>
          <button
            onClick={() => togglePartialVisibility('all')}
            className={`flex flex-col items-center justify-center p-1 border rounded-md transition-all text-[9px] ${
              (model.partialVisibility?.rectangularParts !== false && model.partialVisibility?.otherParts !== false)
                ? 'bg-purple-50 border-purple-300 text-purple-700' 
                : 'bg-gray-50 border-gray-200 text-gray-400'
            }`}
            title="切换所有部分显示/隐藏"
          >
            <span className="font-medium">■●</span>
            <span>所有部分</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-1 mb-1">
        <button 
          onClick={() => rotateModel('x')}
          className="flex flex-col items-center justify-center p-1 bg-gray-50 hover:bg-blue-50 border border-gray-200 rounded-md active:scale-95 transition-all"
        >
          <RotateCw size={12} className="mb-0.25 text-gray-600" />
          <span className="text-[9px] text-gray-600">X轴</span>
        </button>
        <button 
          onClick={() => rotateModel('z')}
          className="flex flex-col items-center justify-center p-1 bg-gray-50 hover:bg-blue-50 border border-gray-200 rounded-md active:scale-95 transition-all"
        >
          <RotateCw size={12} className="mb-0.25 text-gray-600" />
          <span className="text-[9px] text-gray-600">Z轴</span>
        </button>
        <button 
          onClick={rotateClockwise}
          className="flex flex-col items-center justify-center p-1 bg-gray-50 hover:bg-green-50 border border-gray-200 rounded-md active:scale-95 transition-all"
        >
          <RotateCw size={12} className="mb-0.25 text-green-600" />
          <span className="text-[9px] text-green-600">顺时针</span>
        </button>
      </div>

      <div className="grid grid-cols-2 gap-1">
        <button 
          onClick={() => adjustHeight('up')}
          onMouseDown={startLongPress('up')}
          onMouseUp={stopLongPress}
          onMouseLeave={stopLongPress}
          onTouchStart={startLongPress('up')}
          onTouchEnd={stopLongPress}
          className={`flex flex-col items-center justify-center p-1 bg-gray-50 hover:bg-purple-50 border border-gray-200 rounded-md active:scale-95 transition-all ${isLongPressing && longPressDirection === 'up' ? 'bg-purple-100 border-purple-400' : ''}`}
        >
          <span className="text-sm font-bold text-purple-600">↑</span>
          <span className="text-[9px] text-gray-600">升高</span>
        </button>
        <button 
          onClick={() => adjustHeight('down')}
          onMouseDown={startLongPress('down')}
          onMouseUp={stopLongPress}
          onMouseLeave={stopLongPress}
          onTouchStart={startLongPress('down')}
          onTouchEnd={stopLongPress}
          className={`flex flex-col items-center justify-center p-1 bg-gray-50 hover:bg-purple-50 border border-gray-200 rounded-md active:scale-95 transition-all ${isLongPressing && longPressDirection === 'down' ? 'bg-purple-100 border-purple-400' : ''}`}
        >
          <span className="text-sm font-bold text-purple-600">↓</span>
          <span className="text-[9px] text-gray-600">降低</span>
        </button>
      </div>
    </div>
  );
};

export const Controls: React.FC<ControlsProps> = ({ models, onUpdate, selectedId }) => {
  return (
    <div className="absolute bottom-8 left-4 right-4 flex flex-row gap-3 pointer-events-none">
      {models.map((model) => (
        <div key={model.id} className="flex-1 pointer-events-auto">
          <ControlPanel 
            model={model} 
            onUpdate={onUpdate} 
            isActive={selectedId === model.id}
          />
        </div>
      ))}
    </div>
  );
};