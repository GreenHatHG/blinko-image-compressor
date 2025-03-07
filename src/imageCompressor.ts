import imageCompression from 'browser-image-compression';

export interface CompressionSettings {
  quality: number;       // 0.1 to 1.0
  useQuality?: boolean;  // 是否使用质量压缩
  maintainSize?: boolean; // 是否保持原始尺寸 (已弃用，保留向后兼容)
  maxWidth?: number;     // 最大宽度（像素）
  maxHeight?: number;    // 最大高度（像素）
  useScaling?: boolean;  // 是否使用百分比缩放
  scalePercent?: number; // 按百分比缩放 (10-100)
  useSizeLimits?: boolean; // 是否使用最大尺寸限制
  enabled: boolean;      // 是否启用压缩
}

export interface CompressionResult {
  originalFile: File;
  compressedFile: File;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
}

export const DEFAULT_SETTINGS: CompressionSettings = {
  quality: 0.6,          // 默认质量值
  useQuality: true,      // 默认启用质量压缩
  maintainSize: true,    // 默认保持原始尺寸 (已弃用)
  maxWidth: 1920,        // 默认最大宽度
  maxHeight: 1080,       // 默认最大高度
  useScaling: false,     // 默认不使用百分比缩放
  scalePercent: 100,     // 默认100%不缩放
  useSizeLimits: false,  // 默认不使用最大尺寸限制
  enabled: true          // 默认启用压缩
};

export class ImageCompressor {
  private settings: CompressionSettings;

  constructor(settings: CompressionSettings = DEFAULT_SETTINGS) {
    this.settings = settings;
  }

  /**
   * 更新压缩设置
   */
  updateSettings(settings: Partial<CompressionSettings>): void {
    this.settings = { ...this.settings, ...settings };
    console.log('更新压缩设置:', this.settings);
  }

  /**
   * 获取当前压缩设置
   */
  getSettings(): CompressionSettings {
    return { ...this.settings };
  }

  /**
   * 检查文件是否可以压缩
   */
  canCompress(file: File): boolean {
    if (!this.settings.enabled) return false;
    
    const imageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    return imageTypes.includes(file.type);
  }

