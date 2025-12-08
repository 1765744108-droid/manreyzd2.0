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

  return (
    <div className={`p-4 rounded-xl backdrop-blur-md transition-all duration-300 border ${isActive ? 'bg-white/90 border-blue-400 shadow-lg scale-105' : 'bg-white/60 border-gray-200'}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
           <Box size={16} className={isActive ? "text-blue-500" : "text-gray-500"} />
           <span className={`font-bold ${isActive ? "text-blue-700" : "text-gray-700"}`}>{model.name}</span>
        </div>
        <button 
          onClick={toggleVisibility}
          className="p-2 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors"
          title={model.visible ? "隐藏" : "显示"}
        >
          {model.visible ? <Eye size={18} className="text-gray-600" /> : <EyeOff size={18} className="text-gray-400" />}
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <button 
          onClick={() => rotateModel('x')}
          className="flex flex-col items-center justify-center p-2 bg-gray-50 hover:bg-blue-50 border border-gray-200 rounded-lg active:scale-95 transition-all"
        >
          <RotateCw size={16} className="mb-1 text-gray-600" />
          <span className="text-xs text-gray-600">X轴旋转90°</span>
        </button>
        <button 
          onClick={() => rotateModel('z')}
          className="flex flex-col items-center justify-center p-2 bg-gray-50 hover:bg-blue-50 border border-gray-200 rounded-lg active:scale-95 transition-all"
        >
          <RotateCw size={16} className="mb-1 text-gray-600" />
          <span className="text-xs text-gray-600">Z轴旋转90°</span>
        </button>
        <button 
          onClick={rotateClockwise}
          className="flex flex-col items-center justify-center p-2 bg-gray-50 hover:bg-green-50 border border-gray-200 rounded-lg active:scale-95 transition-all"
        >
          <RotateCw size={16} className="mb-1 text-green-600" />
          <span className="text-xs text-green-600">顺时针旋转</span>
        </button>
      </div>
    </div>
  );
};

export const Controls: React.FC<ControlsProps> = ({ models, onUpdate, selectedId }) => {
  return (
    <div className="absolute top-4 left-4 right-4 flex flex-col sm:flex-row gap-4 pointer-events-none">
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
