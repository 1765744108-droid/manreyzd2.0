import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, ContactShadows, Html, useProgress } from '@react-three/drei';
import * as THREE from 'three';
import BuildingModel from './BuildingModel.tsx';
import { ModelData } from '../types';
import { COLORS, INITIAL_CAMERA_POSITION } from '../constants';
import type { OrbitControls as OrbitControlsType } from 'three-stdlib';

// Interface for overlap information
export interface OverlapInfo {
  isOverlapping: boolean;
  overlappingWith: string[];
}
// 加载进度显示组件
const Loader: React.FC = () => {
  const { progress, active } = useProgress();
  
  if (!active) return null;
  
  return (
    <Html center>
      <div className="flex flex-col items-center justify-center p-4 bg-white/90 backdrop-blur rounded-lg shadow-lg">
        <div className="w-48 h-2 bg-gray-200 rounded-full overflow-hidden mb-2">
          <div 
            className="h-full bg-blue-500 transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-sm text-gray-600 font-medium">
          加载中... {progress.toFixed(0)}%
        </span>
      </div>
    </Html>
  );
};


interface SceneProps {
  models: ModelData[];
  onSelectModel: (id: string | null) => void;
  onUpdateModel: (id: string, updates: Partial<ModelData>) => void;
  onCameraPreset?: (preset: 'top' | 'front' | 'side') => void;
  cameraControlsRef?: React.MutableRefObject<OrbitControlsType | null>;
}

// Ground plane that handles deselection when clicked
const Ground = ({ onDeselect }: { onDeselect: () => void }) => {
  return (
    <mesh 
        rotation={[-Math.PI / 2, 0, 0]} 
        position={[0, -0.01, 0]} 
        receiveShadow
        onPointerMissed={(e) => {
          if (e.type === 'click') onDeselect();
        }}
        onClick={(e) => {
            e.stopPropagation();
            onDeselect();
        }}
        visible={false} // Hide ground completely but keep interaction
      >
        <planeGeometry args={[6, 6]} />
      <meshStandardMaterial color={COLORS.ground} transparent opacity={0} side={THREE.DoubleSide} />
    </mesh>
  );
};

// Component to auto-fit camera to models and 12x12 grid space
const AutoFitCamera = ({ models }: { models: ModelData[] }) => {
    const { camera, controls } = useThree();
    const isFirstRun = useRef(true);

    useEffect(() => {
        if (isFirstRun.current && models.length > 0) {
            // Set camera to front view with increased distance to see both models completely
            camera.position.set(0, 8, 10);
            camera.lookAt(0, 0.5, 0);
            
            if (controls && 'target' in controls) {
                const orbitControls = controls as OrbitControlsType;
                orbitControls.target.set(0, 0.5, 0);
                orbitControls.update();
            }
            
            isFirstRun.current = false;
        }
    }, [models, camera, controls]);

    return null;
}