  /**
   * 压缩图片文件
   */
  async compressImage(file: File): Promise<CompressionResult> {
    if (!this.canCompress(file)) {
      throw new Error('File cannot be compressed');
    }

    // 记录开始时间用于性能分析
    const startTime = performance.now();
    
    console.log('开始压缩图片，设置:', {
      quality: this.settings.quality,
      useQuality: this.settings.useQuality,
      maxWidth: this.settings.maxWidth,
      maxHeight: this.settings.maxHeight,
      useScaling: this.settings.useScaling,
      scalePercent: this.settings.scalePercent,
      useSizeLimits: this.settings.useSizeLimits
    });

    // 根据文件类型选择适当的压缩策略
    let compressionQuality = this.settings.quality;
    
    // 对较大文件使用更激进的压缩
    if (file.size > 1024 * 1024) { // 1MB以上
      compressionQuality = Math.min(compressionQuality, 0.5);
    } else if (file.size > 500 * 1024) { // 500KB以上
      compressionQuality = Math.min(compressionQuality, 0.6);
    }
    
    // PNG图片通常需要更低的质量设置才能获得明显压缩
    if (file.type === 'image/png') {
      compressionQuality = Math.min(compressionQuality, 0.5);
    }

    // 配置压缩选项
    const options: any = {
      maxSizeMB: 10,          // 最大文件大小限制（MB）
      useWebWorker: true,     // 使用WebWorker进行压缩（提高性能）
      alwaysKeepResolution: !this.settings.useScaling && !this.settings.useSizeLimits, // 只有当不使用任何尺寸调整选项时才保持分辨率
      initialQuality: this.settings.useQuality !== false ? compressionQuality : 1, // 只有当启用质量压缩时才应用质量设置
      maxIteration: 10,       // 最大压缩迭代次数
      fileType: file.type,    // 确保输出与输入文件类型相同
      exifOrientation: 1,     // 修正图片方向
      onProgress: () => {},   // 防止进度回调报错
    };

    // 处理尺寸调整
    let shouldAdjustSize = false;
    
    // 获取图片原始尺寸（如果需要调整尺寸）
    let originalDimensions: {width: number, height: number} | null = null;
    
    if (this.settings.useScaling || this.settings.useSizeLimits) {
      shouldAdjustSize = true;
      
      try {
        // 创建一个临时图片元素来获取原始尺寸
        const img = new Image();
        const loadPromise = new Promise<{width: number, height: number}>((resolve) => {
          img.onload = () => {
            resolve({width: img.width, height: img.height});
          };
          // 设置一个空的错误处理器以避免未捕获的错误
          img.onerror = () => {
            resolve({width: 0, height: 0});
          };
        });
        
        img.src = URL.createObjectURL(file);
        originalDimensions = await loadPromise;
        URL.revokeObjectURL(img.src); // 释放URL
      } catch (error) {
        console.warn('获取图片尺寸失败:', error);
        shouldAdjustSize = false;
      }
    }
    
    // 计算最终尺寸限制
    if (shouldAdjustSize && originalDimensions && originalDimensions.width > 0 && originalDimensions.height > 0) {
      let targetWidth = originalDimensions.width;
      let targetHeight = originalDimensions.height;
      
      // 应用百分比缩放
      if (this.settings.useScaling && this.settings.scalePercent && this.settings.scalePercent < 100) {
        const scale = this.settings.scalePercent / 100;
        targetWidth = Math.floor(targetWidth * scale);
        targetHeight = Math.floor(targetHeight * scale);
        
        console.log(`应用百分比缩放 ${this.settings.scalePercent}%:`, {
          originalDimensions,
          scaledDimensions: {width: targetWidth, height: targetHeight}
        });
      }
      
      // 应用最大尺寸限制
      if (this.settings.useSizeLimits && this.settings.maxWidth && this.settings.maxHeight) {
        if (targetWidth > this.settings.maxWidth) {
          const ratio = this.settings.maxWidth / targetWidth;
          targetWidth = this.settings.maxWidth;
          targetHeight = Math.floor(targetHeight * ratio);
        }
        
        if (targetHeight > this.settings.maxHeight) {
          const ratio = this.settings.maxHeight / targetHeight;
          targetHeight = this.settings.maxHeight;
          targetWidth = Math.floor(targetWidth * ratio);
        }
        
        console.log(`应用最大尺寸限制:`, {
          maxWidth: this.settings.maxWidth,
          maxHeight: this.settings.maxHeight,
          resultDimensions: {width: targetWidth, height: targetHeight}
        });
      }
      
      // 设置最终的尺寸参数
      if (targetWidth !== originalDimensions.width || targetHeight !== originalDimensions.height) {
        options.maxWidthOrHeight = Math.max(targetWidth, targetHeight);
        options.alwaysKeepResolution = false;
        
        console.log('最终尺寸调整:', {
          originalDimensions,
          targetDimensions: {width: targetWidth, height: targetHeight},
          maxWidthOrHeight: options.maxWidthOrHeight
        });
      }
    }

    try {
      console.log('压缩选项:', options);
      
      // 开始压缩
      const compressedFile = await imageCompression(file, options);
      
      // 计算压缩结果数据
      const result = {
        originalFile: file,
        compressedFile,
        originalSize: file.size,
        compressedSize: compressedFile.size,
        compressionRatio: compressedFile.size / file.size
      };
      
      // 记录压缩结果
      const endTime = performance.now();
      console.log('压缩完成:', {
        originalSize: this.formatFileSize(result.originalSize),
        compressedSize: this.formatFileSize(result.compressedSize),
        ratio: `${(result.compressionRatio * 100).toFixed(2)}%`,
        reduction: `${((1 - result.compressionRatio) * 100).toFixed(2)}%`,
        time: `${(endTime - startTime).toFixed(0)}ms`
      });
      
      // 如果压缩后的文件比原始文件更大或几乎相同大小，强制降低质量再次尝试
      if (compressedFile.size >= file.size * 0.9) {
        console.log('压缩效果不明显，尝试使用更低质量再次压缩');
        
        // 更激进的压缩策略，大幅降低质量和分辨率
        const forcedOptions = {
          ...options,
          initialQuality: Math.max(0.1, compressionQuality - 0.4), // 大幅降低质量
          fileType: file.type,
          maxWidthOrHeight: options.maxWidthOrHeight ? 
                           Math.floor(options.maxWidthOrHeight * 0.8) : // 降低分辨率
                           (this.settings.maxWidth ? 
                             Math.floor(Math.max(this.settings.maxWidth, this.settings.maxHeight || 0) * 0.8) : 
                             undefined)
        };
        
        console.log('强制压缩选项:', forcedOptions);
        
        try {
          const forcedCompressedFile = await imageCompression(file, forcedOptions);
          
          // 如果第二次压缩效果更好，返回第二次结果
          if (forcedCompressedFile.size < compressedFile.size * 0.9) {
            const forcedResult = {
              originalFile: file,
              compressedFile: forcedCompressedFile,
              originalSize: file.size,
              compressedSize: forcedCompressedFile.size,
              compressionRatio: forcedCompressedFile.size / file.size
            };
            
            console.log('强制压缩成功:', {
              originalSize: this.formatFileSize(forcedResult.originalSize),
              compressedSize: this.formatFileSize(forcedResult.compressedSize),
              ratio: `${(forcedResult.compressionRatio * 100).toFixed(2)}%`,
              reduction: `${((1 - forcedResult.compressionRatio) * 100).toFixed(2)}%`
            });
            
            return forcedResult;
          }
        } catch (error) {
          console.warn('二次压缩失败，使用第一次压缩结果', error);
        }
      }

      return result;
    } catch (error) {
      console.error('压缩图片出错:', error);
      throw error;
    }
  }

  /**
   * 格式化文件大小为易读格式
   */
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
  
  /**
   * 格式化文件大小为易读格式（实例方法版本）
   */
  formatFileSize(bytes: number): string {
    return ImageCompressor.formatFileSize(bytes);
  }
} 