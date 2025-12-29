import React, { useRef, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGesture } from '@use-gesture/react';
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
  const dragStateRef = useRef({ isDragging: false, lastRotation: new THREE.Euler() });

  // 实时同步主相机的旋转并计算当前激活的面
  useFrame(() => {
    if (cubeRef.current && mainCameraControlsRef.current && !dragStateRef.current.isDragging) {
      const mainCamera = mainCameraControlsRef.current.object;
      
      // 修正：立方体应该与相机方向相同，不需要反向
      // 使用相机的四元数直接设置立方体的旋转
      cubeRef.current.quaternion.copy(mainCamera.quaternion);
      
      // 计算相机朝向，确定激活的面
      const direction = new THREE.Vector3();
      mainCamera.getWorldDirection(direction);
      
      // 根据相机方向判断最接近的面
      const absX = Math.abs(direction.x);
      const absY = Math.abs(direction.y);
      const absZ = Math.abs(direction.z);
      
      let newActiveFace = '前';
      
      if (absY > absX && absY > absZ) {
        // Y轴主导
        newActiveFace = direction.y > 0 ? '底' : '顶';  // 修正：反转顶底
      } else if (absX > absZ) {
        // X轴主导
        newActiveFace = direction.x > 0 ? '左' : '右';  // 修正：反转左右
      } else {
        // Z轴主导
        newActiveFace = direction.z > 0 ? '后' : '前';  // 修正：反转前后
      }
      
      if (newActiveFace !== activeFace) {
        setActiveFace(newActiveFace);
      }
    }
  });

  // 拖拽手势处理
  const bind = useGesture({
    onDragStart: () => {
      setIsDragging(true);
      dragStateRef.current.isDragging = true;
      document.body.style.cursor = 'grabbing';
    },
    onDrag: ({ delta: [dx, dy], event }) => {
      event.stopPropagation();
      
      if (!mainCameraControlsRef.current || !cubeRef.current) return;
      
      const controls = mainCameraControlsRef.current;
      const mainCamera = controls.object;
      
      // 旋转灵敏度
      const rotationSpeed = 0.01;
      
      // 获取当前相机的世界坐标系向量
      const cameraUp = new THREE.Vector3();
      const cameraRight = new THREE.Vector3();
      
      // 计算相机的右侧向量（用于垂直拖拽旋转）
      mainCamera.getWorldDirection(new THREE.Vector3());
      cameraRight.setFromMatrixColumn(mainCamera.matrix, 0); // 相机的X轴（右侧）
      cameraUp.copy(mainCamera.up); // 相机的Y轴（上方）
      
      // 水平拖动：绕世界Y轴旋转
      const yRotation = new THREE.Quaternion().setFromAxisAngle(
        new THREE.Vector3(0, 1, 0),
        -dx * rotationSpeed  // 负号确保拖拽方向与旋转方向一致
      );
      
      // 垂直拖动：绕相机的右侧向量旋转
      const xRotation = new THREE.Quaternion().setFromAxisAngle(
        cameraRight,
        -dy * rotationSpeed  // 负号确保拖拽方向与旋转方向一致
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
      
      // 立方体实时同步相机旋转
      if (cubeRef.current) {
        cubeRef.current.quaternion.copy(mainCamera.quaternion);
      }
    },
    onDragEnd: () => {
      setIsDragging(false);
      dragStateRef.current.isDragging = false;
      document.body.style.cursor = 'grab';
    }
  }, {
    drag: {
      pointer: { capture: true }
    }
  });

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

  // 6个面的配置 - 修正左右和上下方向
  const faces = [
    { text: '前', color: '#e3f2fd', position: [0, 0, 0.51] as [number, number, number], rotation: [0, 0, 0] as [number, number, number] },
    { text: '后', color: '#f3e5f5', position: [0, 0, -0.51] as [number, number, number], rotation: [0, Math.PI, 0] as [number, number, number] },
    { text: '左', color: '#fff3e0', position: [0.51, 0, 0] as [number, number, number], rotation: [0, Math.PI / 2, 0] as [number, number, number] },  // 修正：原来是右
    { text: '右', color: '#e8f5e9', position: [-0.51, 0, 0] as [number, number, number], rotation: [0, -Math.PI / 2, 0] as [number, number, number] },  // 修正：原来是左
    { text: '底', color: '#fce4ec', position: [0, 0.51, 0] as [number, number, number], rotation: [-Math.PI / 2, 0, 0] as [number, number, number] },  // 修正：原来是顶
    { text: '顶', color: '#f1f8e9', position: [0, -0.51, 0] as [number, number, number], rotation: [Math.PI / 2, 0, 0] as [number, number, number] },  // 修正：原来是底
  ];

  // 点击面切换视角
  const handleFaceClick = (faceName: string) => {
    if (!mainCameraControlsRef.current) return;

    const controls = mainCameraControlsRef.current;
    const mainCamera = controls.object;
    const distance = 12;
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
    }

    // 平滑过渡动画
    const startPos = mainCamera.position.clone();
    const startTime = Date.now();
    const duration = 500; // 500ms

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // 使用 easeInOutCubic 缓动函数
      const eased = progress < 0.5
        ? 4 * progress * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;

      mainCamera.position.lerpVectors(startPos, newPosition, eased);
      mainCamera.lookAt(target);
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

      {/* XYZ 坐标轴 - 位于左前下交界处，整体绕Y轴逆时针旋转90度 */}
      <group position={[-0.55, -0.55, 0.55]} rotation={[0, -Math.PI / 2, 0]}>
        {/* X轴 - 红色 */}
        <arrowHelper args={[new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 0), 0.6, 0xff0000, 0.15, 0.1]} />
        <mesh position={[0.7, 0, 0]}>
          <planeGeometry args={[0.2, 0.2]} />
          <meshBasicMaterial>
            <canvasTexture
              attach="map"
              image={(() => {
                const canvas = document.createElement('canvas');
                canvas.width = 64;
                canvas.height = 64;
                const ctx = canvas.getContext('2d')!;
                ctx.fillStyle = '#ff0000';
                ctx.font = 'bold 48px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('X', 32, 32);
                return canvas;
              })()}
            />
          </meshBasicMaterial>
        </mesh>

        {/* Y轴 - 绿色 */}
        <arrowHelper args={[new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 0), 0.6, 0x00ff00, 0.15, 0.1]} />
        <mesh position={[0, 0.7, 0]}>
          <planeGeometry args={[0.2, 0.2]} />
          <meshBasicMaterial>
            <canvasTexture
              attach="map"
              image={(() => {
                const canvas = document.createElement('canvas');
                canvas.width = 64;
                canvas.height = 64;
                const ctx = canvas.getContext('2d')!;
                ctx.fillStyle = '#00ff00';
                ctx.font = 'bold 48px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('Y', 32, 32);
                return canvas;
              })()}
            />
          </meshBasicMaterial>
        </mesh>

        {/* Z轴 - 蓝色 */}
        <arrowHelper args={[new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, 0), 0.6, 0x0000ff, 0.15, 0.1]} />
        <mesh position={[0, 0, 0.7]}>
          <planeGeometry args={[0.2, 0.2]} />
          <meshBasicMaterial>
            <canvasTexture
              attach="map"
              image={(() => {
                const canvas = document.createElement('canvas');
                canvas.width = 64;
                canvas.height = 64;
                const ctx = canvas.getContext('2d')!;
                ctx.fillStyle = '#0000ff';
                ctx.font = 'bold 48px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('Z', 32, 32);
                return canvas;
              })()}
            />
          </meshBasicMaterial>
        </mesh>
      </group>
    </group>
  );
};

// ViewCube 外层容器组件
export const ViewCube: React.FC<ViewCubeProps> = ({ mainCameraControlsRef }) => {
  return (
    <div className="absolute top-20 right-4 w-32 h-32 pointer-events-auto" style={{ cursor: 'grab', userSelect: 'none' }}>
      <Canvas
        camera={{ position: [0, 0, 4], fov: 50 }}
        style={{ background: 'rgba(255, 255, 255, 0.95)', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}
        gl={{ preserveDrawingBuffer: true }}
      >
        <ambientLight intensity={0.8} />
        <directionalLight position={[5, 5, 5]} intensity={0.5} />
        <ViewCubeContent mainCameraControlsRef={mainCameraControlsRef} />
      </Canvas>
    </div>
  );
};
