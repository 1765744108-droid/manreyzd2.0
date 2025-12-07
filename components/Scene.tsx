import React, { useRef, useEffect, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import BuildingModel from './BuildingModel';
import PerformanceMonitor from './PerformanceMonitor';
import { ModelData } from '../types';
import { COLORS, INITIAL_CAMERA_POSITION } from '../constants';

// Interface for overlap information
export interface OverlapInfo {
  isOverlapping: boolean;
  overlappingWith: string[];
}


interface SceneProps {
  models: ModelData[];
  onSelectModel: (id: string | null) => void;
  onUpdateModel: (id: string, updates: Partial<ModelData>) => void;
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
      <planeGeometry args={[100, 100]} />
      <meshStandardMaterial color={COLORS.ground} transparent opacity={0} side={THREE.DoubleSide} />
    </mesh>
  );
};

// Component to auto-center camera on load
const AutoFitCamera = ({ models }: { models: ModelData[] }) => {
    const { camera, controls } = useThree();
    const isFirstRun = useRef(true);

    useEffect(() => {
        if (isFirstRun.current && models.length > 0) {
            // Look at the center of the scene, slightly above ground level for better view
            camera.lookAt(0, 1, 0);
            if (controls) {
                // @ts-ignore
                controls.target.set(0, 1, 0);
            }
            isFirstRun.current = false;
        }
    }, [models, camera, controls]);

    return null;
}

const SceneContent: React.FC<SceneProps> = ({ models, onSelectModel, onUpdateModel }) => {
  const [overlapInfo, setOverlapInfo] = useState<Record<string, OverlapInfo>>({});

  // Detect overlaps between models
  useEffect(() => {
    if (models.length < 2) return;

    const newOverlapInfo: Record<string, OverlapInfo> = {};

    // Initialize overlap info for each model
    models.forEach(model => {
      newOverlapInfo[model.id] = {
        isOverlapping: false,
        overlappingWith: []
      };
    });

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
          newOverlapInfo[model1.id].isOverlapping = true;
          newOverlapInfo[model1.id].overlappingWith.push(model2.id);

          newOverlapInfo[model2.id].isOverlapping = true;
          newOverlapInfo[model2.id].overlappingWith.push(model1.id);
        }
      }
    }

    setOverlapInfo(newOverlapInfo);
  }, [models]);

  return (
    <>
      <ambientLight intensity={0.7} />
      <directionalLight 
        position={[10, 20, 10]} 
        intensity={1.5} 
        castShadow 
        shadow-mapSize={[2048, 2048]}
      />
      
      <Environment preset="city" />

      {/* Enhanced grid with better visibility */}
      <gridHelper 
        args={[100, 100, COLORS.grid, COLORS.grid]} 
        position={[0, 0.01, 0]} 
        scale={1}
      >
        {/* Add material override for better grid visibility */}
        <lineBasicMaterial attach="material" color={COLORS.grid} transparent opacity={0.7} />
      </gridHelper>
      <Ground onDeselect={() => onSelectModel(null)} />
      
      <ContactShadows resolution={1024} scale={50} blur={2} opacity={0.5} far={10} color="#000000" />

      {models.map((model) => (
        <BuildingModel 
          key={model.id} 
          data={model} 
          onSelect={onSelectModel}
          onUpdate={onUpdateModel}
          overlapInfo={overlapInfo[model.id] || { isOverlapping: false, overlappingWith: [] }}
        />
      ))}

      {/* OrbitControls handles Global Pan (2 fingers) and Rotate (1 finger) when not interacting with a model */}
      <OrbitControls 
        makeDefault 
        minPolarAngle={0} 
        maxPolarAngle={Math.PI} 
        enableDamping={true}
        dampingFactor={0.05}
        enablePan={true}
        enableZoom={true}
      />
      
      <AutoFitCamera models={models} />
    </>
  );
};

export const Scene: React.FC<SceneProps> = (props) => {
  return (
    <Canvas
      shadows
      camera={{ position: INITIAL_CAMERA_POSITION, fov: 45 }}
      style={{ background: COLORS.background }}
      dpr={[1, 2]} 
    >
      <SceneContent {...props} />
    </Canvas>
  );
};