/** @jsxImportSource preact */
/// <reference types="systemjs" />

import { render } from 'preact/compat';
import { App } from "./app"
import type { BasePlugin } from 'blinko';
import { Setting } from './setting';
import { CompressionPreview } from './CompressionPreview';
import { ImageCompressor, CompressionSettings, DEFAULT_SETTINGS } from './imageCompressor';

/**
 * Main plugin entry point registered with SystemJS
 * Exports the plugin class implementing BasePlugin interface
 */
System.register([], (exports) => ({
  execute: () => {
    exports('default', class Plugin implements BasePlugin {
      private imageCompressor: ImageCompressor;
      private settings: CompressionSettings = DEFAULT_SETTINGS;
      private originalUploadFunction: any = null;

      constructor() {
        // Initialize plugin with metadata from plugin.json
        Object.assign(this, __PLUGIN_JSON__);
        this.imageCompressor = new ImageCompressor(this.settings);
      }

      // 启用设置面板
      withSettingPanel = true;

      /**
       * Renders the settings panel UI
       * @returns {HTMLElement} Container element with rendered settings component
       */
      renderSettingPanel = () => {
        const container = document.createElement('div');
        render(<CompressionPreview />, container);
        return container;
      }

      /**
       * Initializes the plugin
       * Sets up internationalization and hooks into file upload
       */
      async init() {
        // Initialize internationalization
        this.initI18n();
        
        // Load saved settings
        await this.loadSettings();
        
        // Hook into the file upload process
        this.interceptFileUpload();
      }

      /**
       * Loads saved compression settings from plugin config
       */
      async loadSettings() {
        try {
          const config = await (window.Blinko as any).api.config.getPluginConfig.query({
            pluginName: 'blinko-image-compressor'
          });
          
          if (config && config.compressionSettings) {
            try {
              const savedSettings = JSON.parse(config.compressionSettings);
              this.settings = savedSettings;
              this.imageCompressor.updateSettings(savedSettings);
              console.log('Loaded compression settings:', savedSettings);
            } catch (e) {
              console.error('Failed to parse saved settings:', e);
            }
          }
        } catch (err) {
          console.error('Failed to load settings:', err);
        }
      }

      /**
       * Intercepts file upload process to compress images before upload
       */
      interceptFileUpload() {
        // 使用any类型绕过类型检查
        const blinko = window.Blinko as any;
        
        // 检查是否存在上传功能
        if (blinko.store?.resourceStore?.upload) {
          // 保存原始上传函数
          this.originalUploadFunction = blinko.store.resourceStore.upload;
          
          // 替换为我们的拦截器
          blinko.store.resourceStore.upload = async (file: File) => {
            // 只处理图片文件并且压缩功能已启用
            if (this.settings.enabled && this.imageCompressor.canCompress(file)) {
              try {
                const i18n = blinko.i18n;
                console.log('开始压缩图片:', file.name, 'Size:', file.size, 'Type:', file.type, '设置:', this.settings);
                
                // 使用当前设置压缩图片
                const result = await this.imageCompressor.compressImage(file);
                
                // 如果压缩成功且减小了文件大小
                if (result.compressionRatio < 0.9) { // 更严格的压缩比例要求
                  const originalSize = ImageCompressor.formatFileSize(result.originalSize);
                  const compressedSize = ImageCompressor.formatFileSize(result.compressedSize);
                  const percent = Math.round((1 - result.compressionRatio) * 100);
                  
                  // 显示成功消息
                  blinko.toast.success(
                    i18n.t('imageCompressor.messages.compressed', {
                      original: originalSize,
                      compressed: compressedSize,
                      percent: percent
                    })
                  );
                  
                  console.log('压缩成功:', {
                    file: file.name,
                    originalSize: originalSize,
                    compressedSize: compressedSize,
                    reduction: `${percent}%`,
                    compressionRatio: result.compressionRatio
                  });
                  
                  // 确认文件类型正确性
                  if (!result.compressedFile.type || result.compressedFile.type !== file.type) {
                    console.warn('文件类型不匹配, 设置正确的 MIME 类型:', file.type);
                    const newFile = new File(
                      [await result.compressedFile.arrayBuffer()], 
                      result.compressedFile.name, 
                      { type: file.type }
                    );
                    return this.originalUploadFunction(newFile);
                  }
                  
                  // 使用压缩后的文件上传
                  return this.originalUploadFunction(result.compressedFile);
                } else {
                  // 压缩率不明显
                  if (blinko.toast.info) {
                    blinko.toast.info(i18n.t('imageCompressor.messages.noCompression'));
                  }
                  console.log('压缩效果不明显，使用原始文件:', {
                    file: file.name,
                    originalSize: result.originalSize,
                    compressedSize: result.compressedSize,
                    compressionRatio: result.compressionRatio
                  });
                }
              } catch (error) {
                console.error('Error compressing image:', error);
                blinko.toast.error(
                  blinko.i18n.t('imageCompressor.messages.error', {
                    message: (error as Error).message
                  })
                );
              }
            }
            
            // 对于非图片文件或压缩失败的情况，回退到原始上传
            return this.originalUploadFunction(file);
          };
        }
      }

      /**
       * Initializes internationalization resources
       * Adds English and Chinese translation bundles
       */
      initI18n() {
        (window.Blinko as any).i18n.addResourceBundle('en', 'translation', __en__);
        (window.Blinko as any).i18n.addResourceBundle('zh', 'translation', __zh__);
      }

      /**
       * Cleanup function called when plugin is disabled
       */
      destroy() {
        // 恢复原始上传函数
        const blinko = window.Blinko as any;
        if (this.originalUploadFunction && blinko.store?.resourceStore) {
          blinko.store.resourceStore.upload = this.originalUploadFunction;
        }
        
        // 移除事件监听
        if (blinko.events && blinko.events.off) {
          blinko.events.off('editor:loaded');
        }
        
        console.log('Image Compressor plugin destroyed');
      }
    });
  }
}));