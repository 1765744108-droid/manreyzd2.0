import React, { useState, useMemo, useRef, useEffect } from 'react';
import { ArrowLeft, Grid3X3, Search, X, ArrowUp } from 'lucide-react';
import { GalleryModel, GALLERY_MODELS } from '../galleryData';

interface ModelGalleryProps {
  onSelectModel: (model: GalleryModel) => void;
  onBack: () => void;
}

export const ModelGallery: React.FC<ModelGalleryProps> = ({ onSelectModel, onBack }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
  const [showBackToTop, setShowBackToTop] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  // 移动端检测
  const isMobile = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           window.innerWidth < 768 ||
           'ontouchstart' in window;
  }, []);
  
  // 过滤模型
  const filteredModels = useMemo(() => {
    if (!searchTerm.trim()) return GALLERY_MODELS;
    return GALLERY_MODELS.filter(model => 
      model.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm]);

  const handleImageLoad = (id: string) => {
    setLoadedImages(prev => new Set(prev).add(id));
  };
  
  // 监听滚动显示返回顶部按钮
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    
    const handleScroll = () => {
      setShowBackToTop(container.scrollTop > 300);
    };
    
    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);
  
  // 返回顶部
  const scrollToTop = () => {
    scrollContainerRef.current?.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  return (
    <div 
      className="fixed inset-0 bg-gradient-to-br from-slate-50 to-blue-50 z-50 overflow-hidden animate-fade-in"
      style={{
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        paddingLeft: 'env(safe-area-inset-left, 0px)',
        paddingRight: 'env(safe-area-inset-right, 0px)',
      }}
    >
      {/* 顶部导航栏 */}
      <div className="bg-white/90 border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            {/* 返回按钮 */}
            <button
              onClick={onBack}
              className={`flex items-center gap-2 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors touch-manipulation active:scale-95 ${
                isMobile ? 'px-3 py-3' : 'px-4 py-2.5'
              }`}
            >
              <ArrowLeft size={isMobile ? 22 : 20} />
              <span className="font-medium text-sm hidden sm:inline">返回对比</span>
            </button>
            
            {/* 标题 */}
            <div className="flex items-center gap-2">
              <Grid3X3 size={isMobile ? 22 : 24} className="text-blue-500" />
              <h1 className={`font-bold text-gray-800 ${isMobile ? 'text-lg' : 'text-xl'}`}>模型库</h1>
              <span className="text-sm text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                {filteredModels.length}
              </span>
            </div>
            
            {/* 桌面端搜索框 */}
            <div className="relative hidden sm:block">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="搜索模型..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-10 py-2.5 bg-gray-100 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-48"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>
          
          {/* 移动端搜索框 */}
          <div className="mt-3 sm:hidden">
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="搜索模型..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-10 py-3 bg-gray-100 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                >
                  <X size={20} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* 模型卡片网格 */}
      <div 
        ref={scrollContainerRef}
        className="overflow-y-auto h-[calc(100vh-80px)] sm:h-[calc(100vh-72px)]"
      >
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className={`grid gap-4 ${
            isMobile ? 'grid-cols-2' : 'grid-cols-3 lg:grid-cols-4'
          }`}>
            {filteredModels.map((model, index) => (
              <button
                key={model.id}
                onClick={() => onSelectModel(model)}
                className="group bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-shadow duration-200 touch-manipulation border border-gray-100 hover:border-blue-300 active:scale-[0.96]"
                style={{
                  animationDelay: `${index * 30}ms`,
                }}
              >
                {/* 缩略图容器 */}
                <div className="relative aspect-[4/3] bg-gray-100 overflow-hidden">
                  {/* 加载占位 */}
                  {!loadedImages.has(model.id) && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                  {/* 缩略图 */}
                  <img
                    src={model.thumbnailUrl}
                    alt={model.name}
                    className={`w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 group-active:scale-100 ${
                      loadedImages.has(model.id) ? 'opacity-100' : 'opacity-0'
                    }`}
                    onLoad={() => handleImageLoad(model.id)}
                    loading="lazy"
                  />
                  {/* 移动端：始终显示半透明遮罩 */}
                  {isMobile && (
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                  )}
                  {/* 桌面端：悬停遮罩 */}
                  {!isMobile && (
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  )}
                  {/* 桌面端悬停提示 */}
                  {!isMobile && (
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <span className="px-4 py-2 bg-white/90 rounded-full text-sm font-medium text-blue-600 shadow-lg">
                        查看模型
                      </span>
                    </div>
                  )}
                </div>
                
                {/* 模型信息 */}
                <div className={`p-3 ${isMobile ? 'py-2.5' : ''}`}>
                  <h3 className={`font-bold text-gray-800 group-hover:text-blue-600 group-active:text-blue-700 transition-colors ${
                    isMobile ? 'text-sm' : 'text-base'
                  }`}>
                    {model.name}
                  </h3>
                  {model.description && (
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                      {model.description}
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>
          
          {/* 无结果提示 */}
          {filteredModels.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-gray-500">
              <Search size={48} className="mb-4 opacity-50" />
              <p className="text-lg font-medium">未找到匹配的模型</p>
              <p className="text-sm mt-1">尝试其他搜索词</p>
            </div>
          )}
          
          {/* 底部安全边距 */}
          <div className="h-20" />
        </div>
      </div>
      
      {/* 返回顶部按钮 */}
      {showBackToTop && (
        <button
          onClick={scrollToTop}
          className="fixed z-20 bg-blue-500 hover:bg-blue-600 text-white rounded-full shadow-lg transition-transform touch-manipulation active:scale-90 animate-bounce-in"
          style={{
            bottom: 'max(24px, calc(env(safe-area-inset-bottom, 0px) + 16px))',
            right: 'max(16px, env(safe-area-inset-right, 8px))',
            width: isMobile ? '52px' : '48px',
            height: isMobile ? '52px' : '48px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ArrowUp size={isMobile ? 24 : 22} />
        </button>
      )}
    </div>
  );
};
