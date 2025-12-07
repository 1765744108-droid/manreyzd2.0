export interface ModelData {
  id: string;
  name: string;
  url: string;
  position: [number, number, number];
  rotation: [number, number, number]; // Euler angles in radians
  scale: [number, number, number];
  visible: boolean;
  selected: boolean;
  opacity: number;
}

export interface DragState {
  isDragging: boolean;
  mode: 'rotate' | 'move' | null;
}
