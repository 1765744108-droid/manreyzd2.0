import React, { useRef, useState, useEffect, Suspense, useMemo, useCallback } from 'react';
import { useThree, useFrame, ThreeEvent } from '@react-three/fiber';
import { useGLTF, Outlines } from '@react-three/drei';
import * as THREE from 'three';
import { ModelData } from '../types';
import { COLORS, DRAG_CONFIG, ANIMATION_CONFIG, WIREFRAME_CONFIG, MATERIAL_CONFIG, MOBILE_CONFIG } from '../constants';
import { OverlapInfo } from './Scene.tsx';
import { ModelControlGizmo } from './ModelControlGizmo';

// 移动端检测
const isMobileDevice = () => {
  if (typeof window === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
         window.innerWidth < 768 ||
         'ontouchstart' in window;
};

// 预加载模型 - 提升首次加载速度
const MODEL_URLS = [
  '/远征队 完整 现实.glb',
  '/远征队 矩形整体 现实.glb',
  '/远征队 塔仓 现实.glb',
  '/远征队 完整 锚定.glb',
  '/远征队 矩形整体 锚定.glb',
  '/远征队 塔仓 锚定.glb',
];
MODEL_URLS.forEach(url => useGLTF.preload(url));

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
  showGizmo?: boolean;
  onCloseGizmo?: () => void;
}

// 深度比较 partialVisibility 对象
const arePartialVisibilityEqual = (
  prev?: { rectangularParts: boolean; otherParts: boolean },
  next?: { rectangularParts: boolean; otherParts: boolean }
): boolean => {
  if (prev === next) return true;
  if (!prev || !next) return false;
  return prev.rectangularParts === next.rectangularParts && 
         prev.otherParts === next.otherParts;
};

// 比较位置/旋转/缩放数组
const areArraysEqual = (
  prev: [number, number, number],
  next: [number, number, number]
): boolean => {
  return prev[0] === next[0] && prev[1] === next[1] && prev[2] === next[2];
};

