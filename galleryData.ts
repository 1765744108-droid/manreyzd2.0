// 16组模型数据配置

// 标注点类型
export interface ModelMarker {
  id: string;
  type: 'floor' | 'door' | 'room';  // 楼层 | 大门 | 房间
  label: string;                     // 显示文字
  position: [number, number, number]; // 3D位置 [x, y, z]
  color?: string;                    // 标注颜色
}

export interface GalleryModel {
  id: string;
  name: string;
  modelUrl: string;
  thumbnailUrl: string;
  description?: string;
  markers?: ModelMarker[];           // 标注点配置
}

// 默认楼层配置（基于模型高度比例）
const createDefaultMarkers = (groupNum: number): ModelMarker[] => {
  // 每组模型的基础配置，可以根据实际情况调整
  const baseY = 0;      // 基础高度
  const floorHeight = 0.35; // 每层高度
  
  return [
    { id: `${groupNum}-floor1`, type: 'floor', label: '1楼', position: [-0.8, baseY + floorHeight * 0.5, 0], color: '#4CAF50' },
    { id: `${groupNum}-floor2`, type: 'floor', label: '2楼', position: [-0.8, baseY + floorHeight * 1.5, 0], color: '#2196F3' },
    { id: `${groupNum}-floor3`, type: 'floor', label: '3楼', position: [-0.8, baseY + floorHeight * 2.5, 0], color: '#9C27B0' },
    { id: `${groupNum}-door`, type: 'door', label: '大门', position: [0, baseY + 0.1, 0.6], color: '#FF5722' },
  ];
};

export const GALLERY_MODELS: GalleryModel[] = [
  { id: 'group-1', name: '第一组', modelUrl: '/gallery/第一组.glb', thumbnailUrl: '/thumbnails/第一组.jpeg', markers: createDefaultMarkers(1) },
  { id: 'group-2', name: '第二组', modelUrl: '/gallery/第二组.glb', thumbnailUrl: '/thumbnails/第二组.jpeg', markers: createDefaultMarkers(2) },
  { id: 'group-3', name: '第三组', modelUrl: '/gallery/第三组.glb', thumbnailUrl: '/thumbnails/第三组.jpeg', markers: createDefaultMarkers(3) },
  { id: 'group-4', name: '第四组', modelUrl: '/gallery/第四组.glb', thumbnailUrl: '/thumbnails/第四组.jpeg', markers: createDefaultMarkers(4) },
  { id: 'group-5', name: '第五组', modelUrl: '/gallery/第五组.glb', thumbnailUrl: '/thumbnails/第五组.jpeg', markers: createDefaultMarkers(5) },
  { id: 'group-6', name: '第六组', modelUrl: '/gallery/第六组.glb', thumbnailUrl: '/thumbnails/第六组.jpeg', markers: createDefaultMarkers(6) },
  { id: 'group-7', name: '第七组', modelUrl: '/gallery/第七组.glb', thumbnailUrl: '/thumbnails/第七组.jpeg', markers: createDefaultMarkers(7) },
  { id: 'group-8', name: '第八组', modelUrl: '/gallery/第八组.glb', thumbnailUrl: '/thumbnails/第八组.jpeg', markers: createDefaultMarkers(8) },
  { id: 'group-9', name: '第九组', modelUrl: '/gallery/第九组.glb', thumbnailUrl: '/thumbnails/第九组.jpeg', markers: createDefaultMarkers(9) },
  { id: 'group-10', name: '第十组', modelUrl: '/gallery/第十组.glb', thumbnailUrl: '/thumbnails/第十组.jpeg', markers: createDefaultMarkers(10) },
  { id: 'group-11', name: '第十一组', modelUrl: '/gallery/第十一组.glb', thumbnailUrl: '/thumbnails/第十一组.jpeg', markers: createDefaultMarkers(11) },
  { id: 'group-12', name: '第十二组', modelUrl: '/gallery/第十二组.glb', thumbnailUrl: '/thumbnails/第十二组.jpeg', markers: createDefaultMarkers(12) },
  { id: 'group-13', name: '第十三组', modelUrl: '/gallery/第十三组.glb', thumbnailUrl: '/thumbnails/第十三组.jpeg', markers: createDefaultMarkers(13) },
  { id: 'group-14', name: '第十四组', modelUrl: '/gallery/第十四组.glb', thumbnailUrl: '/thumbnails/第十四组.jpeg', markers: createDefaultMarkers(14) },
  { id: 'group-15', name: '第十五组', modelUrl: '/gallery/第十五组.glb', thumbnailUrl: '/thumbnails/第十五组.jpeg', markers: createDefaultMarkers(15) },
  { id: 'group-16', name: '第十六组', modelUrl: '/gallery/第十六组.glb', thumbnailUrl: '/thumbnails/第十六组.jpeg', markers: createDefaultMarkers(16) },
];
