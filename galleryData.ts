// 16组模型数据配置
export interface GalleryModel {
  id: string;
  name: string;
  modelUrl: string;
  thumbnailUrl: string;
  description?: string;
}

export const GALLERY_MODELS: GalleryModel[] = [
  { id: 'group-1', name: '第一组', modelUrl: '/gallery/第一组.glb', thumbnailUrl: '/thumbnails/第一组.jpeg' },
  { id: 'group-2', name: '第二组', modelUrl: '/gallery/第二组.glb', thumbnailUrl: '/thumbnails/第二组.jpeg' },
  { id: 'group-3', name: '第三组', modelUrl: '/gallery/第三组.glb', thumbnailUrl: '/thumbnails/第三组.jpeg' },
  { id: 'group-4', name: '第四组', modelUrl: '/gallery/第四组.glb', thumbnailUrl: '/thumbnails/第四组.jpeg' },
  { id: 'group-5', name: '第五组', modelUrl: '/gallery/第五组.glb', thumbnailUrl: '/thumbnails/第五组.jpeg' },
  { id: 'group-6', name: '第六组', modelUrl: '/gallery/第六组.glb', thumbnailUrl: '/thumbnails/第六组.jpeg' },
  { id: 'group-7', name: '第七组', modelUrl: '/gallery/第七组.glb', thumbnailUrl: '/thumbnails/第七组.jpeg' },
  { id: 'group-8', name: '第八组', modelUrl: '/gallery/第八组.glb', thumbnailUrl: '/thumbnails/第八组.jpeg' },
  { id: 'group-9', name: '第九组', modelUrl: '/gallery/第九组.glb', thumbnailUrl: '/thumbnails/第九组.jpeg' },
  { id: 'group-10', name: '第十组', modelUrl: '/gallery/第十组.glb', thumbnailUrl: '/thumbnails/第十组.jpeg' },
  { id: 'group-11', name: '第十一组', modelUrl: '/gallery/第十一组.glb', thumbnailUrl: '/thumbnails/第十一组.jpeg' },
  { id: 'group-12', name: '第十二组', modelUrl: '/gallery/第十二组.glb', thumbnailUrl: '/thumbnails/第十二组.jpeg' },
  { id: 'group-13', name: '第十三组', modelUrl: '/gallery/第十三组.glb', thumbnailUrl: '/thumbnails/第十三组.jpeg' },
  { id: 'group-14', name: '第十四组', modelUrl: '/gallery/第十四组.glb', thumbnailUrl: '/thumbnails/第十四组.jpeg' },
  { id: 'group-15', name: '第十五组', modelUrl: '/gallery/第十五组.glb', thumbnailUrl: '/thumbnails/第十五组.jpeg' },
  { id: 'group-16', name: '第十六组', modelUrl: '/gallery/第十六组.glb', thumbnailUrl: '/thumbnails/第十六组.jpeg' },
];
