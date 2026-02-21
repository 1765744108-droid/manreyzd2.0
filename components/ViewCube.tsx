import React, { useRef, useEffect, useState, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGesture } from '@use-gesture/react';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsType } from 'three-stdlib';

interface ViewCubeProps {
  mainCameraControlsRef: React.MutableRefObject<OrbitControlsType | null>;
}

// ViewCube 3D 内容
const ViewCubeContent: React.FC<ViewCubeProps> = ({ mainCameraControlsRef }) => {
  const cubeRef = useRef<THREE.Group>(null);
  const { camera, gl } = useThree();
  const [activeFace, setActiveFace] = useState<string>('前');
  const [isDragging, setIsDragging] = useState(false);
  const dragStateRef = useRef({ 
    isDragging: false, 
    lastRotation: new THREE.Euler(),
    velocity: new THREE.Vector2(0, 0),
    lastDelta: new THREE.Vector2(0, 0),
    dampingActive: false
  });
  const animationRef = useRef<number | null>(null);

  // 实时同步主相机的旋转并计算当前激活的面
  useFrame(() => {
    if (cubeRef.current && mainCameraControlsRef.current && !dragStateRef.current.isDragging) {
      const mainCamera = mainCameraControlsRef.current.object;
      
      // 关键修正：使用反转的相机四元数
      // 当相机绕模型转动时，ViewCube看起来像是在原地自转展示对应面
      cubeRef.current.quaternion.copy(mainCamera.quaternion).invert();
      
      // 计算从相机位置指向目标点的方向向量（相机看向模型的方向）
      const controls = mainCameraControlsRef.current;
      const cameraToTarget = new THREE.Vector3();
      cameraToTarget.subVectors(controls.target, mainCamera.position).normalize();
      
      // 根据相机到目标的方向判断最接近的面
      const absX = Math.abs(cameraToTarget.x);
      const absY = Math.abs(cameraToTarget.y);
      const absZ = Math.abs(cameraToTarget.z);
      
      let newActiveFace = '前';
      
      if (absY > absX && absY > absZ) {
        // Y轴主导 - 从上方或下方观察
        newActiveFace = cameraToTarget.y > 0 ? '顶' : '底';
      } else if (absX > absZ) {
        // X轴主导 - 从左侧或右侧观察
        newActiveFace = cameraToTarget.x > 0 ? '右' : '左';
      } else {
        // Z轴主导 - 从前方或后方观察
        newActiveFace = cameraToTarget.z > 0 ? '前' : '后';
      }
      
      if (newActiveFace !== activeFace) {
        setActiveFace(newActiveFace);
      }
    }
  });

  // 拖拽手势处理 - 移动端优化
  const bind = useGesture({
    onDragStart: ({ event }) => {
      // 阻止默认行为和事件冒泡
      if (event) {
        event.stopPropagation();
        event.preventDefault();
      }
      
      setIsDragging(true);
      dragStateRef.current.isDragging = true;
      dragStateRef.current.dampingActive = false;
      dragStateRef.current.velocity.set(0, 0);
      // 取消惯性动画
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      document.body.style.cursor = 'grabbing';
    },
    onDrag: ({ delta: [dx, dy], event }) => {
      // 阻止默认行为和事件冒泡
      if (event) {
        event.stopPropagation();
        event.preventDefault();
      }
      
      if (!mainCameraControlsRef.current || !cubeRef.current) return;
      
      const controls = mainCameraControlsRef.current;
      const mainCamera = controls.object;
      
      // 旋转灵敏度
      const rotationSpeed = 0.01;
      
      // 记录速度用于惯性滚动
      dragStateRef.current.lastDelta.set(dx, dy);
      
      // 获取当前相机的世界坐标系向量
      const cameraRight = new THREE.Vector3();
      
      // 计算相机的右侧向量（用于垂直拖拽旋转）
      mainCamera.getWorldDirection(new THREE.Vector3());
      cameraRight.setFromMatrixColumn(mainCamera.matrix, 0); // 相机的X轴（右侧）
      
      // 水平拖动：绕世界Y轴旋转
      // 向右拖动ViewCube(+dx) -> 相机绕Y轴正向旋转 -> 视角向右转
      const yRotation = new THREE.Quaternion().setFromAxisAngle(
        new THREE.Vector3(0, 1, 0),
        dx * rotationSpeed  // 正向：拖动方向与视角旋转方向一致
      );
      
      // 垂直拖动：绕相机的右侧向量旋转
      // 向下拖动ViewCube(+dy) -> 相机仰视 -> 视角向下转
      const xRotation = new THREE.Quaternion().setFromAxisAngle(
        cameraRight,
        dy * rotationSpeed  // 正向：拖动方向与视角旋转方向一致
      );
      
      // 组合旋转：先应用Y轴旋转，再应用X轴旋转
      const combinedRotation = new THREE.Quaternion();
      combinedRotation.multiplyQuaternions(xRotation, yRotation);
      
      // 应用组合旋转到相机四元数
      mainCamera.quaternion.multiplyQuaternions(combinedRotation, mainCamera.quaternion);
      mainCamera.quaternion.normalize();
      
      // 根据新的相机方向更新相机位置（保持与目标点的距离）
      const distance = mainCamera.position.distanceTo(controls.target);
      const newDirection = new THREE.Vector3();
      mainCamera.getWorldDirection(newDirection);
      
      // 计算新的相机位置：目标点 - (方向 * 距离)
      mainCamera.position.copy(controls.target).sub(newDirection.multiplyScalar(distance));
      
      // 更新控制器
      controls.update();
      
      // 立方体实时同步相机旋转（使用反转四元数）
      if (cubeRef.current) {
        cubeRef.current.quaternion.copy(mainCamera.quaternion).invert();
      }
    },
    onDragEnd: ({ event }) => {
      // 阻止默认行为
      if (event) {
        event.stopPropagation();
        event.preventDefault();
      }
      
      setIsDragging(false);
      dragStateRef.current.isDragging = false;
      document.body.style.cursor = 'grab';
      
      // 启动惯性阻尼动画
      const lastDelta = dragStateRef.current.lastDelta;
      if (Math.abs(lastDelta.x) > 0.5 || Math.abs(lastDelta.y) > 0.5) {
        dragStateRef.current.velocity.copy(lastDelta);
        dragStateRef.current.dampingActive = true;
        startInertialDamping();
      }
    }
  }, {
    drag: {
      // 移动端优化配置
      from: () => [0, 0],
      pointer: { 
        touch: true,
        capture: false,  // 不捕获事件，允许事件冒泡
        lock: false      // 不锁定指针
      },
      threshold: 5,      // 适当提高阈值，避免与点击冲突
      filterTaps: true,  // 过滤点击事件
      preventDefault: true,  // 阻止默认行为
      triggerAllEvents: true  // 触发所有事件
    }
  });
  
  // 惯性阻尼系统
  const startInertialDamping = () => {
    if (!mainCameraControlsRef.current || !cubeRef.current) return;
    
    const controls = mainCameraControlsRef.current;
    const mainCamera = controls.object;
    const rotationSpeed = 0.01;
    const dampingFactor = 0.92; // 阻尼系数，越接近1滚动越久
    const minVelocity = 0.05; // 最小速度阈值
    
    const animate = () => {
      if (!dragStateRef.current.dampingActive) return;
      
      const velocity = dragStateRef.current.velocity;
      
      // 速度衰减
      velocity.multiplyScalar(dampingFactor);
      
      // 检查是否停止
      if (Math.abs(velocity.x) < minVelocity && Math.abs(velocity.y) < minVelocity) {
        dragStateRef.current.dampingActive = false;
        dragStateRef.current.velocity.set(0, 0);
        return;
      }
      
      // 应用惯性旋转
      const cameraRight = new THREE.Vector3();
      mainCamera.getWorldDirection(new THREE.Vector3());
      cameraRight.setFromMatrixColumn(mainCamera.matrix, 0);
      
      const yRotation = new THREE.Quaternion().setFromAxisAngle(
        new THREE.Vector3(0, 1, 0),
        velocity.x * rotationSpeed
      );
      
      const xRotation = new THREE.Quaternion().setFromAxisAngle(
        cameraRight,
        velocity.y * rotationSpeed
      );
      
      const combinedRotation = new THREE.Quaternion();
      combinedRotation.multiplyQuaternions(xRotation, yRotation);
      
      mainCamera.quaternion.multiplyQuaternions(combinedRotation, mainCamera.quaternion);
      mainCamera.quaternion.normalize();
      
      const distance = mainCamera.position.distanceTo(controls.target);
      const newDirection = new THREE.Vector3();
      mainCamera.getWorldDirection(newDirection);
      mainCamera.position.copy(controls.target).sub(newDirection.multiplyScalar(distance));
      
      controls.update();
      
      if (cubeRef.current) {
        cubeRef.current.quaternion.copy(mainCamera.quaternion).invert();
      }
      
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animationRef.current = requestAnimationFrame(animate);
  };
  
  // 组件卸载时清理动画
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // 立方体面的文字材质 - Shape3D风格：白色立方体+黑色粗体文字
  const createTextTexture = (text: string, bgColor: string, isActive: boolean) => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    // 背景 - Shape3D风格：纯白色或浅蓝色激活态
    ctx.fillStyle = isActive ? '#e3f2fd' : '#ffffff';
    ctx.fillRect(0, 0, 256, 256);

    // 边框 - Shape3D风格：细线条边框
    ctx.strokeStyle = isActive ? '#1976d2' : '#cccccc';
    ctx.lineWidth = 3;
    ctx.strokeRect(0, 0, 256, 256);

    // 文字 - Shape3D风格：黑色粗体汉字
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 100px "Microsoft YaHei", "PingFang SC", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 128, 128);

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  };

  // 6个面的配置 - Shape3D风格：纯白色底色
  const faces = [
    { text: '前', color: '#ffffff', position: [0, 0, 0.51] as [number, number, number], rotation: [0, 0, 0] as [number, number, number] },
    { text: '后', color: '#ffffff', position: [0, 0, -0.51] as [number, number, number], rotation: [0, Math.PI, 0] as [number, number, number] },
    { text: '右', color: '#ffffff', position: [0.51, 0, 0] as [number, number, number], rotation: [0, Math.PI / 2, 0] as [number, number, number] },
    { text: '左', color: '#ffffff', position: [-0.51, 0, 0] as [number, number, number], rotation: [0, -Math.PI / 2, 0] as [number, number, number] },
    { text: '顶', color: '#ffffff', position: [0, 0.51, 0] as [number, number, number], rotation: [-Math.PI / 2, 0, 0] as [number, number, number] },
    { text: '底', color: '#ffffff', position: [0, -0.51, 0] as [number, number, number], rotation: [Math.PI / 2, 0, 0] as [number, number, number] },
  ];

  // 点击面或边角切换视角 - 使用Slerp球形插值
  const handleFaceClick = (faceName: string, event?: any) => {
    if (!mainCameraControlsRef.current) return;
      
    // 阻止事件冒泡
    if (event) {
      event.stopPropagation();
    }
  
    const controls = mainCameraControlsRef.current;
    const mainCamera = controls.object;
    const currentDistance = mainCamera.position.distanceTo(controls.target);
    const distance = currentDistance > 1 ? currentDistance : 12;
    const target = new THREE.Vector3(0, 0.5, 0);
  
    let newPosition = new THREE.Vector3();
  
    switch (faceName) {
      case '前':
        newPosition.set(0, 5, distance);
        break;
      case '后':
        newPosition.set(0, 5, -distance);
        break;
      case '右':
        newPosition.set(distance, 5, 0);
        break;
      case '左':
        newPosition.set(-distance, 5, 0);
        break;
      case '顶':
        newPosition.set(0, distance, 0);
        break;
      case '底':
        newPosition.set(0, -distance, 0);
        break;
      // 边视角
      case '右前':
        newPosition.set(distance * 0.707, 5, distance * 0.707);
        break;
      case '左前':
        newPosition.set(-distance * 0.707, 5, distance * 0.707);
        break;
      case '右后':
        newPosition.set(distance * 0.707, 5, -distance * 0.707);
        break;
      case '左后':
        newPosition.set(-distance * 0.707, 5, -distance * 0.707);
        break;
      // 角视角
      case '右前顶':
        newPosition.set(distance * 0.577, distance * 0.577, distance * 0.577);
        break;
      case '左前顶':
        newPosition.set(-distance * 0.577, distance * 0.577, distance * 0.577);
        break;
      case '右后顶':
        newPosition.set(distance * 0.577, distance * 0.577, -distance * 0.577);
        break;
      case '左后顶':
        newPosition.set(-distance * 0.577, distance * 0.577, -distance * 0.577);
        break;
    }
  
    // 使用Slerp球形插值进行平滑过渡
    const startPos = mainCamera.position.clone();
    const startQuat = mainCamera.quaternion.clone();
      
    // 计算目标四元数
    const targetQuat = new THREE.Quaternion();
    const tempCamera = mainCamera.clone();
    tempCamera.position.copy(newPosition);
    tempCamera.lookAt(target);
    targetQuat.copy(tempCamera.quaternion);
      
    const startTime = Date.now();
    const duration = 400; // 400ms优化响应速度
  
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
        
      // 使用easeOutCubic缓动函数，更自然的减速效果
      const eased = 1 - Math.pow(1 - progress, 3);
  
      // 位置插值
      mainCamera.position.lerpVectors(startPos, newPosition, eased);
        
      // 四元数球形插值（Slerp）
      mainCamera.quaternion.slerpQuaternions(startQuat, targetQuat, eased);
        
      controls.target.copy(target);
      controls.update();
  
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
  
    animate();
  };

  return (
    <group ref={cubeRef} {...(bind() as any)}>
      {/* 立方体主体 - Shape3D风格：细线框 */}
      <mesh>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0} />
      </mesh>

      {/* Shape3D风格：细黑线边框 */}
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(1, 1, 1)]} />
        <lineBasicMaterial color="#333333" linewidth={1} />
      </lineSegments>

      {/* 6个面 */}
      {faces.map((face, index) => {
        const isActive = face.text === activeFace;
        return (
          <mesh
            key={index}
            position={face.position}
            rotation={face.rotation}
            onClick={() => handleFaceClick(face.text)}
            onPointerOver={(e) => {
              e.stopPropagation();
              document.body.style.cursor = 'pointer';
            }}
            onPointerOut={() => {
              document.body.style.cursor = 'default';
            }}
          >
            <planeGeometry args={[0.95, 0.95]} />
            <meshBasicMaterial
              map={createTextTexture(face.text, face.color, isActive)}
              transparent
              opacity={1.0}
            />
          </mesh>
        );
      })}

      {/* XYZ 坐标轴标签 - 精确放置在立方体边缘 */}
      <AxisLabels />
    </group>
  );
};

