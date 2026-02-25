import React, { useState, useEffect, useRef } from 'react';

interface PerformanceMonitorProps {
  show: boolean;
}

// This component should be rendered outside the Canvas as it's a 2D UI element
const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({ show }) => {
  const [fps, setFps] = useState<number>(60);
  const [frameTime, setFrameTime] = useState<number>(0);
  const [memory, setMemory] = useState<{ used: number; total: number }>({ used: 0, total: 0 });
  
  const fpsHistory = useRef<number[]>([]);
  const lastTime = useRef<number>(0);
  const frameCount = useRef<number>(0);
  const clockRef = useRef<{ getElapsedTime: () => number }>({ getElapsedTime: () => Date.now() / 1000 });
  
  // Calculate FPS using browser's performance API
  useEffect(() => {
    const updateFPS = () => {
      const currentTime = clockRef.current.getElapsedTime();
      const delta = currentTime - lastTime.current;
      frameCount.current++;
      
      if (delta >= 1) {
        const currentFps = frameCount.current / delta;
        setFps(Math.round(currentFps));
        
        // Update frame time
        const currentFrameTime = (delta / frameCount.current) * 1000;
        setFrameTime(currentFrameTime);
        
        // Update history
        fpsHistory.current.push(currentFps);
        if (fpsHistory.current.length > 100) {
          fpsHistory.current.shift();
        }
        
        frameCount.current = 0;
        lastTime.current = currentTime;
      }
      
      requestAnimationFrame(updateFPS);
    };
    
    const animationId = requestAnimationFrame(updateFPS);
    return () => cancelAnimationFrame(animationId);
  }, []);
  
  // Monitor memory usage (works in some browsers)
  useEffect(() => {
    const checkMemory = () => {
      if (performance && 'memory' in performance) {
        const memoryInfo = (performance as any).memory;
        setMemory({
          used: memoryInfo.usedJSHeapSize,
          total: memoryInfo.totalJSHeapSize
        });
      }
    };
    
    const interval = setInterval(checkMemory, 1000);
    return () => clearInterval(interval);
  }, []);
  
  if (!show) return null;
  
  // Format bytes to human-readable
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  
  return (
    <div className="fixed top-4 right-4 bg-black/80 text-white p-3 rounded-lg text-xs font-mono z-50 backdrop-blur-sm pointer-events-auto">
      <div className="flex flex-col gap-1">
        <div className="flex justify-between">
          <span>FPS:</span>
          <span className={`${fps > 50 ? 'text-green-400' : fps > 30 ? 'text-yellow-400' : 'text-red-400'}`}>
            {fps}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Frame Time:</span>
          <span className={`${frameTime < 17 ? 'text-green-400' : frameTime < 33 ? 'text-yellow-400' : 'text-red-400'}`}>
            {frameTime.toFixed(2)}ms
          </span>
        </div>
        <div className="flex justify-between">
          <span>Memory Used:</span>
          <span>{formatBytes(memory.used)}</span>
        </div>
        <div className="flex justify-between">
          <span>Memory Total:</span>
          <span>{formatBytes(memory.total)}</span>
        </div>
        <div className="flex justify-between">
          <span>Memory Usage:</span>
          <span>{Math.round((memory.used / memory.total) * 100)}%</span>
        </div>
      </div>
      
      {/* Simple FPS graph */}
      <div className="mt-2 h-12 w-full relative">
        {fpsHistory.current.map((value, index) => {
          const height = (value / 60) * 100;
          const left = (index / (fpsHistory.current.length - 1)) * 100;
          return (
            <div
              key={index}
              className="absolute bottom-0 w-[1px] bg-green-400 opacity-70"
              style={{ height: `${height}%`, left: `${left}%` }}
            />
          );
        })}
      </div>
    </div>
  );
};

export default PerformanceMonitor;