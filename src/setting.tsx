/** @jsxImportSource preact */
import { useState, useEffect } from 'preact/hooks';
import type { JSXInternal } from 'preact/src/jsx';
import { CompressionSettings, DEFAULT_SETTINGS } from './imageCompressor';

/**
 * 插件设置面板组件
 * 处理图片压缩设置
 */
export function Setting(): JSXInternal.Element {
  const [settings, setSettings] = useState<CompressionSettings>(DEFAULT_SETTINGS);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState<boolean>(false);
  const i18n = (window.Blinko as any).i18n;

  // 组件挂载时加载初始配置
  useEffect(() => {
    (window.Blinko as any).api.config.getPluginConfig.query({
      pluginName: 'blinko-image-compressor'
    }).then((res: any) => {
      if (res && res.compressionSettings) {
        try {
          const savedSettings = JSON.parse(res.compressionSettings);
          setSettings(savedSettings);
        } catch (e) {
          console.error('无法解析保存的设置:', e);
        }
      }
    }).catch((err: Error) => {
      console.error('加载设置失败:', err);
    });
  }, []);

  /**
   * 保存插件设置
   */
  const handleSave = async () => {
    try {
      await (window.Blinko as any).api.config.setPluginConfig.mutate({
        pluginName: 'blinko-image-compressor',
        key: 'compressionSettings',
        value: JSON.stringify(settings)
      });
      (window.Blinko as any).toast.success(i18n.t('successMessage'));
      (window.Blinko as any).closeDialog();
    } catch (err: unknown) {
      console.error('保存设置失败:', err);
      (window.Blinko as any).toast.error('保存设置失败');
    }
  };

  /**
   * 重置为默认设置
   */
  const handleReset = () => {
    setSettings(DEFAULT_SETTINGS);
    (window.Blinko as any).toast.info(i18n.t('imageCompressor.settings.resetSuccess') || '已重置为默认设置');
  };

  // 切换开关的自定义组件
  const ToggleSwitch = ({ checked, onChange, label }: { checked: boolean, onChange: (checked: boolean) => void, label: string }) => (
    <label className="flex items-center cursor-pointer group">
      <div className="relative">
        <input
          type="checkbox"
          className="sr-only"
          checked={checked}
          onChange={(e) => onChange(e.currentTarget.checked)}
        />
        <div className={`w-11 h-6 bg-gray-200 rounded-full transition-colors duration-200 ease-in-out group-hover:bg-gray-300 ${checked ? 'bg-blue-500 group-hover:bg-blue-600' : ''}`}></div>
        <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform duration-200 ease-in-out ${checked ? 'transform translate-x-5' : ''}`}></div>
      </div>
      <span className="ml-3 text-sm font-medium text-gray-700">{label}</span>
    </label>
  );

  // 自定义滑块组件
  const Slider = ({ value, min, max, onChange, label }: { value: number, min: number, max: number, onChange: (value: number) => void, label: string }) => (
    <div className="w-full">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <span className="text-sm font-bold text-blue-600">{Math.round(value)}%</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.currentTarget.value))}
        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500 focus:outline-none"
      />
      <div className="flex justify-between text-xs text-gray-500 mt-1">
        <span>{min}%</span>
        <span>{max}%</span>
      </div>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto p-6 rounded-lg bg-[#f7f9fc]">
      <h2 className="text-xl font-bold mb-6 text-gray-800 flex items-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-3 text-[#4a90e2]" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M3 5a2 2 0 012-2h10a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V5zm11 1H6v8l4-2 4 2V6z" clipRule="evenodd" />
        </svg>
        {i18n.t('imageCompressor.settings.title')}
      </h2>
      
      {/* 上传区域 */}
      <div className="mb-6 p-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors text-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
        <p className="text-sm text-gray-600">点击或拖拽图片到此处上传</p>
      </div>
      
      {/* 基础设置区块 */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 mb-6">
        <h3 className="text-base font-semibold mb-5 pb-2 border-b border-gray-100 text-gray-700">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 inline-block mr-2 text-[#4a90e2]" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M3 5a2 2 0 012-2h10a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V5zm11 1H6v8l4-2 4 2V6z" clipRule="evenodd" />
          </svg>
          基本压缩
        </h3>

        {/* 启用压缩开关 */}
        <div className="mb-6 px-4">
          <ToggleSwitch 
            checked={settings.enabled} 
            onChange={(checked) => setSettings({...settings, enabled: checked})}
            label={i18n.t('imageCompressor.settings.enabled')}
          />
        </div>

        {/* 图片质量滑块 */}
        <div className="mb-6 px-4">
          <Slider
            value={settings.quality * 100}
            min={10}
            max={100}
            onChange={(value) => setSettings({...settings, quality: value / 100})}
            label={i18n.t('imageCompressor.settings.quality')}
          />
        </div>
        
        {/* 保持原始尺寸开关 */}
        <div className="mb-3 px-4">
          <ToggleSwitch 
            checked={settings.maintainSize || false} 
            onChange={(checked) => setSettings({...settings, maintainSize: checked})}
            label={i18n.t('imageCompressor.settings.maintainSize')}
          />
        </div>
      </div>

      {/* 高级设置区块 */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 mb-6">
        <button 
          onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
          className="w-full flex justify-between items-center text-left focus:outline-none"
        >
          <h3 className="text-base font-semibold text-gray-700 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-[#4a90e2]" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
            </svg>
            高级选项
          </h3>
          <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 text-gray-500 transition-transform transform ${isAdvancedOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        
        {/* 高级选项内容 */}
        <div className={`mt-4 overflow-hidden transition-all duration-300 ease-in-out ${isAdvancedOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
          {/* 最大宽度输入 */}
          <div className="mb-6 px-4">
            <label className="block text-sm font-medium mb-2 text-gray-700">
              {i18n.t('imageCompressor.settings.maxWidth')} (px)
              <input
                type="number"
                min="100"
                max="10000"
                value={settings.maxWidth || 1920}
                onChange={(e) => setSettings({...settings, maxWidth: Number(e.currentTarget.value)})}
                className={`mt-2 block w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${settings.maintainSize ? 'opacity-50 bg-gray-100' : 'bg-white'}`}
                disabled={settings.maintainSize}
              />
            </label>
          </div>

          {/* 最大高度输入 */}
          <div className="mb-6 px-4">
            <label className="block text-sm font-medium mb-2 text-gray-700">
              {i18n.t('imageCompressor.settings.maxHeight')} (px)
              <input
                type="number"
                min="100"
                max="10000"
                value={settings.maxHeight || 1080}
                onChange={(e) => setSettings({...settings, maxHeight: Number(e.currentTarget.value)})}
                className={`mt-2 block w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${settings.maintainSize ? 'opacity-50 bg-gray-100' : 'bg-white'}`}
                disabled={settings.maintainSize}
              />
            </label>
          </div>

          {/* 缩放百分比控制 */}
          <div className="mb-6 px-4">
            <div className="flex items-center mb-3">
              <ToggleSwitch 
                checked={settings.useScaling || false} 
                onChange={(checked) => setSettings({...settings, useScaling: checked})}
                label="按百分比缩放"
              />
            </div>
            
            {settings.useScaling && (
              <Slider
                value={settings.scalePercent || 100}
                min={10}
                max={100}
                onChange={(value) => setSettings({...settings, scalePercent: value})}
                label="缩放比例"
              />
            )}
          </div>
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="flex justify-between mt-6">
        <button
          onClick={handleSave}
          className="inline-flex justify-center py-3 px-8 border border-transparent shadow-sm text-sm font-medium rounded-md bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 transition-all focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-50"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          {i18n.t('imageCompressor.settings.save')}
        </button>
        
        <div className="flex items-center">
          <div className="relative group">
            <button
              onClick={handleReset}
              className="inline-flex items-center justify-center py-3 px-8 border border-blue-300 shadow-sm text-sm font-medium rounded-md bg-white text-blue-600 hover:bg-blue-50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-opacity-50 group-hover:border-blue-400"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 group-hover:animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {i18n.t('imageCompressor.settings.reset')}
            </button>
            <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-10 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs rounded py-1 px-2 whitespace-nowrap pointer-events-none">
              恢复默认设置
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
