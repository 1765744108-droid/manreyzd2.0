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
  wireframe1: '#000033', // 现实模型线框色
  wireframe2: '#660000', // 锚定模型线框色
};

export const INITIAL_CAMERA_POSITION: [number, number, number] = [13.5, 13.5, 13.5];

// 拖拽配置
export const DRAG_CONFIG = {
  BASE_MOVE_SPEED: 0.012,      // 基础移动速度
  MIN_DISTANCE_FACTOR: 0.5,    // 最小距离系数
  MAX_DISTANCE_FACTOR: 2,      // 最大距离系数
  DISTANCE_REFERENCE: 10,      // 距离参考值
  MIN_MOVE_THRESHOLD: 0.3,     // 最小移动阈值（像素）
  BOUNDARY_MIN: -4,            // 拖拽边界最小值（限制在可视范围内）
  BOUNDARY_MAX: 4,             // 拖拽边界最大值（限制在可视范围内）
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

// 移动端配置
export const MOBILE_CONFIG = {
  DPR: [1, 1.5] as [number, number],
  SHADOW_MAP_SIZE: 1024,
  MIN_TOUCH_TARGET: 48,        // 最小触摸目标尺寸（增大至48px）
  VIEWCUBE_SIZE: 100,          // ViewCube移动端尺寸（稍小一些节省空间）
};

// 桌面端配置
export const DESKTOP_CONFIG = {
  DPR: [1, 2] as [number, number],
  SHADOW_MAP_SIZE: 2048,
  VIEWCUBE_SIZE: 110,          // ViewCube桌面端尺寸
};

// 地面配置
export const GROUND_CONFIG = {
  INTERACTION_SIZE: 20,        // 交互区域大小（与网格范围匹配）
  CLICK_DURATION_THRESHOLD: 300, // 点击时间阈值(ms)
  CLICK_MOVE_THRESHOLD: 10,    // 点击移动阈值(像素)
};

// 模型材质配置
export const MATERIAL_CONFIG = {
  ROUGHNESS: 0.35,
  METALNESS: 0.15,
  ENV_MAP_INTENSITY: 1.8,
  RECT_HEIGHT_OFFSET_RATIO: 0.95 / 4, // 矩形部分高度偏移比例
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

