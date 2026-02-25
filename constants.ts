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

// 拖拽配置 - 移动端触控优化
export const DRAG_CONFIG = {
  BASE_MOVE_SPEED: 0.015,
  MIN_DISTANCE_FACTOR: 0.5,
  MAX_DISTANCE_FACTOR: 2,
  DISTANCE_REFERENCE: 10,
  MIN_MOVE_THRESHOLD: 0.5,
  BOUNDARY_MIN: -5,            // 扩大拖拽范围
  BOUNDARY_MAX: 5,
  // 移动端拖拽优化
  MOBILE_MOVE_SPEED: 0.025,    // 提高移动速度
  MOBILE_MIN_THRESHOLD: 2,     // 适中阈值
  MOBILE_DEBOUNCE_MS: 0,       // 无防抖
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

// 线框配置 - 移动端简化
export const WIREFRAME_CONFIG = {
  EDGE_ANGLE_THRESHOLD: 15,    // 提高边缘角度阈值（减少线条）
  LINE_WIDTH: 1,               // 线宽
  RENDER_ORDER_BASE: 10000,    // 基础渲染顺序
  MOBILE_EDGE_THRESHOLD: 25,   // 移动端更高阈值
};

// 移动端配置 - 性能优先
export const MOBILE_CONFIG = {
  DPR: [1, 1.5] as [number, number],  // 降低DPR优先流畅性
  SHADOW_MAP_SIZE: 256,
  MIN_TOUCH_TARGET: 48,
  VIEWCUBE_SIZE: 80,
  ENABLE_ANTIALIAS: false,            // 移动端禁用抗锯齿提升性能
  MAX_PIXEL_RATIO: 1.5,               // 降低最大像素比
  TOUCH_SLOP: 5,                      // 降低触摸容差提高响应
  DRAG_THRESHOLD: 5,                  // 降低拖拽阈值
  DISABLE_SHADOWS: true,
  DISABLE_CONTACT_SHADOWS: true,
  SIMPLIFIED_GRID: true,
};

// 桌面端配置
export const DESKTOP_CONFIG = {
  DPR: [1, 2] as [number, number],
  SHADOW_MAP_SIZE: 2048,
  VIEWCUBE_SIZE: 110,          // ViewCube桌面端尺寸
};

// 地面配置 - 优化点击检测（缩小至40%）
export const GROUND_CONFIG = {
  INTERACTION_SIZE: 12,              // 交互区域（原30的40%）
  CLICK_DURATION_THRESHOLD: 350,     // 点击时间阈值
  CLICK_MOVE_THRESHOLD: 15,          // 移动容差
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

