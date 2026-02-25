import React, { useRef, useCallback, useMemo, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, useGLTF, Center, Html } from '@react-three/drei';
import { ArrowLeft, RotateCw, Home, Camera } from 'lucide-react';
import { GalleryModel } from '../galleryData';
import { COLORS, MOBILE_CONFIG, DESKTOP_CONFIG, SINGLE_VIEWER_CONFIG } from '../constants';
import type { OrbitControls as OrbitControlsType } from 'three-stdlib';
import * as THREE from 'three';

interface SingleModelViewerProps {
  model: GalleryModel;
  onBack: () => void;
}

// 加载指示器
const LoadingIndicator: React.FC = () => (
  <Html center>
    <div className="flex flex-col items-center gap-3">
      <div className="w-12 h-12 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
      <span className="text-sm text-gray-600 font-medium">模型加载中...</span>
    </div>
  </Html>
);

// 线框轮廓组件
const WireframeOutline: React.FC<{ geometry: THREE.BufferGeometry; color: string; opacity: number }> = ({ 
  geometry, 
  color,
  opacity 
}) => {
  const edgesGeometry = useMemo(() => {
    return new THREE.EdgesGeometry(geometry, 15); // 15度角阈值
  }, [geometry]);

  return (
    <lineSegments geometry={edgesGeometry}>
      <lineBasicMaterial 
        color={color} 
        transparent 
        opacity={opacity}
        linewidth={1}
      />
    </lineSegments>
  );
};

// 单个模型渲染组件 - 轻薄通透材质 + 线框轮廓
const Model: React.FC<{ url: string }> = ({ url }) => {
  const { scene } = useGLTF(url);
  const groupRef = useRef<THREE.Group>(null);
  
  // 克隆场景并收集mesh信息
  const { clonedScene, meshes } = useMemo(() => {
    const cloned = scene.clone();
    const collectedMeshes: { mesh: THREE.Mesh; geometry: THREE.BufferGeometry }[] = [];
    
    cloned.traverse((child) => {
      if (child instanceof THREE.Mesh && child.geometry) {
        // 收集mesh用于线框渲染
        collectedMeshes.push({
          mesh: child,
          geometry: child.geometry,
        });
        
        // 应用轻薄通透材质
        const originalMaterial = child.material as THREE.MeshStandardMaterial;
        const newMaterial = new THREE.MeshStandardMaterial({
          color: originalMaterial.color || new THREE.Color(0x88ccff),
          transparent: true,
          opacity: SINGLE_VIEWER_CONFIG.MATERIAL.OPACITY,
          roughness: SINGLE_VIEWER_CONFIG.MATERIAL.ROUGHNESS,
          metalness: SINGLE_VIEWER_CONFIG.MATERIAL.METALNESS,
          side: THREE.DoubleSide,
          depthWrite: false,
          alphaTest: 0,
          blending: THREE.NormalBlending,
        });
        
        child.material = newMaterial;
        child.renderOrder = 1;
      }
    });
    
    return { clonedScene: cloned, meshes: collectedMeshes };
  }, [scene]);
  
  // 缓慢自动旋转
  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.1;
    }
  });

  return (
    <Center>
      <group ref={groupRef}>
        <primitive 
          object={clonedScene} 
          scale={SINGLE_VIEWER_CONFIG.MODEL_SCALE} 
        />
        {/* 线框轮廓层 */}
        <group scale={SINGLE_VIEWER_CONFIG.MODEL_SCALE}>
          {meshes.map((item, index) => (
            <group 
              key={index}
              position={item.mesh.position}
              rotation={item.mesh.rotation}
              scale={item.mesh.scale}
            >
              <WireframeOutline
                geometry={item.geometry}
                color={SINGLE_VIEWER_CONFIG.WIREFRAME.COLOR}
                opacity={SINGLE_VIEWER_CONFIG.WIREFRAME.OPACITY}
              />
            </group>
          ))}
        </group>
      </group>
    </Center>
  );
};

