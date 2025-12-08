import React, { useRef, useState, useEffect, Suspense, useMemo } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { useGLTF, Outlines, OrbitControls } from '@react-three/drei';
import { useGesture } from '@use-gesture/react';
import * as THREE from 'three';
import { ModelData } from '../types';
import { COLORS } from '../constants';
import { modelCache } from '../utils/modelCache';
import { OverlapInfo } from './Scene';

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

const BuildingModelContent: React.FC<BuildingModelProps> = ({ data, onSelect, onUpdate, overlapInfo }) => {
  const { scene } = useCachedGLTF(data.url);
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const [currentRotation, setCurrentRotation] = useState<[number, number, number]>(data.rotation);
  const [targetRotation, setTargetRotation] = useState<[number, number, number]>(data.rotation);
  
  // Clone the scene so we can modify materials independently for each instance
  const clone = React.useMemo(() => scene.clone(), [scene]);
  
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

  // Calculate vertical center for proper rotation
  // This effect runs even when the model is hidden to ensure proper positioning when visible
  useEffect(() => {
    // Reset position to calculate accurate bounding box
    clone.position.set(0, 0, 0);
    clone.updateMatrixWorld(true);
    
    // Calculate model bounding box with proper scaling
    const box = new THREE.Box3().setFromObject(clone);
    const minY = box.min.y;
    const maxY = box.max.y;
    
    // Calculate vertical center point for proper rotation
    const verticalCenterY = (minY + maxY) / 2;
    
    // Set model offset to center it vertically at origin
    const offsetY = -verticalCenterY;
    setModelOffset(new THREE.Vector3(0, offsetY, 0));
    
    // Update matrix world after positioning
    clone.updateMatrixWorld(true);
  }, [clone]);

  // Material properties for solid model display with overlap handling
  useEffect(() => {
    clone.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;

        if (child.material) {
          const materials = Array.isArray(child.material) ? child.material : [child.material];
          
          materials.forEach((mat) => {
            // Base material properties for solid display
            mat.transparent = false;
            mat.opacity = 1.0;
            mat.depthWrite = true;
            mat.side = THREE.FrontSide;
            mat.depthTest = true;
            mat.blending = THREE.NormalBlending;
            mat.needsUpdate = true;
          });
        }
      }
    });
  }, [clone]);

  // Create a clone for overlap visualization
  const overlapClone = useMemo(() => {
    if (!overlapInfo.isOverlapping) return null;
    
    const clone = scene.clone();
    clone.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        // Disable shadows for the overlap visualization to avoid artifacts
        child.castShadow = false;
        child.receiveShadow = false;

        if (child.material) {
          // Create a new transparent material for the overlap visualization
          const originalMaterial = Array.isArray(child.material) ? child.material[0] : child.material;
          const transparentMaterial = originalMaterial.clone();
          
          // Set transparent material properties
          transparentMaterial.transparent = true;
          transparentMaterial.opacity = 0.4; // 40% opacity as requested
          transparentMaterial.depthWrite = false; // Disable depth write to avoid occluding the main model
          transparentMaterial.side = THREE.BackSide; // Show only the back side (inside) of the model
          transparentMaterial.blending = THREE.AdditiveBlending; // Additive blending for better visibility
          
          // Apply the new material
          child.material = transparentMaterial;
        }
      }
    });
    
    return clone;
  }, [scene, overlapInfo.isOverlapping]);

  // Gesture Handling
  const bind = useGesture(
    {
      onDragStart: ({ event }) => {
        // Prevent OrbitControls from interfering
        event.stopPropagation();
        if (!data.selected) {
           onSelect(data.id);
        }
      },
      onDrag: ({ movement: [x, y], touches, event, memo = { initialPos: data.position, initialRot: data.rotation } }) => {
        event.stopPropagation();
        
        if (!data.selected) return memo;

        // 1 Finger = Move on ground (X, Z)
        if (touches === 1) {
          // Mapping: Screen X -> World X, Screen Y -> World Z
          const moveSpeed = 0.05; // Increased sensitivity for better dragging
          
          const newX = memo.initialPos[0] + (x * moveSpeed);
          const newZ = memo.initialPos[2] + (y * moveSpeed); // Screen Y maps to World Z

          // Keep Y position fixed to stay on ground
          onUpdate(data.id, { position: [newX, memo.initialPos[1], newZ] });
        }
        
        // 2 Fingers = Move in 3D space (X, Y, Z)
        if (touches === 2) {
          // Mapping: Screen X -> World X, Screen Y -> World Y
          const moveSpeed = 0.05; // Increased sensitivity for better dragging
          
          const newX = memo.initialPos[0] + (x * moveSpeed);
          const newY = memo.initialPos[1] - (y * moveSpeed); // Positive Y for intuitive movement
          const newZ = memo.initialPos[2];

          // Allow free movement in 3D space
          onUpdate(data.id, { position: [newX, newY, newZ] });
        }
        
        return memo;
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
      }, 
    }
  );

  if (!data.visible) return null;
  
  return (
    <group 
      ref={groupRef}
      position={data.position} 
      scale={data.scale}
      {...(bind() as any)}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      {/* Rotation group - rotates around vertical center */}
      <group rotation={currentRotation}>
        {/* Model offset group - centers the model vertically for proper rotation */}
        <group position={[0, modelOffset.y, 0]}>
          <primitive object={clone} />
          {/* Render overlap visualization if overlapping */}
          {overlapClone && <primitive object={overlapClone} />}
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