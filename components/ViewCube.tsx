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

  // 立方体面的文字材质
  const createTextTexture = (text: string, bgColor: string, isActive: boolean) => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    // 背景 - 激活时使用高亮色
    ctx.fillStyle = isActive ? '#4f46e5' : bgColor;
    ctx.fillRect(0, 0, 256, 256);

    // 边框 - 激活时加粗
    ctx.strokeStyle = isActive ? '#fff' : '#333';
    ctx.lineWidth = isActive ? 8 : 4;
    ctx.strokeRect(2, 2, 252, 252);

    // 文字 - 激活时使用白色
    ctx.fillStyle = isActive ? '#fff' : '#333';
    ctx.font = 'bold 80px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 128, 128);

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  };

  // 6个面的配置 - 正确的空间位置映射
  // 注意：由于使用了 .invert()，面的位置需要对应模型的实际方向
  const faces = [
    { text: '前', color: '#e3f2fd', position: [0, 0, 0.51] as [number, number, number], rotation: [0, 0, 0] as [number, number, number] },
    { text: '后', color: '#f3e5f5', position: [0, 0, -0.51] as [number, number, number], rotation: [0, Math.PI, 0] as [number, number, number] },
    { text: '右', color: '#e8f5e9', position: [0.51, 0, 0] as [number, number, number], rotation: [0, Math.PI / 2, 0] as [number, number, number] },
    { text: '左', color: '#fff3e0', position: [-0.51, 0, 0] as [number, number, number], rotation: [0, -Math.PI / 2, 0] as [number, number, number] },
    { text: '顶', color: '#f1f8e9', position: [0, 0.51, 0] as [number, number, number], rotation: [-Math.PI / 2, 0, 0] as [number, number, number] },
    { text: '底', color: '#fce4ec', position: [0, -0.51, 0] as [number, number, number], rotation: [Math.PI / 2, 0, 0] as [number, number, number] },
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
      {/* 立方体主体 */}
      <mesh>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.1} />
      </mesh>

      {/* 取消立方体外圈边框显示 */}
      {/* <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(1, 1, 1)]} />
        <lineBasicMaterial color="#666666" linewidth={2} />
      </lineSegments> */}

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
              opacity={isActive ? 1.0 : 0.9}
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
  // 创建带描边的文字纹理
  const createAxisTexture = useMemo(() => {
    return (text: string, color: string) => {
      const canvas = document.createElement('canvas');
      canvas.width = 128;
      canvas.height = 128;
      const ctx = canvas.getContext('2d')!;
      
      // 透明背景
      ctx.clearRect(0, 0, 128, 128);
      
      // 设置字体
      ctx.font = 'bold 72px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      // 深色描边 - 多层描边确保清晰
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 8;
      ctx.strokeText(text, 64, 64);
      
      // 中间层描边
      ctx.strokeStyle = '#333333';
      ctx.lineWidth = 4;
      ctx.strokeText(text, 64, 64);
      
      // 填充白色字母
      ctx.fillStyle = '#ffffff';
      ctx.fillText(text, 64, 64);
      
      // 添加轻微高光
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.3;
      ctx.fillText(text, 64, 64);
      
      return new THREE.CanvasTexture(canvas);
    };
  }, []);

  // X轴纹理 - 红色调
  const xTexture = useMemo(() => createAxisTexture('X', '#ff4444'), [createAxisTexture]);
  // Y轴纹理 - 绿色调
  const yTexture = useMemo(() => createAxisTexture('Y', '#44ff44'), [createAxisTexture]);
  // Z轴纹理 - 蓝色调
  const zTexture = useMemo(() => createAxisTexture('Z', '#4444ff'), [createAxisTexture]);

  return (
    <group>
      {/* X轴标签 - 放置在立方体"前面"底边中心位置 */}
      <mesh position={[0, -0.72, 0.51]}>
        <planeGeometry args={[0.35, 0.35]} />
        <meshBasicMaterial 
          map={xTexture} 
          transparent 
          opacity={1} 
          depthTest={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Y轴标签 - 放置在立方体顶部中心位置 */}
      <mesh position={[0, 0.72, 0]}>
        <planeGeometry args={[0.35, 0.35]} />
        <meshBasicMaterial 
          map={yTexture} 
          transparent 
          opacity={1} 
          depthTest={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Z轴标签 - 放置在立方体"左面"底边中心位置 */}
      <mesh position={[-0.51, -0.72, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[0.35, 0.35]} />
        <meshBasicMaterial 
          map={zTexture} 
          transparent 
          opacity={1} 
          depthTest={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* 坐标轴指示线 - 从立方体角落延伸 */}
      <group position={[-0.5, -0.5, 0.5]}>
        {/* X轴线 - 红色，指向前面底边 */}
        <line>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              array={new Float32Array([0, 0, 0, 0.5, 0, 0])}
              count={2}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial color="#ff4444" linewidth={2} />
        </line>
        
        {/* Y轴线 - 绿色，指向顶部 */}
        <line>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              array={new Float32Array([0, 0, 0, 0, 1.0, 0])}
              count={2}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial color="#44ff44" linewidth={2} />
        </line>
        
        {/* Z轴线 - 蓝色，指向左面 */}
        <line>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              array={new Float32Array([0, 0, 0, 0, 0, -0.5])}
              count={2}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial color="#4444ff" linewidth={2} />
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
  const cubeSize = isMobile ? 140 : 120;
  
  return (
    <div 
      className="absolute pointer-events-auto"
      style={{ 
        // 固定在右上角，紧贴顶部和右侧边缘
        top: 'max(12px, env(safe-area-inset-top, 12px))',
        right: 'max(12px, env(safe-area-inset-right, 12px))',
        // 响应式尺寸：移动端更大，提高清晰度和可操作性
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
        camera={{ position: [0, 0, 4], fov: 50 }}
        style={{ 
          // 不透明背景确保可视对比度
          background: 'rgba(255, 255, 255, 1)', 
          borderRadius: '10px', 
          boxShadow: '0 4px 12px rgba(0,0,0,0.2), 0 2px 4px rgba(0,0,0,0.1)',
          border: '1px solid rgba(0,0,0,0.08)',
        }}
        gl={{ 
          preserveDrawingBuffer: true, 
          antialias: true
        }}
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
