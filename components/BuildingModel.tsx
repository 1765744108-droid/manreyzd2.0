import React, { useRef, useState, useEffect, Suspense, useMemo } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { useGLTF, Outlines, OrbitControls } from '@react-three/drei';
import { useGesture } from '@use-gesture/react';
import * as THREE from 'three';
import { ModelData } from '../types';
import { COLORS } from '../constants';
import { modelCache } from '../utils/modelCache';
import { OverlapInfo } from './Scene.tsx';

// Error boundary component for handling model loading errors
class ErrorBoundary extends React.Component<{ children: React.ReactNode; fallback: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode; fallback: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_: Error) {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('BuildingModel error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }

    return this.props.children;
  }
};

// Loading placeholder component
const LoadingPlaceholder: React.FC<{ position: [number, number, number] }> = ({ position }) => {
  return (
    <group position={position}>
      <mesh position={[0, 1, 0]}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial color={COLORS.selection} opacity={0.5} transparent />
      </mesh>
    </group>
  );
};

// Error placeholder component
const ErrorPlaceholder: React.FC<{ position: [number, number, number] }> = ({ position }) => {
  return (
    <group position={position}>
      <mesh position={[0, 1, 0]}>
        <boxGeometry args={[2, 2, 2]} />
        <meshBasicMaterial color="#ef4444" opacity={0.5} transparent />
      </mesh>
    </group>
  );
};

interface BuildingModelProps {
  data: ModelData;
  onSelect: (id: string) => void;
  onUpdate: (id: string, updates: Partial<ModelData>) => void;
  overlapInfo: OverlapInfo;
  onDragStart?: () => void;
  onDragEnd?: () => void;
}

// Custom hook for caching GLTF models
const useCachedGLTF = (url: string) => {
  // Try to get the model from cache first
  const cachedModel = useMemo(() => modelCache.get(url), [url]);
  
  // Use useGLTF to load the model if not in cache
  const { scene: loadedScene, ...rest } = useGLTF(url);
  
  // Cache the loaded model
  useEffect(() => {
    if (loadedScene && !cachedModel) {
      modelCache.set(url, { scene: loadedScene, ...rest } as any);
    }
  }, [url, loadedScene, cachedModel]);
  
  // Return the cached model if available, otherwise the loaded model
  return cachedModel ? cachedModel : { scene: loadedScene, ...rest };
};

