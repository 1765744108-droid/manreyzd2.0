export interface ModelData {
  id: string;
  name: string;
  url: string;
  // 分离的模型文件路径
  rectangularPartUrl?: string;  // 矩形立体部分的模型文件
  otherPartUrl?: string;        // 其他部分的模型文件
  position: [number, number, number];
  rotation: [number, number, number]; // Euler angles in radians
  scale: [number, number, number];
  visible: boolean;
  selected: boolean;
  opacity: number;
  // 分部隐藏控制
  partialVisibility?: {
    rectangularParts: boolean;  // 矩形立体部分的可见性
    otherParts: boolean;        // 其他部分的可见性
  };
  // 显示模式
  wireframe?: boolean;  // 线框模式
}

export interface DragState {
  isDragging: boolean;
  mode: 'rotate' | 'move' | null;
}
