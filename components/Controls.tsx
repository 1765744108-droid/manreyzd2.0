import React from 'react';
import { Eye, EyeOff, RotateCw, Box } from 'lucide-react';
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

  const toggleVisibility = () => {
    onUpdate(model.id, { visible: !model.visible });
  };

  const adjustHeight = (direction: 'up' | 'down') => {
    const step = 0.025; // Adjust this value to control height change per click (1/2 of current value)
    const currentPos = [...model.position];
    
    if (direction === 'up') {
      currentPos[1] += step;
    } else {
      // Prevent model from going below ground (Y >= 0)
      currentPos[1] = Math.max(0, currentPos[1] - step);
    }
    
    onUpdate(model.id, { position: [currentPos[0], currentPos[1], currentPos[2]] });
  };

  return (
    <div className={`p-2 rounded-lg backdrop-blur-md transition-all duration-300 border ${isActive ? 'bg-white/90 border-blue-400 shadow-lg scale-105' : 'bg-white/70 border-gray-200'}`}>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5">
           <Box size={12} className={isActive ? "text-blue-500" : "text-gray-500"} />
           <span className={`font-semibold text-xs ${isActive ? "text-blue-700" : "text-gray-700"}`}>{model.name}</span>
        </div>
        <button 
          onClick={toggleVisibility}
          className="p-1 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors"
          title={model.visible ? "隐藏" : "显示"}
        >
          {model.visible ? <Eye size={14} className="text-gray-600" /> : <EyeOff size={14} className="text-gray-400" />}
        </button>
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
          className="flex flex-col items-center justify-center p-1 bg-gray-50 hover:bg-purple-50 border border-gray-200 rounded-md active:scale-95 transition-all"
        >
          <span className="text-sm font-bold text-purple-600">↑</span>
          <span className="text-[9px] text-gray-600">升高</span>
        </button>
        <button 
          onClick={() => adjustHeight('down')}
          className="flex flex-col items-center justify-center p-1 bg-gray-50 hover:bg-purple-50 border border-gray-200 rounded-md active:scale-95 transition-all"
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
