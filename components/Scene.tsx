import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { Canvas, useThree, ThreeEvent } from '@react-three/fiber';
import { OrbitControls, ContactShadows, Html, useProgress } from '@react-three/drei';
import * as THREE from 'three';
import BuildingModel from './BuildingModel.tsx';
import { ModelData } from '../types';
import { COLORS, INITIAL_CAMERA_POSITION, CAMERA_CONFIG, GROUND_CONFIG, MOBILE_CONFIG, DESKTOP_CONFIG } from '../constants';
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

// 移动端检测工具函数
const isMobileDevice = () => {
  if (typeof window === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
         window.innerWidth < 768 ||
         'ontouchstart' in window;
};

// Ground plane that handles deselection when clicked
// 优化点击检测，移动端使用更大容差
const Ground = ({ onDeselect }: { onDeselect: () => void }) => {
  const clickTimeRef = useRef<number>(0);
  const clickPosRef = useRef<{ x: number; y: number } | null>(null);
  const isMobile = useMemo(() => isMobileDevice(), []);
  
  const handlePointerDown = useCallback((e: ThreeEvent<PointerEvent>) => {
    clickTimeRef.current = Date.now();
    // 移动端使用 touch 坐标
    const x = e.nativeEvent.offsetX ?? e.clientX;
    const y = e.nativeEvent.offsetY ?? e.clientY;
    clickPosRef.current = { x, y };
  }, []);
  
  const handleClick = useCallback((e: ThreeEvent<MouseEvent>) => {
    const clickDuration = Date.now() - clickTimeRef.current;
    const clickPos = clickPosRef.current;
    
    // 移动端使用更宽松的阈值
    const durationThreshold = isMobile 
      ? GROUND_CONFIG.MOBILE_CLICK_DURATION 
      : GROUND_CONFIG.CLICK_DURATION_THRESHOLD;
    const moveThreshold = isMobile 
      ? GROUND_CONFIG.MOBILE_CLICK_THRESHOLD 
      : GROUND_CONFIG.CLICK_MOVE_THRESHOLD;
    
    if (clickDuration < durationThreshold && clickPos) {
      const x = e.nativeEvent.offsetX ?? e.clientX;
      const y = e.nativeEvent.offsetY ?? e.clientY;
      const moveDistance = Math.sqrt(
        Math.pow(x - clickPos.x, 2) + 
        Math.pow(y - clickPos.y, 2)
      );
      
      if (moveDistance < moveThreshold) {
        e.stopPropagation();
        onDeselect();
      }
    }
    clickPosRef.current = null;
  }, [onDeselect, isMobile]);
  
  return (
    <mesh 
      rotation={[-Math.PI / 2, 0, 0]} 
      position={[0, -0.01, 0]} 
      receiveShadow
      onPointerDown={handlePointerDown}
      onClick={handleClick}
      visible={false}
    >
      {/* 扩大交互区域 */}
      <planeGeometry args={[GROUND_CONFIG.INTERACTION_SIZE, GROUND_CONFIG.INTERACTION_SIZE]} />
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

const SceneContent: React.FC<SceneProps & { shadowMapSize?: number; isMobile?: boolean }> = ({ models, onSelectModel, onUpdateModel, cameraControlsRef, shadowMapSize = 2048, isMobile = false }) => {
  const [isModelDragging, setIsModelDragging] = useState(false);
  const [activeGizmoId, setActiveGizmoId] = useState<string | null>(null);
  const controlsRef = useRef<OrbitControlsType>(null);
  const { scene, gl } = useThree();
  
  // 设置场景背景色 - Shape3D风格：浅灰白色
  useEffect(() => {
    scene.background = new THREE.Color('#f5f5f5');
    gl.setClearColor('#f5f5f5', 1);
  }, [scene, gl]);
  
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
  
  // 处理模型选择 - 同时显示 Gizmo
  const handleSelectModel = useCallback((id: string | null) => {
    onSelectModel(id);
    setActiveGizmoId(id);
  }, [onSelectModel]);
  
  // 关闭 Gizmo
  const handleCloseGizmo = useCallback(() => {
    setActiveGizmoId(null);
  }, []);
  
  // 处理模型拖动状态变化
  const handleDragStart = useCallback(() => {
    setIsModelDragging(true);
  }, []);
  
  const handleDragEnd = useCallback(() => {
    setIsModelDragging(false);
  }, []);

  return (
    <>
      {/* 简化光照 - 移动端只用环境光 */}
      <ambientLight intensity={isMobile ? 1.2 : 0.8} />
      
      {/* 半球光：模拟天空和地面反射 - 移动端简化 */}
      {!isMobile && (
        <hemisphereLight 
          args={['#ffffff', '#f0f0f0', 1.0]}
          position={[0, 20, 0]}
        />
      )}
      
      {/* 主方向光 - 移动端禁用阴影 */}
      <directionalLight 
        position={[10, 20, 10]} 
        intensity={isMobile ? 1.2 : 1.5}
        castShadow={!isMobile}
        shadow-mapSize={[shadowMapSize, shadowMapSize]}
        shadow-camera-left={-8}
        shadow-camera-right={8}
        shadow-camera-top={8}
        shadow-camera-bottom={-8}
        shadow-camera-near={0.1}
        shadow-camera-far={50}
        shadow-bias={-0.0001}
      />
      
      {/* 辅助方向光 - 移动端禁用 */}
      {!isMobile && (
        <directionalLight 
          position={[-8, 15, -8]} 
          intensity={1.0}
          castShadow={false}
        />
      )}

      {/* 地面网格 - 移动端简化，缩小至40% */}
      {!isMobile && (
        <gridHelper 
          args={[5, 10, '#888888', '#999999']} 
          position={[0, 0, 0]} 
          rotation={[0, Math.PI / 4, 0]}
        >
          <lineBasicMaterial attach="material" color="#888888" transparent opacity={0.8} />
        </gridHelper>
      )}
            
      {/* 底部网格 - 移动端简化网格密度，缩小至40% */}
      <gridHelper 
        args={[5, isMobile ? 3 : 5, '#777777', '#aaaaaa']} 
        position={[0, 0, 0]}
      >
        <lineBasicMaterial attach="material" color="#777777" transparent opacity={isMobile ? 0.5 : 0.7} />
      </gridHelper>
      <Ground onDeselect={() => handleSelectModel(null)} />
      
      {/* 移动端禁用ContactShadows提升性能 */}
      {!isMobile && <ContactShadows resolution={1024} scale={20} blur={2} opacity={0.5} far={10} color="#000000" />}
      
      {/* 加载进度显示 */}
      <Loader />

      {models.map((model) => (
        <BuildingModel 
          key={model.id} 
          data={model} 
          onSelect={handleSelectModel}
          onUpdate={onUpdateModel}
          overlapInfo={overlapInfo[model.id] || { isOverlapping: false, overlappingWith: [] }}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          showGizmo={activeGizmoId === model.id}
          onCloseGizmo={handleCloseGizmo}
        />
      ))}

      {/* OrbitControls - 极致性能优化配置 */}
      <OrbitControls 
        ref={controlsRef}
        makeDefault 
        minPolarAngle={CAMERA_CONFIG.MIN_POLAR_ANGLE} 
        maxPolarAngle={CAMERA_CONFIG.MAX_POLAR_ANGLE} 
        enableDamping={false}  // 关闭阻尼，实现即时响应
        rotateSpeed={CAMERA_CONFIG.ROTATE_SPEED}
        zoomSpeed={CAMERA_CONFIG.ZOOM_SPEED}
        panSpeed={CAMERA_CONFIG.PAN_SPEED}
        enablePan={!isModelDragging}
        enableZoom={!isModelDragging}
        enableRotate={!isModelDragging}
        mouseButtons={{
          LEFT: THREE.MOUSE.ROTATE,
          MIDDLE: THREE.MOUSE.DOLLY,
          RIGHT: THREE.MOUSE.PAN
        }}
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
  const isMobile = useMemo(() => isMobileDevice(), []);
  
  // 动态计算最佳DPR - 移动端画质优化
  const dpr = useMemo(() => {
    if (typeof window === 'undefined') return isMobile ? MOBILE_CONFIG.DPR : DESKTOP_CONFIG.DPR;
    
    const devicePixelRatio = window.devicePixelRatio || 1;
    if (isMobile) {
      // 移动端：使用设备原生DPR消除马赛克
      const maxDpr = Math.min(devicePixelRatio, MOBILE_CONFIG.MAX_PIXEL_RATIO);
      return [Math.max(1.5, maxDpr * 0.8), maxDpr] as [number, number];
    }
    return DESKTOP_CONFIG.DPR;
  }, [isMobile]);
  
  const shadowMapSize = isMobile ? MOBILE_CONFIG.SHADOW_MAP_SIZE : DESKTOP_CONFIG.SHADOW_MAP_SIZE;
  
  return (
    <Canvas
      shadows={isMobile ? false : "soft"} // 移动端禁用阴影换取性能
      camera={{ position: INITIAL_CAMERA_POSITION, fov: 45 }}
      style={{ background: COLORS.background, touchAction: 'none' }}
      dpr={dpr}
      performance={{ min: 0.5 }}
      frameloop="demand" // 按需渲染
      gl={{
        antialias: true, // 移动端也启用抗锯齿消除锯齿边
        alpha: false,
        toneMapping: THREE.ACESFilmicToneMapping, // 移动端也启用色调映射
        toneMappingExposure: 1.0,
        outputColorSpace: THREE.SRGBColorSpace,
        sortObjects: true,
        powerPreference: 'high-performance',
        precision: isMobile ? 'mediump' : 'highp', // 移动端使用中等精度
        stencil: false,
        depth: true,
        logarithmicDepthBuffer: false,
      }}
    >
      <SceneContent {...props} shadowMapSize={shadowMapSize} isMobile={isMobile} />
    </Canvas>
  );
};