const SceneContent: React.FC<SceneProps & { shadowMapSize?: number }> = ({ models, onSelectModel, onUpdateModel, cameraControlsRef, shadowMapSize = 2048 }) => {
  const [isModelDragging, setIsModelDragging] = useState(false);
  const controlsRef = useRef<OrbitControlsType>(null);
  
  // 使用 useMemo 缓存重叠检测计算
  const overlapInfo = useMemo(() => {
    const result: Record<string, OverlapInfo> = {};
    
    // Initialize overlap info for each model
    models.forEach(model => {
      result[model.id] = {
        isOverlapping: false,
        overlappingWith: []
      };
    });
    
    if (models.length < 2) return result;

    // Check all pairs of models for overlap
    for (let i = 0; i < models.length; i++) {
      for (let j = i + 1; j < models.length; j++) {
        const model1 = models[i];
        const model2 = models[j];

        // Create bounding boxes for both models
        const box1 = new THREE.Box3();
        const box2 = new THREE.Box3();

        // Calculate bounding box for model1
        const center1 = new THREE.Vector3(...model1.position);
        const scale1 = new THREE.Vector3(...model1.scale);
        const size1 = new THREE.Vector3(1, 1, 1).multiply(scale1);
        box1.setFromCenterAndSize(center1, size1);

        // Calculate bounding box for model2
        const center2 = new THREE.Vector3(...model2.position);
        const scale2 = new THREE.Vector3(...model2.scale);
        const size2 = new THREE.Vector3(1, 1, 1).multiply(scale2);
        box2.setFromCenterAndSize(center2, size2);

        // Check if boxes intersect
        if (box1.intersectsBox(box2)) {
          // Update overlap info for both models
          result[model1.id].isOverlapping = true;
          result[model1.id].overlappingWith.push(model2.id);

          result[model2.id].isOverlapping = true;
          result[model2.id].overlappingWith.push(model1.id);
        }
      }
    }

    return result;
  }, [
    // 只在位置和缩放变化时重新计算
    models.map(m => `${m.id}:${m.position.join(',')}:${m.scale.join(',')}`).join('|')
  ]);
  
  // 将 controls ref 暴露给父组件
  useEffect(() => {
    if (cameraControlsRef && controlsRef.current) {
      cameraControlsRef.current = controlsRef.current;
    }
  }, [cameraControlsRef]);
  
  // 处理模型拖动状态变化
  const handleDragStart = useCallback(() => {
    setIsModelDragging(true);
  }, []);
  
  const handleDragEnd = useCallback(() => {
    setIsModelDragging(false);
  }, []);

  return (
    <>
      <ambientLight intensity={1.0} />
      <directionalLight 
        position={[10, 20, 10]} 
        intensity={1.5} 
        castShadow 
        shadow-mapSize={[shadowMapSize, shadowMapSize]}
      />

      {/* Enhanced grid with better visibility */}
      <gridHelper 
        args={[6, 6, COLORS.grid, COLORS.grid]} 
        position={[0, 0.01, 0]} 
        scale={1}
      >
        {/* Add material override for better grid visibility */}
        <lineBasicMaterial attach="material" color={COLORS.grid} transparent opacity={0.7} />
      </gridHelper>
      <Ground onDeselect={() => onSelectModel(null)} />
      
      <ContactShadows resolution={1024} scale={50} blur={2} opacity={0.5} far={10} color="#000000" />
      
      {/* 加载进度显示 */}
      <Loader />

      {models.map((model) => (
        <BuildingModel 
          key={model.id} 
          data={model} 
          onSelect={onSelectModel}
          onUpdate={onUpdateModel}
          overlapInfo={overlapInfo[model.id] || { isOverlapping: false, overlappingWith: [] }}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        />
      ))}

      {/* OrbitControls handles Global Pan (2 fingers) and Rotate (1 finger) when not interacting with a model */}
      <OrbitControls 
        ref={controlsRef}
        makeDefault 
        minPolarAngle={0} 
        maxPolarAngle={Math.PI} 
        enableDamping={true}
        dampingFactor={0.08}
        rotateSpeed={0.8}
        zoomSpeed={0.8}
        panSpeed={0.8}
        enablePan={!isModelDragging}
        enableZoom={!isModelDragging}
        enableRotate={!isModelDragging}
        touches={{
          ONE: THREE.TOUCH.ROTATE,
          TWO: THREE.TOUCH.DOLLY_PAN
        }}
      />
      
      <AutoFitCamera models={models} />
    </>
  );
};

export const Scene: React.FC<SceneProps> = (props) => {
  // 移动端性能优化：检测设备类型
  const isMobile = typeof window !== 'undefined' && (
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
    window.innerWidth < 768
  );
  
  // 移动端降低 dpr 和阴影质量
  const dpr: [number, number] = isMobile ? [1, 1.5] : [1, 2];
  const shadowMapSize = isMobile ? 1024 : 2048;
  
  return (
    <Canvas
      shadows
      camera={{ position: INITIAL_CAMERA_POSITION, fov: 45 }}
      style={{ background: COLORS.background, touchAction: 'none' }}
      dpr={dpr}
      performance={{ min: 0.5 }} // 自动降级性能
      frameloop="demand" // 仅在需要时重渲染
    >
      <SceneContent {...props} shadowMapSize={shadowMapSize} />
    </Canvas>
  );
};