const BuildingModelContent: React.FC<BuildingModelProps> = ({ data, onSelect, onUpdate, overlapInfo, onDragStart, onDragEnd, showGizmo, onCloseGizmo }) => {
  // 获取相机用于视角感知拖拽
  const { camera } = useThree();
  
  // 移动端检测
  const isMobile = useMemo(() => isMobileDevice(), []);
  
  // 加载完整模型作为参考（仅用于计算边界框）
  const fullModel = useGLTF(data.url);
  // 加载分离的模型文件
  const rectangularPart = data.rectangularPartUrl ? useGLTF(data.rectangularPartUrl) : null;
  const otherPart = data.otherPartUrl ? useGLTF(data.otherPartUrl) : null;
  
  const groupRef = useRef<THREE.Group>(null);
  // 性能优化：使用 useRef 管理 hover 和拖拽状态，避免重渲染
  const hoveredRef = useRef(false);
  const isDraggingVisualRef = useRef(false);
  
  // 性能优化：使用 useRef 管理旋转状态，避免频繁重渲染
  const currentRotationRef = useRef<[number, number, number]>(data.rotation);
  const targetRotationRef = useRef<[number, number, number]>(data.rotation);
  const isAnimatingRef = useRef(false);  // 动画状态标记，避免空转
  
  // 性能优化：使用 useRef 跟踪实时位置，避免状态更新延迟
  const positionRef = useRef<[number, number, number]>(data.position);
  const lastPointerPosRef = useRef<{ x: number; y: number } | null>(null);
  const isDraggingRef = useRef(false);
  
  // 保存初始位置用于重置
  const initialStateRef = useRef<{ position: [number, number, number]; rotation: [number, number, number] }>({
    position: [...data.position],
    rotation: [...data.rotation],
  });
  
  // 多点触摸检测 - 用于禁止模型拖拽以支持双指缩放
  const touchCountRef = useRef<number>(0);
  
  // RAF 节流相关
  const rafIdRef = useRef<number | null>(null);
  const pendingMoveRef = useRef<{ deltaX: number; deltaY: number } | null>(null);
  
  // 保存全局事件处理器引用，用于清理
  const globalHandlersRef = useRef<{
    move: ((e: PointerEvent) => void) | null;
    up: (() => void) | null;
  }>({ move: null, up: null });
  
  // 拖拽相关的持久化引用（避免闭包重建）
  const dragContextRef = useRef<{
    rightOnPlane: THREE.Vector3;
    upOnPlane: THREE.Vector3;
    moveSpeed: number;
    boundaryMin: number;
    boundaryMax: number;
  } | null>(null);
  
  // 同步 positionRef
  useEffect(() => {
    positionRef.current = data.position;
  }, [data.position]);
  
  // 克隆模型场景 - 只克隆需要渲染的部分
  // 关键：添加 data.id 作为依赖，确保每个模型独立重建
  const rectangularClone = useMemo(() => {
    if (!rectangularPart) return null;
    return rectangularPart.scene.clone();
  }, [rectangularPart, data.rectangularPartUrl, data.id]);
  
  const otherClone = useMemo(() => {
    if (!otherPart) return null;
    return otherPart.scene.clone();
  }, [otherPart, data.otherPartUrl, data.id]);
  
  // 组件卸载时清理全局事件监听器和RAF，防止内存泄漏
  useEffect(() => {
    return () => {
      isDraggingRef.current = false;
      // 取消待处理的 RAF
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      pendingMoveRef.current = null;
      if (globalHandlersRef.current.move) {
        window.removeEventListener('pointermove', globalHandlersRef.current.move);
      }
      if (globalHandlersRef.current.up) {
        window.removeEventListener('pointerup', globalHandlersRef.current.up);
        window.removeEventListener('pointercancel', globalHandlersRef.current.up);
      }
    };
  }, []);
  
  // Update target rotation when data.rotation changes
  useEffect(() => {
    targetRotationRef.current = data.rotation;
    // 检查是否需要动画
    const current = currentRotationRef.current;
    const target = data.rotation;
    if (current[0] !== target[0] || current[1] !== target[1] || current[2] !== target[2]) {
      isAnimatingRef.current = true;
    }
  }, [data.rotation]);
  
  // Smooth rotation animation using useFrame - 极致性能优化版
  useFrame((state, delta) => {
    // 快速跳过检查：如果没有动画在进行，直接返回
    if (!isAnimatingRef.current) return;
    
    const current = currentRotationRef.current;
    const target = targetRotationRef.current;
    
    // 快速检查是否需要更新
    const needsUpdate = current[0] !== target[0] || current[1] !== target[1] || current[2] !== target[2];
    
    if (needsUpdate && groupRef.current) {
      // 动态缓动系数，提升动画速度（更快的缓动）
      const easeFactor = Math.min(12 * delta, 0.35);
      const newX = current[0] + (target[0] - current[0]) * easeFactor;
      const newY = current[1] + (target[1] - current[1]) * easeFactor;
      const newZ = current[2] + (target[2] - current[2]) * easeFactor;
      
      // 直接更新ref，不触发重渲染
      const threshold = ANIMATION_CONFIG.ROTATION_THRESHOLD;
      if (Math.abs(target[0] - newX) > threshold ||
          Math.abs(target[1] - newY) > threshold ||
          Math.abs(target[2] - newZ) > threshold) {
        currentRotationRef.current = [newX, newY, newZ];
      } else {
        currentRotationRef.current = target;
        isAnimatingRef.current = false;  // 动画完成，停止循环
      }
      
      // 直接更新Three.js对象
      // 结构：groupRef > yRotationGroup > positionGroup > xzRotationGroup
      const yRotationGroup = groupRef.current.children[0]; // Y轴旋转组
      if (yRotationGroup) {
        yRotationGroup.rotation.y = currentRotationRef.current[1];
        
        // X轴和Z轴旋转在嵌套的group中
        const positionGroup = yRotationGroup.children[0];
        if (positionGroup) {
          const xzRotationGroup = positionGroup.children[0];
          if (xzRotationGroup) {
            xzRotationGroup.rotation.x = currentRotationRef.current[0];
            xzRotationGroup.rotation.z = currentRotationRef.current[2];
          }
        }
      }
    } else {
      isAnimatingRef.current = false;  // 无需更新，停止动画
    }
  });

  // Calculate vertical center and prepare model for rotation around it
  const [modelOffset, setModelOffset] = useState<THREE.Vector3>(new THREE.Vector3(0, 0, 0));
  const [rectangularPartOffset, setRectangularPartOffset] = useState<THREE.Vector3>(new THREE.Vector3(0, 0, 0));
  const [otherPartOffset, setOtherPartOffset] = useState<THREE.Vector3>(new THREE.Vector3(0, 0, 0));
  const [rotationCenter, setRotationCenter] = useState<THREE.Vector3>(new THREE.Vector3(0, 0, 0));

  // 使用完整模型计算偏移量，并计算各部分的相对位置
  useEffect(() => {
    if (!fullModel.scene || !rectangularClone || !otherClone) return;
    
    // 临时克隆完整模型用于计算边界框（不保存到状态）
    const tempFullClone = fullModel.scene.clone();
    
    // 重置位置以计算准确的边界框
    tempFullClone.position.set(0, 0, 0);
    tempFullClone.updateMatrixWorld(true);
    
    rectangularClone.position.set(0, 0, 0);
    rectangularClone.updateMatrixWorld(true);
    
    otherClone.position.set(0, 0, 0);
    otherClone.updateMatrixWorld(true);
    
    // 计算完整模型的边界框
    const fullBox = new THREE.Box3().setFromObject(tempFullClone);
    const minY = fullBox.min.y;
    
    // 设置模型偏移，使底部贴合地面（Y=0）
    const offsetY = -minY;
    setModelOffset(new THREE.Vector3(0, offsetY, 0));
    
    // 计算各部分的边界框
    const rectBox = new THREE.Box3().setFromObject(rectangularClone);
    const otherBox = new THREE.Box3().setFromObject(otherClone);
    
    // 计算矩形部分的高度
    const rectHeight = rectBox.max.y - rectBox.min.y;
    
    // 塔仓逆时针旋转90度后的边界框计算
    // 旋转后：原X轴 -> 新Z轴（负方向），原Z轴 -> 新X轴
    const otherRotatedWidth = otherBox.max.z - otherBox.min.z;  // 旋转后的宽度（原深度）
    const otherRotatedDepth = otherBox.max.x - otherBox.min.x;  // 旋转后的深度（原宽度）
    
    // 计算塔仓旋转中心（基于原始边界框）
    const otherCenterX = (otherBox.min.x + otherBox.max.x) / 2;
    const otherCenterZ = (otherBox.min.z + otherBox.max.z) / 2;
    
    // 塔仓逆时针旋转90度，并调整位置使其与矩形连接
    // 旋转后塔仓的右侧（+X方向）应与矩形的左侧对齐
    const rectLeftEdge = rectBox.min.x;
    
    // 计算旋转后塔仓的新位置
    // 旋转中心偏移 + 对齐偏移
    const otherOffsetX = rectLeftEdge - otherRotatedWidth / 2;
    const otherOffsetZ = -otherCenterZ; // 保持Z轴居中
    
    // 设置塔仓部分的偏移和旋转
    setOtherPartOffset(new THREE.Vector3(otherOffsetX, 0, otherOffsetZ));
    
    // ===== 关键修正：基于完整模型分析真实连接关系 =====
    // 矩形模型向上提高其自身高度的 0.95/4
    const rectVerticalOffset = rectHeight * (0.95 / 4);
    setRectangularPartOffset(new THREE.Vector3(0, rectVerticalOffset, 0));
    
    // 计算矩形部分的几何中心（应用偏移后的位置）
    const rectCenter = new THREE.Vector3(
      (rectBox.min.x + rectBox.max.x) / 2,
      (rectBox.min.y + rectBox.max.y) / 2 + offsetY,
      (rectBox.min.z + rectBox.max.z) / 2
    );
    setRotationCenter(rectCenter);
    
    // 清理临时克隆
    tempFullClone.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry?.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach(m => m.dispose());
        } else {
          child.material?.dispose();
        }
      }
    });
  }, [fullModel.scene, rectangularClone, otherClone]);

  // 缓存材质设置回调 - 移动端简化配置
  // 使用 useRef 存储线框状态，避免重建
  const wireframesCreatedRef = useRef<Set<string>>(new Set());
    
  const setupMaterials = useCallback((clone: THREE.Group | null, isRectangular: boolean) => {
    if (!clone) return;
      
    const baseOpacity = data.opacity ?? 1.0;
    const isWireframe = data.wireframe ?? false;
    const modelId = data.id;
      
    clone.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        // 移动端禁用阴影提升性能
        child.castShadow = false;
        child.receiveShadow = false;
  
        if (child.material) {
          const materials = Array.isArray(child.material) ? child.material : [child.material];
            
          materials.forEach((mat) => {
            const isTransparent = baseOpacity < 1.0;
            mat.transparent = isTransparent;
            mat.opacity = baseOpacity;
              
            if (isTransparent) {
              mat.depthWrite = false;
              mat.depthTest = true;
              mat.side = THREE.DoubleSide;
              mat.alphaTest = 0;
              child.renderOrder = modelId === 'model-1' ? 100 : 101;
            } else {
              mat.depthWrite = true;
              mat.depthTest = true;
              mat.side = THREE.FrontSide;
              child.renderOrder = modelId === 'model-1' ? 1 : 2;
            }
              
            mat.wireframe = isWireframe;
            mat.blending = THREE.NormalBlending;
              
            if (mat instanceof THREE.MeshStandardMaterial) {
              mat.roughness = MATERIAL_CONFIG.ROUGHNESS;
              mat.metalness = MATERIAL_CONFIG.METALNESS;
              mat.envMapIntensity = 0.5; // 降低环境光强度
              mat.flatShading = false;
            }
              
            if (modelId === 'model-1') {
              if (!mat.map || isWireframe) {
                mat.color.set('#1781b5');
              }
              if (!isTransparent) {
                mat.polygonOffset = true;
                mat.polygonOffsetFactor = 1;
                mat.polygonOffsetUnits = 1;
              }
            } else if (modelId === 'model-2') {
              if (!mat.map || isWireframe) {
                mat.color.set('#ee3f4d');
              }
              if (!isTransparent) {
                mat.polygonOffset = true;
                mat.polygonOffsetFactor = -1;
                mat.polygonOffsetUnits = -1;
              }
            } else {
              if (!mat.map || isWireframe) {
                mat.color.set(0xffffff);
              }
            }
              
            mat.needsUpdate = true;
          });
        }
          
        // 移动端禁用线框轮廓，提升性能
        if (isMobile) return;
        
        // 添加线框轮廓（常规模式下）
        const meshId = `${modelId}-${child.uuid}`;
        const alreadyHas = wireframesCreatedRef.current.has(meshId);
        
        if (!isWireframe && child.geometry && !alreadyHas) {
          try {
            if (!child.geometry.attributes.position || child.geometry.attributes.position.count === 0) {
              return;
            }
            
            const edgeThreshold = WIREFRAME_CONFIG.EDGE_ANGLE_THRESHOLD;
            const edges = new THREE.EdgesGeometry(child.geometry, edgeThreshold);
            const wireframeColor = modelId === 'model-2' ? COLORS.wireframe2 : COLORS.wireframe1;
              
            const lineMaterial = new THREE.LineBasicMaterial({ 
              color: wireframeColor,
              transparent: true,
              opacity: 0.8,
              depthTest: true,
              depthWrite: false,
              linewidth: WIREFRAME_CONFIG.LINE_WIDTH,
              polygonOffset: true,
              polygonOffsetFactor: -2,
              polygonOffsetUnits: -2,
            });
            const wireframe = new THREE.LineSegments(edges, lineMaterial);
            wireframe.userData.isWireframeOverlay = true;
            wireframe.userData.meshId = meshId;
            wireframe.renderOrder = WIREFRAME_CONFIG.RENDER_ORDER_BASE + (modelId === 'model-2' ? 2 : 1);
            child.add(wireframe);
            wireframesCreatedRef.current.add(meshId);
          } catch (e) {
            // 静默失败
          }
        }
      }
    });
  }, [data.id, data.opacity, data.wireframe, isMobile]);

  // 设置材质属性 - 确保每次模型或材质参数变化时都重新应用
  useEffect(() => {
    if (!rectangularClone && !otherClone) return;
    
    // 清理旧的线框轮廓
    const cleanupWireframes = (clone: THREE.Group | null) => {
      if (!clone) return;
      clone.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          const existingWireframes = child.children.filter(c => c.userData.isWireframeOverlay);
          existingWireframes.forEach(wf => {
            child.remove(wf);
            if (wf instanceof THREE.LineSegments) {
              wf.geometry?.dispose();
              if (wf.material instanceof THREE.Material) {
                wf.material.dispose();
              }
            }
            // 从记录中移除
            if (wf.userData.meshId) {
              wireframesCreatedRef.current.delete(wf.userData.meshId);
            }
          });
        }
      });
    };
    
    // 模型变化时清理线框记录
    cleanupWireframes(rectangularClone);
    cleanupWireframes(otherClone);
    
    // 清空线框记录（模型变化时）
    wireframesCreatedRef.current.clear();
    
    // 立即应用材质和线框（移除延迟，提升性能）
    setupMaterials(rectangularClone, true);
    setupMaterials(otherClone, false);
    
    // 强制场景更新
    if (groupRef.current) {
      groupRef.current.updateMatrixWorld(true);
    }
  }, [rectangularClone, otherClone, setupMaterials, data.wireframe, data.id]);

  // 单独处理透明度变化，不重建线框
  useEffect(() => {
    if (!rectangularClone && !otherClone) return;
    
    const updateOpacity = (clone: THREE.Group | null) => {
      if (!clone) return;
      clone.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
          const mat = child.material;
          const isTransparent = data.opacity < 1.0;
          mat.transparent = isTransparent;
          mat.opacity = data.opacity;
          mat.needsUpdate = true;
        }
      });
    };
    
    updateOpacity(rectangularClone);
    updateOpacity(otherClone);
  }, [rectangularClone, otherClone, data.opacity]);

  // 移除 overlapClone 逻辑，避免重复渲染导致闪烁
  // 通过正确的深度设置和渲染顺序已经可以正确显示重叠效果

  // 拖拽处理 - 极致性能优化，完全跳过React状态更新
  // RAF 节流的实际位置更新函数 - 包含边界约束
  const applyPendingMove = useCallback(() => {
    if (!pendingMoveRef.current || !groupRef.current || !dragContextRef.current) {
      rafIdRef.current = null;
      return;
    }
    
    const { deltaX, deltaY } = pendingMoveRef.current;
    const { rightOnPlane, upOnPlane, moveSpeed, boundaryMin, boundaryMax } = dragContextRef.current;
    
    // 计算世界空间移动
    const worldDeltaX = (rightOnPlane.x * deltaX - upOnPlane.x * deltaY) * moveSpeed;
    const worldDeltaZ = (rightOnPlane.z * deltaX - upOnPlane.z * deltaY) * moveSpeed;
    
    // 获取当前位置并计算新位置，应用边界约束
    const currentPos = positionRef.current;
    const targetX = currentPos[0] + worldDeltaX;
    const targetZ = currentPos[2] + worldDeltaZ;
    
    // 应用边界限制 - 确保模型始终在可视范围内
    const newX = Math.max(boundaryMin, Math.min(boundaryMax, targetX));
    const newZ = Math.max(boundaryMin, Math.min(boundaryMax, targetZ));
    
    // 更新ref
    positionRef.current = [newX, currentPos[1], newZ];
    
    // 直接操作Three.js对象位置
    groupRef.current.position.x = newX;
    groupRef.current.position.z = newZ;
    
    // 清除待处理的移动
    pendingMoveRef.current = null;
    rafIdRef.current = null;
  }, []);
  
  // 全局移动处理器（用useCallback缓存，避免重建）- 极致性能优化
  const handleGlobalMove = useCallback((moveEvent: PointerEvent) => {
    // 快速跳过检查
    if (!isDraggingRef.current || !lastPointerPosRef.current || !dragContextRef.current) return;
    
    // 计算屏幕空间移动增量
    const deltaX = moveEvent.clientX - lastPointerPosRef.current.x;
    const deltaY = moveEvent.clientY - lastPointerPosRef.current.y;
    
    // 移动端使用更高阈值减少抖动和计算量
    const minThreshold = isMobile ? DRAG_CONFIG.MOBILE_MIN_THRESHOLD : DRAG_CONFIG.MIN_MOVE_THRESHOLD;
    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);
    
    // 快速跳过微小移动
    if (absDeltaX < minThreshold && absDeltaY < minThreshold) return;
    
    // 立即更新指针位置
    lastPointerPosRef.current = { x: moveEvent.clientX, y: moveEvent.clientY };
    
    // 累加移动增量
    if (pendingMoveRef.current) {
      pendingMoveRef.current.deltaX += deltaX;
      pendingMoveRef.current.deltaY += deltaY;
    } else {
      pendingMoveRef.current = { deltaX, deltaY };
    }
    
    // 使用 RAF 节流，确保每帧最多更新一次
    if (!rafIdRef.current) {
      rafIdRef.current = requestAnimationFrame(applyPendingMove);
    }
  }, [isMobile, applyPendingMove]);
    
  // 全局抬起处理器
  const handleGlobalUp = useCallback(() => {
    if (!isDraggingRef.current) return;
      
    isDraggingRef.current = false;
    lastPointerPosRef.current = null;
    dragContextRef.current = null;
    
    // 取消待处理的 RAF
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    pendingMoveRef.current = null;
    
    // 清除拖拽视觉反馈
    isDraggingVisualRef.current = false;
      
    // 拖拽结束时同步一次状态到React
    if (groupRef.current) {
      const finalPosition: [number, number, number] = [
        groupRef.current.position.x,
        groupRef.current.position.y,
        groupRef.current.position.z
      ];
      positionRef.current = finalPosition;
      onUpdate(data.id, { position: finalPosition });
    }
      
    onDragEnd?.();
      
    // 移除全局事件监听器
    if (globalHandlersRef.current.move) {
      window.removeEventListener('pointermove', globalHandlersRef.current.move);
    }
    window.removeEventListener('pointerup', handleGlobalUp);
    window.removeEventListener('pointercancel', handleGlobalUp);
    globalHandlersRef.current = { move: null, up: null };
  }, [data.id, onUpdate, onDragEnd]);
    
  const handlePointerDown = useCallback((e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    
    // 移动端：如果当前有多个触摸点，不启动拖拽，让 OrbitControls 处理双指手势
    if (isMobile && touchCountRef.current > 1) {
      return;
    }
      
    // 每次点击都调用 onSelect，确保 Gizmo 显示
    onSelect(data.id);
    
    // 如果模型被锁定，不允许拖拽
    if (data.locked) {
      return;
    }
      
    // 开始拖拽
    isDraggingRef.current = true;
    lastPointerPosRef.current = { x: e.clientX, y: e.clientY };
    
    // 设置拖拽视觉反馈
    isDraggingVisualRef.current = true;
    
    onDragStart?.();
      
    // 从相机矩阵直接提取方向向量
    camera.updateMatrixWorld();
    const m = camera.matrixWorld.elements;
      
    const cameraRight = new THREE.Vector3(m[0], m[1], m[2]).normalize();
    const cameraUp = new THREE.Vector3(m[4], m[5], m[6]).normalize();
      
    // 将向量投影到XZ平面
    const rightOnPlane = new THREE.Vector3(cameraRight.x, 0, cameraRight.z);
    const upOnPlane = new THREE.Vector3(cameraUp.x, 0, cameraUp.z);
      
    const rightLen = rightOnPlane.length();
    const upLen = upOnPlane.length();
      
    if (rightLen > 0.01) rightOnPlane.divideScalar(rightLen);
    else rightOnPlane.set(1, 0, 0);
      
    if (upLen > 0.01) upOnPlane.divideScalar(upLen);
    else upOnPlane.set(0, 0, -1);
      
    // 计算移动缩放系数 - 移动端使用更快的速度
    const cameraDistance = camera.position.length();
    const distanceFactor = Math.max(DRAG_CONFIG.MIN_DISTANCE_FACTOR, Math.min(DRAG_CONFIG.MAX_DISTANCE_FACTOR, cameraDistance / DRAG_CONFIG.DISTANCE_REFERENCE));
    const baseMoveSpeed = isMobile ? DRAG_CONFIG.MOBILE_MOVE_SPEED : DRAG_CONFIG.BASE_MOVE_SPEED;
    const moveSpeed = baseMoveSpeed * distanceFactor;
      
    // 保存拖拽上下文到ref
    dragContextRef.current = {
      rightOnPlane,
      upOnPlane,
      moveSpeed,
      boundaryMin: DRAG_CONFIG.BOUNDARY_MIN,
      boundaryMax: DRAG_CONFIG.BOUNDARY_MAX
    };
      
    // 保存事件处理器引用
    globalHandlersRef.current = { move: handleGlobalMove, up: handleGlobalUp };
      
    // 添加全局事件监听器 - 使用 passive 提高性能
    window.addEventListener('pointermove', handleGlobalMove, { passive: true });
    window.addEventListener('pointerup', handleGlobalUp);
    window.addEventListener('pointercancel', handleGlobalUp);
  }, [data.selected, data.id, data.locked, onSelect, onDragStart, camera, handleGlobalMove, handleGlobalUp, isMobile]);
  
  // 全局触摸事件监听 - 检测多点触摸以支持双指缩放
  useEffect(() => {
    if (!isMobile) return;
    
    const handleTouchStart = (e: TouchEvent) => {
      touchCountRef.current = e.touches.length;
      // 如果正在拖拽且检测到多点触摸，立即停止拖拽让 OrbitControls 接管
      if (isDraggingRef.current && e.touches.length > 1) {
        handleGlobalUp();
      }
    };
    
    const handleTouchEnd = (e: TouchEvent) => {
      touchCountRef.current = e.touches.length;
    };
    
    window.addEventListener('touchstart', handleTouchStart, { passive: true, capture: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });
    window.addEventListener('touchcancel', handleTouchEnd, { passive: true });
    
    return () => {
      window.removeEventListener('touchstart', handleTouchStart, { capture: true });
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [isMobile, handleGlobalUp]);

  const handleClick = useCallback((e: ThreeEvent<MouseEvent>) => {
    // 只有在没有拖拽时才触发点击
    if (isDraggingRef.current) return;
    e.stopPropagation();
    onSelect(data.id);
  }, [data.id, onSelect]);

  if (!data.visible) return null;
  
  // 获取分部可见性设置
  const partialVisibility = data.partialVisibility || { rectangularParts: true, otherParts: true };
  
  // 使用ref中的旋转值
  const rotation = currentRotationRef.current;
  
  return (
    <group 
      ref={groupRef}
      position={data.position} 
      scale={data.scale}
      onPointerDown={handlePointerDown}
      onClick={handleClick}
      onPointerOver={() => { hoveredRef.current = true; }}
      onPointerOut={() => { hoveredRef.current = false; }}
    >
      {/* Y轴旋转（顺时针）使用原点为中心 */}
      <group rotation={[0, rotation[1], 0]}>
        {/* X轴和Z轴旋转使用矩形中心为中心 */}
        <group position={[rotationCenter.x, rotationCenter.y, rotationCenter.z]}>
          <group rotation={[rotation[0], 0, rotation[2]]}>
            <group position={[-rotationCenter.x, -rotationCenter.y, -rotationCenter.z]}>
              {/* 使用统一的模型偏移，保持两个部分的相对位置 */}
              <group position={[0, modelOffset.y, 0]}>
                {/* 矩形立体部分 - 应用水平偏移使其与塔仓精确连接 */}
                {rectangularClone && partialVisibility.rectangularParts && (
                  <group position={[rectangularPartOffset.x, rectangularPartOffset.y, rectangularPartOffset.z]}>
                    <primitive object={rectangularClone} />
                  </group>
                )}
                
                {/* 塔仓部分 - 逆时针旋转90度再顺时针旋转180度（总计顺时针 90度）并与矩形连接 */}
                {otherClone && partialVisibility.otherParts && (
                  <group position={[otherPartOffset.x, otherPartOffset.y, otherPartOffset.z]}>
                    <group rotation={[0, Math.PI / 2, 0]}>
                      <primitive object={otherClone} />
                    </group>
                  </group>
                )}
              </group>
            </group>
          </group>
        </group>
      </group>
      
      {/* 扩大点击热区 - 透明的辅助点击区域（移动端更大） */}
      <mesh visible={false}>
        <boxGeometry args={[5, 5, 5]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>
      
      {/* Visual Feedback: Selection Outline */}
      {data.selected && (
        <Outlines 
          thickness={2} 
          color={COLORS.selection} 
          screenspace={true}
          opacity={0.8}
        />
      )}
      
      {/* 坐标控制面板 - 当模型被选中时显示 */}
      {data.selected && showGizmo && (
        <ModelControlGizmo
          model={data}
          onUpdate={onUpdate}
          onClose={onCloseGizmo || (() => {})}
          isMobile={isMobile}
          initialPosition={initialStateRef.current}
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
  // 使用高效的浅比较替代 JSON.stringify
  const pd = prevProps.data;
  const nd = nextProps.data;
  
  const dataEqual = 
    areArraysEqual(pd.position, nd.position) &&
    areArraysEqual(pd.rotation, nd.rotation) &&
    areArraysEqual(pd.scale, nd.scale) &&
    pd.visible === nd.visible &&
    pd.selected === nd.selected &&
    pd.opacity === nd.opacity &&
    pd.wireframe === nd.wireframe &&
    pd.id === nd.id &&
    pd.url === nd.url &&
    arePartialVisibilityEqual(pd.partialVisibility, nd.partialVisibility);
  
  const handlersEqual = 
    prevProps.onSelect === nextProps.onSelect && 
    prevProps.onUpdate === nextProps.onUpdate &&
    prevProps.onDragStart === nextProps.onDragStart &&
    prevProps.onDragEnd === nextProps.onDragEnd &&
    prevProps.showGizmo === nextProps.showGizmo &&
    prevProps.onCloseGizmo === nextProps.onCloseGizmo;
  
  // 重叠信息比较
  const overlapEqual = 
    prevProps.overlapInfo.isOverlapping === nextProps.overlapInfo.isOverlapping &&
    prevProps.overlapInfo.overlappingWith.length === nextProps.overlapInfo.overlappingWith.length;
  
  return dataEqual && handlersEqual && overlapEqual;
});

export default BuildingModel;