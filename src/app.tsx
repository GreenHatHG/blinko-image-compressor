/** @jsxImportSource preact */
import { useState, useEffect } from 'preact/hooks';
import type { JSXInternal } from 'preact/src/jsx';
import { CompressionSettings, DEFAULT_SETTINGS } from './imageCompressor';

export function App(): JSXInternal.Element {
  const [settings, setSettings] = useState<CompressionSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const i18n = (window.Blinko as any).i18n;

  // 加载设置
  useEffect(() => {
    const loadSettings = async () => {
      try {
        setIsLoading(true);
        const config = await (window.Blinko as any).api.config.getPluginConfig.query({
          pluginName: 'blinko-image-compressor'
        });
        
        if (config && config.compressionSettings) {
          try {
            const savedSettings = JSON.parse(config.compressionSettings);
            setSettings(savedSettings);
          } catch (e) {
            console.error('Failed to parse saved settings:', e);
          }
        }
      } catch (err) {
        console.error('Failed to load settings:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, []);

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">{i18n.t('imageCompressor.title')}</h1>
      
      {isLoading ? (
        <div className="text-center py-4">加载中...</div>
      ) : (
        <div className="space-y-4">
          <div className="bg-gray-100 p-3 rounded">
            <div className="flex items-center justify-between">
              <span className="font-medium">{i18n.t('imageCompressor.settings.enabled')}</span>
              <span className={settings.enabled ? "text-green-600" : "text-red-600"}>
                {settings.enabled ? "✓" : "✗"}
              </span>
            </div>
          </div>
          
          <div className="bg-gray-100 p-3 rounded">
            <div className="mb-2">
              <span className="font-medium">{i18n.t('imageCompressor.settings.quality')}</span>
              <span className="ml-2">{Math.round(settings.quality * 100)}%</span>
            </div>
            <div className="mb-2">
              <span className="font-medium">{i18n.t('imageCompressor.settings.maxWidth')}</span>
              <span className="ml-2">{settings.maxWidth}px</span>
            </div>
            <div>
              <span className="font-medium">{i18n.t('imageCompressor.settings.maxHeight')}</span>
              <span className="ml-2">{settings.maxHeight}px</span>
            </div>
          </div>
        </div>
      )}
      
      <div className="mt-6 text-sm text-gray-500">
        <p>上传图片时将自动压缩，支持JPG、PNG、WebP和GIF格式。</p>
        <p className="mt-1">适用于所有平台和主流浏览器。</p>
      </div>
    </div>
  );
}
