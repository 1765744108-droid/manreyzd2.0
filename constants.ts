// User provided models
export const DEFAULT_MODEL_1_URL = "/models/慢热模型 远征队.glb";
export const DEFAULT_MODEL_2_URL = "/models/慢热模型 远征队1.glb";

export const COLORS = {
  background: '#f5f5f5', // Shape3D风格背景
  ground: '#e5e5e5',
  grid: '#d0d0d0', // Shape3D风格网格色
  selection: '#1976d2', // Shape3D风格选中色
  model1: '#1781b5',    // 现实模型颜色（蓝色）
  model2: '#ee3f4d',    // 锚定模型颜色（红色）
  wireframe1: '#1a365d', // 现实模型线框色（深蓝）
  wireframe2: '#991b1b', // 锚定模型线框色（深红，更明显）
};

export const INITIAL_CAMERA_POSITION: [number, number, number] = [13.5, 13.5, 13.5];

// 拖拽配置 - 优化移动端响应
export const DRAG_CONFIG = {
  BASE_MOVE_SPEED: 0.015,      // 基础移动速度（略微提升）
  MIN_DISTANCE_FACTOR: 0.5,    // 最小距离系数
  MAX_DISTANCE_FACTOR: 2,      // 最大距离系数
  DISTANCE_REFERENCE: 10,      // 距离参考值
  MIN_MOVE_THRESHOLD: 0.5,     // 最小移动阈值（像素）
  BOUNDARY_MIN: -4,            // 拖拽边界最小值
  BOUNDARY_MAX: 4,             // 拖拽边界最大值
  // 移动端拖拽优化
  MOBILE_MOVE_SPEED: 0.018,    // 移动端更快的移动速度
  MOBILE_MIN_THRESHOLD: 1,     // 移动端更高的移动阈值（减少抖动）
};

// 动画配置
export const ANIMATION_CONFIG = {
  ROTATION_EASE_FACTOR: 10,    // 旋转缓动系数
  ROTATION_MAX_EASE: 0.3,      // 最大缓动值
  ROTATION_THRESHOLD: 0.001,   // 旋转完成阈值
  HEIGHT_ADJUST_SPEED: 0.15,   // 高度调整速度（每秒）
  HEIGHT_ADJUST_STEP: 0.025,   // 高度调整步长
  LONG_PRESS_DELAY: 150,       // 长按触发延迟(ms)
};

// 视角配置
export const CAMERA_CONFIG = {
  ROTATE_SPEED: 1.5,
  ZOOM_SPEED: 1.5,
  PAN_SPEED: 1.5,
  MIN_POLAR_ANGLE: 0,
  MAX_POLAR_ANGLE: Math.PI,
};

// 线框配置
export const WIREFRAME_CONFIG = {
  EDGE_ANGLE_THRESHOLD: 10,    // 边缘角度阈值
  LINE_WIDTH: 2,               // 线宽
  RENDER_ORDER_BASE: 10000,    // 基础渲染顺序
};

// 移动端配置 - 平衡清晰度与性能
export const MOBILE_CONFIG = {
  DPR: [1.5, 2] as [number, number],  // 提升DPR改善清晰度
  SHADOW_MAP_SIZE: 512,               // 降低阴影质量换取性能
  MIN_TOUCH_TARGET: 52,               // 更大的触摸目标
  VIEWCUBE_SIZE: 90,                  // 稍小的ViewCube
  // 移动端性能优化
  ENABLE_ANTIALIAS: true,             // 启用抗锯齿改善清晰度
  MAX_PIXEL_RATIO: 2.5,               // 高端设备最大像素比
  // 触摸响应优化
  TOUCH_SLOP: 8,                      // 触摸容差(px)
  DRAG_THRESHOLD: 5,                  // 拖拽阈值(px)
};

// 桌面端配置
export const DESKTOP_CONFIG = {
  DPR: [1, 2] as [number, number],
  SHADOW_MAP_SIZE: 2048,
  VIEWCUBE_SIZE: 110,          // ViewCube桌面端尺寸
};

// 地面配置 - 优化点击检测
export const GROUND_CONFIG = {
  INTERACTION_SIZE: 30,              // 扩大交互区域
  CLICK_DURATION_THRESHOLD: 350,     // 略微增加点击时间阈值
  CLICK_MOVE_THRESHOLD: 15,          // 增加移动容差，减少误操作
  // 移动端专用配置
  MOBILE_CLICK_THRESHOLD: 20,        // 移动端更大的移动容差
  MOBILE_CLICK_DURATION: 400,        // 移动端更长的点击时间
};

// 模型材质配置
export const MATERIAL_CONFIG = {
  ROUGHNESS: 0.35,
  METALNESS: 0.15,
  ENV_MAP_INTENSITY: 1.8,
  RECT_HEIGHT_OFFSET_RATIO: 0.95 / 4, // 矩形部分高度偏移比例
};

// 单模型查看器配置 - 轻薄透析材质
export const SINGLE_VIEWER_CONFIG = {
  // 材质配置 - 轻薄通透感
  MATERIAL: {
    OPACITY: 0.35,              // 基础透明度
    ROUGHNESS: 0.9,             // 高粗糙度，减少反射
    METALNESS: 0.0,             // 无金属感
    TRANSMISSION: 0,            // 无透射
    DEPTH_WRITE: false,         // 禁用深度写入，增强透明叠加
    SIDE: 'double',             // 双面渲染
  },
  // 线框轮廓配置
  WIREFRAME: {
    COLOR: '#1a365d',           // 深蓝色线框
    LINE_WIDTH: 1.5,            // 线宽
    OPACITY: 0.6,               // 线框透明度
  },
  // 模型尺寸
  MODEL_SCALE: 50,              // 放大模型尺寸
  // 相机配置
  CAMERA: {
    INITIAL_POSITION: [6, 6, 6] as [number, number, number],
    FOV: 45,
    NEAR: 0.1,
    FAR: 1000,
  },
};

// 预设视角
export const CAMERA_PRESETS = {
  FRONT: { position: [0, 5, 15] as [number, number, number], target: [0, 0.5, 0] as [number, number, number] },
  TOP: { position: [0, 20, 0.1] as [number, number, number], target: [0, 0, 0] as [number, number, number] },
  SIDE: { position: [15, 5, 0] as [number, number, number], target: [0, 0.5, 0] as [number, number, number] },
  BACK: { position: [0, 5, -15] as [number, number, number], target: [0, 0.5, 0] as [number, number, number] },
  ISO: { position: [10, 10, 10] as [number, number, number], target: [0, 0.5, 0] as [number, number, number] },
};

// 撤销/重做配置
export const HISTORY_CONFIG = {
  MAX_HISTORY_LENGTH: 50,      // 最大历史记录数
};