export const SingleModelViewer: React.FC<SingleModelViewerProps> = ({ model, onBack }) => {
  const cameraControlsRef = useRef<OrbitControlsType | null>(null);
  
  // 移动端检测
  const isMobile = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           window.innerWidth < 768 ||
           'ontouchstart' in window;
  }, []);
  
  // 动态DPR计算
  const dpr = useMemo(() => {
    if (typeof window === 'undefined') return isMobile ? MOBILE_CONFIG.DPR : DESKTOP_CONFIG.DPR;
    const devicePixelRatio = window.devicePixelRatio || 1;
    if (isMobile) {
      const maxDpr = Math.min(devicePixelRatio, MOBILE_CONFIG.MAX_PIXEL_RATIO);
      return [Math.max(1.5, maxDpr * 0.75), maxDpr] as [number, number];
    }
    return DESKTOP_CONFIG.DPR;
  }, [isMobile]);
  
  // 重置视角
  const handleResetView = useCallback(() => {
    if (!cameraControlsRef.current) return;
    const controls = cameraControlsRef.current;
    const pos = SINGLE_VIEWER_CONFIG.CAMERA.INITIAL_POSITION;
    controls.object.position.set(pos[0], pos[1], pos[2]);
    controls.target.set(0, 0, 0);
    controls.update();
  }, []);
  
  // 截图功能
  const handleScreenshot = useCallback(() => {
    const canvas = document.querySelector('canvas');
    if (canvas) {
      const link = document.createElement('a');
      link.download = `${model.name}_截图_${new Date().toISOString().slice(0,10)}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    }
  }, [model.name]);

  return (
    <div 
      className="fixed inset-0 z-50"
      style={{
        background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #f1f5f9 100%)',
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        paddingLeft: 'env(safe-area-inset-left, 0px)',
        paddingRight: 'env(safe-area-inset-right, 0px)',
      }}
    >
      {/* 3D Canvas - 无网格地面 */}
      <div className="absolute inset-0">
        <Canvas
          shadows={false}
          dpr={dpr}
          gl={{
            antialias: !isMobile, // 移动端关闭抗锯齿提升性能
            precision: isMobile ? 'mediump' : 'highp',
            powerPreference: 'high-performance',
            stencil: false,
            alpha: true,
            preserveDrawingBuffer: true, // 截图需要
          }}
          camera={{ 
            position: SINGLE_VIEWER_CONFIG.CAMERA.INITIAL_POSITION, 
            fov: SINGLE_VIEWER_CONFIG.CAMERA.FOV,
            near: SINGLE_VIEWER_CONFIG.CAMERA.NEAR,
            far: SINGLE_VIEWER_CONFIG.CAMERA.FAR,
          }}
        >
          {/* 纯色背景 */}
          <color attach="background" args={['#f5f7fa']} />
          
          {/* 柔和光照 - 减少反射 */}
          <ambientLight intensity={0.8} />
          <directionalLight 
            position={[5, 10, 5]} 
            intensity={0.5} 
            castShadow={false}
          />
          <directionalLight 
            position={[-5, 5, -5]} 
            intensity={0.3}
          />
          
          <Suspense fallback={<LoadingIndicator />}>
            <Model url={model.modelUrl} />
          </Suspense>
          
          {/* 自由缩放的OrbitControls - 无距离限制 */}
          <OrbitControls
            ref={cameraControlsRef}
            enableDamping
            dampingFactor={0.08}
            rotateSpeed={isMobile ? 0.8 : 1.0}
            zoomSpeed={isMobile ? 1.5 : 1.2}
            panSpeed={isMobile ? 0.8 : 1.0}
            enablePan={true}
            // 完全取消缩放限制
            minDistance={0.1}
            maxDistance={Infinity}
            // 触摸手势优化
            touches={{
              ONE: THREE.TOUCH.ROTATE,
              TWO: THREE.TOUCH.DOLLY_PAN,
            }}
          />
        </Canvas>
      </div>
      
      {/* 顶部工具栏 - 移动端优化 */}
      <div 
        className="absolute z-20 flex items-center justify-between w-full px-3"
        style={{
          top: 'max(12px, calc(env(safe-area-inset-top, 0px) + 8px))',
        }}
      >
        {/* 左侧：返回 + 模型名称 */}
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className={`flex items-center gap-2 bg-white/95 hover:bg-white rounded-xl shadow-lg transition-transform touch-manipulation active:scale-95 ${
              isMobile ? 'px-3 py-3' : 'px-4 py-2.5'
            }`}
          >
            <ArrowLeft size={isMobile ? 22 : 20} />
            <span className={`font-medium ${isMobile ? 'text-sm' : 'text-sm'}`}>返回</span>
          </button>
          
          <div className={`bg-white/90 backdrop-blur rounded-xl shadow-lg ${
            isMobile ? 'px-3 py-2.5' : 'px-4 py-2.5'
          }`}>
            <span className={`font-bold text-gray-800 ${isMobile ? 'text-sm' : 'text-base'}`}>
              {model.name}
            </span>
          </div>
        </div>
        
        {/* 右侧：工具按钮 */}
        <div className="flex gap-2">
          <button
            onClick={handleResetView}
            className={`bg-white/95 backdrop-blur hover:bg-white rounded-xl shadow-lg transition-all touch-manipulation active:scale-95 ${
              isMobile ? 'p-3' : 'p-2.5'
            }`}
            title="重置视角"
          >
            <Home size={isMobile ? 22 : 20} />
          </button>
          <button
            onClick={handleScreenshot}
            className={`bg-white/95 backdrop-blur hover:bg-white rounded-xl shadow-lg transition-all touch-manipulation active:scale-95 ${
              isMobile ? 'p-3' : 'p-2.5'
            }`}
            title="截图"
          >
            <Camera size={isMobile ? 22 : 20} />
          </button>
        </div>
      </div>
      
      {/* 底部简化控制面板 - 只保留重置视角 */}
      <div 
        className="absolute left-0 right-0 flex justify-center pointer-events-auto"
        style={{ 
          bottom: isMobile 
            ? 'max(20px, calc(env(safe-area-inset-bottom, 0px) + 12px))'
            : 'max(24px, calc(env(safe-area-inset-bottom, 0px) + 16px))',
        }}
      >
        <button
          onClick={handleResetView}
          className={`flex items-center gap-2 bg-white/95 backdrop-blur-md hover:bg-white rounded-2xl shadow-lg border border-gray-200 transition-all touch-manipulation active:scale-95 ${
            isMobile ? 'px-6 py-4 text-base' : 'px-5 py-3 text-sm'
          }`}
        >
          <RotateCw size={isMobile ? 22 : 18} className="text-blue-600" />
          <span className="font-medium text-gray-700">重置视角</span>
        </button>
      </div>
      
      {/* 操作提示 - 仅移动端显示 */}
      {isMobile && (
        <div 
          className="absolute left-0 right-0 flex justify-center pointer-events-none"
          style={{
            bottom: 'max(80px, calc(env(safe-area-inset-bottom, 0px) + 70px))',
          }}
        >
          <div className="bg-black/40 backdrop-blur-sm text-white text-xs px-4 py-2 rounded-full">
            单指旋转 · 双指缩放/平移
          </div>
        </div>
      )}
    </div>
  );
};