const BuildingModelContent: React.FC<BuildingModelProps> = ({ data, onSelect, onUpdate, overlapInfo, onDragStart, onDragEnd }) => {
  // 加载完整模型作为参考
  const fullModel = useGLTF(data.url);
  // 加载分离的模型文件
  const rectangularPart = data.rectangularPartUrl ? useGLTF(data.rectangularPartUrl) : null;
  const otherPart = data.otherPartUrl ? useGLTF(data.otherPartUrl) : null;
  
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const [currentRotation, setCurrentRotation] = useState<[number, number, number]>(data.rotation);
  const [targetRotation, setTargetRotation] = useState<[number, number, number]>(data.rotation);
  
  // 克隆模型场景
  const fullClone = React.useMemo(() => fullModel.scene.clone(), [fullModel]);
  const rectangularClone = React.useMemo(() => rectangularPart ? rectangularPart.scene.clone() : null, [rectangularPart]);
  const otherClone = React.useMemo(() => otherPart ? otherPart.scene.clone() : null, [otherPart]);
  
  // Update target rotation when data.rotation changes
  useEffect(() => {
    setTargetRotation(data.rotation);
  }, [data.rotation]);
  
  // Smooth rotation animation using useFrame
  useFrame((state, delta) => {
    if (currentRotation[0] !== targetRotation[0] || 
        currentRotation[1] !== targetRotation[1] || 
        currentRotation[2] !== targetRotation[2]) {
      const easeFactor = 5 * delta;
      const newX = currentRotation[0] + (targetRotation[0] - currentRotation[0]) * easeFactor;
      const newY = currentRotation[1] + (targetRotation[1] - currentRotation[1]) * easeFactor;
      const newZ = currentRotation[2] + (targetRotation[2] - currentRotation[2]) * easeFactor;
      setCurrentRotation([newX, newY, newZ]);
    }
  });

  // Calculate vertical center and prepare model for rotation around it
  const [modelOffset, setModelOffset] = useState<THREE.Vector3>(new THREE.Vector3(0, 0, 0));
  const [rectangularPartOffset, setRectangularPartOffset] = useState<THREE.Vector3>(new THREE.Vector3(0, 0, 0));
  const [otherPartOffset, setOtherPartOffset] = useState<THREE.Vector3>(new THREE.Vector3(0, 0, 0));
  const [rotationCenter, setRotationCenter] = useState<THREE.Vector3>(new THREE.Vector3(0, 0, 0));

  // 使用完整模型计算偏移量，并计算各部分的相对位置
  useEffect(() => {
    if (!fullClone || !rectangularClone || !otherClone) return;
    
    // 重置位置以计算准确的边界框
    fullClone.position.set(0, 0, 0);
    fullClone.updateMatrixWorld(true);
    
    rectangularClone.position.set(0, 0, 0);
    rectangularClone.updateMatrixWorld(true);
    
    otherClone.position.set(0, 0, 0);
    otherClone.updateMatrixWorld(true);
    
    // 计算完整模型的边界框
    const fullBox = new THREE.Box3().setFromObject(fullClone);
    const minY = fullBox.min.y;
    
    // 设置模型偏移，使底部贴合地面（Y=0）
    const offsetY = -minY;
    setModelOffset(new THREE.Vector3(0, offsetY, 0));
    
    // 计算各部分的边界框
    const rectBox = new THREE.Box3().setFromObject(rectangularClone);
    const otherBox = new THREE.Box3().setFromObject(otherClone);
    
    // 计算矩形部分的高度
    const rectHeight = rectBox.max.y - rectBox.min.y;
    
    // 计算矩形部分的水平偏移：将其左侧边缘与塔仓右侧边缘对齐
    const otherRightEdge = otherBox.max.x; // 塔仓的右侧边缘
    const rectLeftEdge = rectBox.min.x;   // 矩形的左侧边缘
    
    // 计算需要的水平偏移量
    const horizontalOffset = otherRightEdge - rectLeftEdge;
    
    // 计算垂直偏移量：将矩形部分向下移动其高度的1/6
    const verticalOffset = -rectHeight / 6;
    
    // 设置矩形部分的偏移（向右移动 + 向下移动）
    setRectangularPartOffset(new THREE.Vector3(horizontalOffset, verticalOffset, 0));
    
    // 塔仓部分保持原位
    setOtherPartOffset(new THREE.Vector3(0, 0, 0));
    
    // 计算矩形部分的几何中心（应用偏移后的位置）
    const rectCenter = new THREE.Vector3(
      (rectBox.min.x + rectBox.max.x) / 2 + horizontalOffset,
      (rectBox.min.y + rectBox.max.y) / 2 + offsetY + verticalOffset,
      (rectBox.min.z + rectBox.max.z) / 2
    );
    setRotationCenter(rectCenter);
    
    fullClone.updateMatrixWorld(true);
  }, [fullClone, rectangularClone, otherClone]);

  // 设置材质属性
  useEffect(() => {
    const setupMaterials = (clone: THREE.Group | null, isRectangular: boolean) => {
      if (!clone) return;
      
      clone.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.castShadow = true;
          child.receiveShadow = true;

          if (child.material) {
            const materials = Array.isArray(child.material) ? child.material : [child.material];
            
            materials.forEach((mat) => {
              if (data.id === 'model-1') {
                // 模型1：半透明（85%不透明度），优先渲染
                mat.transparent = true;
                mat.opacity = 0.85;
                mat.depthWrite = true;
                mat.depthTest = true;
                mat.polygonOffset = true;
                mat.polygonOffsetFactor = 1;
                mat.polygonOffsetUnits = 1;
                child.renderOrder = 1;
                mat.color.set('#1781b5');
              } else if (data.id === 'model-2') {
                // 模型2：半透明，后渲染
                mat.transparent = true;
                mat.opacity = 0.65;
                mat.depthWrite = false;
                mat.depthTest = true;
                mat.polygonOffset = true;
                mat.polygonOffsetFactor = -1;
                mat.polygonOffsetUnits = -1;
                child.renderOrder = 2;
                mat.color.set('#ee3f4d');
              } else {
                mat.transparent = false;
                mat.opacity = 1.0;
                mat.color.set(0xffffff);
              }
              
              mat.side = THREE.FrontSide;
              mat.blending = THREE.NormalBlending;
              mat.needsUpdate = true;
            });
          }
        }
      });
    };

    setupMaterials(rectangularClone, true);
    setupMaterials(otherClone, false);
  }, [rectangularClone, otherClone, data.id]);

  // 移除 overlapClone 逻辑，避免重复渲染导致闪烁
  // 通过正确的深度设置和渲染顺序已经可以正确显示重叠效果

  // Gesture Handling
  const bind = useGesture(
    {
      onDragStart: ({ event, touches }) => {
        // Only handle single finger drags for model movement
        if (touches === 1) {
          // Prevent OrbitControls from interfering with single finger drags
          event.stopPropagation();
          if (!data.selected) {
             onSelect(data.id);
          }
          // 通知父组件开始拖动
          onDragStart?.();
        }
        // Allow multi-finger events to propagate to OrbitControls for zoom/rotate
      },
      onDrag: ({ movement: [x, y], touches, event, memo = { initialPos: data.position, initialRot: data.rotation } }) => {
        // Only handle single finger drags for model movement
        if (touches === 1) {
          event.stopPropagation();
          
          if (!data.selected) return memo;

          // Ground boundaries (6x6 grid = -3 to 3 in X and Z)
          const GRID_SIZE = 6;
          const BOUNDARY_MIN = -GRID_SIZE / 2;
          const BOUNDARY_MAX = GRID_SIZE / 2;
          
          // Mapping: Screen X -> World X, Screen Y -> World Z
          const moveSpeed = 0.05; // Increased sensitivity for better dragging
          
          // Calculate new position with boundary constraints
          const newX = Math.max(BOUNDARY_MIN, Math.min(BOUNDARY_MAX, memo.initialPos[0] + (x * moveSpeed)));
          const newZ = Math.max(BOUNDARY_MIN, Math.min(BOUNDARY_MAX, memo.initialPos[2] + (y * moveSpeed))); // Screen Y maps to World Z (direct mapping for intuitive dragging)

          // Keep Y position fixed to stay on ground
          onUpdate(data.id, { position: [newX, memo.initialPos[1], newZ] });
        }
        // Allow multi-finger events to propagate to OrbitControls for zoom/rotate
        
        return memo;
      },
      onDragEnd: ({ touches }) => {
        // 通知父组件拖动结束
        if (touches === 0) {
          onDragEnd?.();
        }
      },
      onClick: ({ event }) => {
        event.stopPropagation();
        onSelect(data.id);
      }
    },
    {
      drag: { 
        filterTaps: true,
        threshold: 10,
        // We do not need 'from' when using 'movement' as movement is always delta from start
      }
    }
  );

  if (!data.visible) return null;
  
  // 获取分部可见性设置
  const partialVisibility = data.partialVisibility || { rectangularParts: true, otherParts: true };
  
  return (
    <group 
      ref={groupRef}
      position={data.position} 
      scale={data.scale}
      {...(bind() as any)}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      {/* Y轴旋转（顺时针）使用原点为中心 */}
      <group rotation={[0, currentRotation[1], 0]}>
        {/* X轴和Z轴旋转使用矩形中心为中心 */}
        <group position={[rotationCenter.x, rotationCenter.y, rotationCenter.z]}>
          <group rotation={[currentRotation[0], 0, currentRotation[2]]}>
            <group position={[-rotationCenter.x, -rotationCenter.y, -rotationCenter.z]}>
              {/* 使用统一的模型偏移，保持两个部分的相对位置 */}
              <group position={[0, modelOffset.y, 0]}>
                {/* 矩形立体部分 - 应用水平偏移使其与塔仓精确连接 */}
                {rectangularClone && partialVisibility.rectangularParts && (
                  <group position={[rectangularPartOffset.x, rectangularPartOffset.y, rectangularPartOffset.z]}>
                    <primitive object={rectangularClone} />
                  </group>
                )}
                
                {/* 塔仓部分 - 保持原位 */}
                {otherClone && partialVisibility.otherParts && (
                  <group position={[otherPartOffset.x, otherPartOffset.y, otherPartOffset.z]}>
                    <primitive object={otherClone} />
                  </group>
                )}
              </group>
            </group>
          </group>
        </group>
      </group>      
      {/* Visual Feedback: Selection Outline */}
      {(data.selected) && (
        <Outlines 
          thickness={3} 
          color={COLORS.selection} 
          screenspace={true}
          opacity={1}
          transparent={false}
          angle={0}
        />
      )}
      
      {/* Hover Outline (lighter) */}
      {(!data.selected && hovered) && (
        <Outlines 
          thickness={2} 
          color="#9ca3af" 
          screenspace={true} 
          opacity={0.5} 
        />
      )}
    </group>
  );
};

// Main BuildingModel component with error boundary and loading state
const BuildingModel: React.FC<BuildingModelProps> = React.memo((props) => {
  const { data } = props;
  
  return (
    <Suspense fallback={<LoadingPlaceholder position={data.position} />}>
      <ErrorBoundary fallback={<ErrorPlaceholder position={data.position} />}>
        <BuildingModelContent {...props} />
      </ErrorBoundary>
    </Suspense>
  );
}, (prevProps, nextProps) => {
  // Only re-render if data has changed
  // We need to ensure visible property changes trigger re-render
  const dataChanged = JSON.stringify(prevProps.data) === JSON.stringify(nextProps.data);
  const handlersChanged = prevProps.onSelect === nextProps.onSelect && prevProps.onUpdate === nextProps.onUpdate;
  return dataChanged && handlersChanged;
});

export default BuildingModel;