// 高对比度坐标轴标签组件 - 白色字母+深色描边
const AxisLabels: React.FC = () => {
  // 创建带描边的文字纹理 - 高清晰度版本
  const createAxisTexture = useMemo(() => {
    return (text: string, color: string) => {
      // 使用更高分辨率的canvas，提升清晰度
      const canvas = document.createElement('canvas');
      canvas.width = 256;  // 提升到256
      canvas.height = 256;
      const ctx = canvas.getContext('2d')!;
      
      // 启用抗锯齿
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      
      // 透明背景
      ctx.clearRect(0, 0, 256, 256);
      
      // 设置字体 - 更粗更大
      ctx.font = 'bold 160px Arial, sans-serif';  // 加大字号
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      // 第一层：最外层深色描边（加强对比度）
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 20;  // 加粗描边
      ctx.strokeText(text, 128, 128);
      
      // 第二层：中间层描边
      ctx.strokeStyle = '#222222';
      ctx.lineWidth = 14;
      ctx.strokeText(text, 128, 128);
      
      // 第三层：内层描边
      ctx.strokeStyle = '#444444';
      ctx.lineWidth = 8;
      ctx.strokeText(text, 128, 128);
      
      // 填充纯白色字母
      ctx.fillStyle = '#ffffff';
      ctx.fillText(text, 128, 128);
      
      // 添加彩色高光层，增强识别度
      ctx.globalAlpha = 0.5;  // 提高不透明度
      ctx.fillStyle = color;
      ctx.fillText(text, 128, 128);
      
      const texture = new THREE.CanvasTexture(canvas);
      texture.minFilter = THREE.LinearFilter;  // 优化缩小时的渲染
      texture.magFilter = THREE.LinearFilter;  // 优化放大时的渲染
      texture.anisotropy = 16;  // 最大各向异性过滤
      
      return texture;
    };
  }, []);

  // X轴纹理 - 鲜红色
  const xTexture = useMemo(() => createAxisTexture('X', '#ff3333'), [createAxisTexture]);
  // Y轴纹理 - 鲜绿色
  const yTexture = useMemo(() => createAxisTexture('Y', '#33ff33'), [createAxisTexture]);
  // Z轴纹理 - 鲜蓝色
  const zTexture = useMemo(() => createAxisTexture('Z', '#3333ff'), [createAxisTexture]);

  return (
    <group>
      {/* X轴标签 - 放置在立方体"前面"底边中心位置，尺寸加大 */}
      <mesh position={[0, -0.72, 0.51]}>
        <planeGeometry args={[0.45, 0.45]} />
        <meshBasicMaterial 
          map={xTexture} 
          transparent 
          opacity={1} 
          depthTest={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Y轴标签 - 放置在立方体顶部中心位置，尺寸加大 */}
      <mesh position={[0, 0.72, 0]}>
        <planeGeometry args={[0.45, 0.45]} />
        <meshBasicMaterial 
          map={yTexture} 
          transparent 
          opacity={1} 
          depthTest={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Z轴标签 - 放置在立方体"左面"底边中心位置，尺寸加大 */}
      <mesh position={[-0.51, -0.72, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[0.45, 0.45]} />
        <meshBasicMaterial 
          map={zTexture} 
          transparent 
          opacity={1} 
          depthTest={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* 坐标轴指示线 - 加粗加亮 */}
      <group position={[-0.5, -0.5, 0.5]}>
        {/* X轴线 - 鲜红色，加粗 */}
        <line>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              array={new Float32Array([0, 0, 0, 0.5, 0, 0])}
              count={2}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial color="#ff3333" linewidth={3} />
        </line>
        
        {/* Y轴线 - 鲜绿色，加粗 */}
        <line>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              array={new Float32Array([0, 0, 0, 0, 1.0, 0])}
              count={2}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial color="#33ff33" linewidth={3} />
        </line>
        
        {/* Z轴线 - 鲜蓝色，加粗 */}
        <line>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              array={new Float32Array([0, 0, 0, 0, 0, -0.5])}
              count={2}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial color="#3333ff" linewidth={3} />
        </line>
      </group>
    </group>
  );
};

// ViewCube 外层容器组件 - 响应式布局优化
export const ViewCube: React.FC<ViewCubeProps> = ({ mainCameraControlsRef }) => {
  // 检测是否为移动设备
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth <= 768 || 'ontouchstart' in window;
      setIsMobile(mobile);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  // 移动端尺寸更大，提高可操作性
  // 容器尺寸缩小，但保持3D立方体视觉大小不变
  const cubeSize = isMobile ? 100 : 90;  // 容器尺寸缩小约30%
  
  return (
    <div 
      className="absolute pointer-events-auto"
      style={{ 
        // 固定在右上角，紧贴顶部和右侧边缘
        top: 'max(8px, env(safe-area-inset-top, 8px))',  // 顶部边距缩小
        right: 'max(8px, env(safe-area-inset-right, 8px))',  // 右侧边距缩小
        // 响应式尺寸：容器缩小但保持立方体视觉比例
        width: `${cubeSize}px`,
        height: `${cubeSize}px`,
        cursor: 'grab', 
        userSelect: 'none',
        WebkitUserSelect: 'none',
        // 确保不被其他元素遮挡
        zIndex: 50,
        // 移动端触摸优化
        touchAction: 'pan-y pan-x',  // 允许滚动但阻止缩放
        WebkitTouchCallout: 'none',
      }}
      onTouchStart={(e) => {
        // 阻止默认触摸行为（如页面滚动）
        e.stopPropagation();
      }}
    >
      <Canvas
        camera={{ 
          position: [0, 0, 3.2],
          fov: 50 
        }}
        style={{ 
          background: 'transparent',
          borderRadius: '0',
          boxShadow: 'none',
          border: 'none',
        }}
        gl={{ 
          preserveDrawingBuffer: true, 
          antialias: true,
          alpha: true,
          // 高质量渲染设置
          powerPreference: 'high-performance'
        }}
        dpr={[1, 2]}  // 设备像素比，支持Retina屏幕
        // 移动端触摸优化
        events={(store) => ({
          ...store,
          enabled: true,
          priority: 1,
          compute: (event, state) => {
            // 阻止默认触摸行为
            if (event.type.startsWith('touch')) {
              event.preventDefault();
            }
            state.pointer.set(
              (event.offsetX / state.size.width) * 2 - 1,
              -(event.offsetY / state.size.height) * 2 + 1
            );
            state.raycaster.setFromCamera(state.pointer, state.camera);
          },
        })}
      >
        <ambientLight intensity={0.9} />
        <directionalLight position={[5, 5, 5]} intensity={0.6} />
        <directionalLight position={[-3, -3, -3]} intensity={0.3} />
        <ViewCubeContent mainCameraControlsRef={mainCameraControlsRef} />
      </Canvas>
    </div>
  );
};
