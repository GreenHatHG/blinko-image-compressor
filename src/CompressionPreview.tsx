/** @jsxImportSource preact */
import { useState, useRef, useEffect } from "preact/hooks";
import type { JSXInternal } from "preact/src/jsx";
import {
  CompressionSettings,
  DEFAULT_SETTINGS,
  ImageCompressor,
} from "./imageCompressor";
import imageCompression from "browser-image-compression";

interface PreviewState {
  originalImage: string | null;
  compressedImage: string | null;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  originalDimensions: { width: number; height: number } | null;
  compressedDimensions: { width: number; height: number } | null;
  isCompressing: boolean;
  error: string | null;
  originalFile: File | null;
  settingsChanged: boolean; // 标记设置是否已更改但未应用
}

/**
 * 图片压缩预览组件
 * 支持拖放上传和实时预览
 */
export function CompressionPreview(): JSXInternal.Element {
  const [settings, setSettings] =
    useState<CompressionSettings>(DEFAULT_SETTINGS);
  const [previewState, setPreviewState] = useState<PreviewState>({
    originalImage: null,
    compressedImage: null,
    originalSize: 0,
    compressedSize: 0,
    compressionRatio: 0,
    originalDimensions: null,
    compressedDimensions: null,
    isCompressing: false,
    error: null,
    originalFile: null,
    settingsChanged: false,
  });
  const [isDragging, setIsDragging] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [forceTwoColumns, setForceTwoColumns] = useState(false);
  const [expandedImage, setExpandedImage] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const i18n = (window.Blinko as any).i18n;
  const imageCompressor = new ImageCompressor(settings);

  // 检测移动设备
  useEffect(() => {
    const checkMobile = () => {
      // 改为更宽的断点，使更多设备展示为双列布局
      const mobile = window.innerWidth < 640;
      setIsMobile(mobile);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // 组件挂载时加载初始配置
  useEffect(() => {
    (window.Blinko as any).api.config.getPluginConfig
      .query({
        pluginName: "blinko-image-compressor",
      })
      .then((res: any) => {
        if (res && res.compressionSettings) {
          try {
            const savedSettings = JSON.parse(res.compressionSettings);
            setSettings(savedSettings);
          } catch (e) {
            console.error("无法解析保存的设置:", e);
          }
        }
      })
      .catch((err: Error) => {
        console.error("加载设置失败:", err);
      });
  }, []);

  /**
   * 处理图片文件
   */
  const handleImageFile = async (file: File) => {
    if (!file || !file.type.startsWith("image/")) {
      setPreviewState((prev) => ({
        ...prev,
        error: "请选择有效的图片文件",
        settingsChanged: false,
      }));
      return;
    }

    try {
      setPreviewState((prev) => ({
        ...prev,
        isCompressing: true,
        error: null,
        originalFile: file,
        settingsChanged: false,
      }));

      // 读取原始图片
      const originalUrl = URL.createObjectURL(file);

      // 获取原始图片尺寸
      const originalDimensions = await getImageDimensions(originalUrl);

      // 压缩图片 - 使用imageCompressor而不是直接调用库
      const imageCompressor = new ImageCompressor(settings);
      const result = await imageCompressor.compressImage(file);

      // 获取压缩后的URL
      const compressedUrl = URL.createObjectURL(result.compressedFile);

      // 获取压缩后图片尺寸
      const compressedDimensions = await getImageDimensions(compressedUrl);

      setPreviewState((prev) => ({
        ...prev,
        originalImage: originalUrl,
        compressedImage: compressedUrl,
        originalSize: result.originalSize,
        compressedSize: result.compressedSize,
        compressionRatio: result.compressionRatio,
        originalDimensions,
        compressedDimensions,
        isCompressing: false,
        error: null,
        settingsChanged: false,
      }));
    } catch (error) {
      console.error("压缩图片出错:", error);
      setPreviewState((prev) => ({
        ...prev,
        isCompressing: false,
        error: `压缩失败: ${(error as Error).message}`,
        settingsChanged: false,
      }));
    }
  };

  /**
   * 获取图片尺寸
   */
  const getImageDimensions = (
    url: string
  ): Promise<{ width: number; height: number }> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        resolve({ width: img.width, height: img.height });
      };
      img.onerror = () => {
        resolve({ width: 0, height: 0 });
      };
      img.src = url;
    });
  };

  /**
   * 处理拖放事件
   */
  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
      handleImageFile(e.dataTransfer.files[0]);
    }
  };

  /**
   * 处理文件选择
   */
  const handleFileSelect = (e: JSXInternal.TargetedEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files;
    if (files && files.length > 0) {
      handleImageFile(files[0]);
    }
  };

  /**
   * 处理设置变更，但不立即重新压缩
   */
  const handleSettingChange = (newSettings: Partial<CompressionSettings>) => {
    const updatedSettings = { ...settings, ...newSettings };
    setSettings(updatedSettings);

    // 标记设置已更改但未应用
    if (previewState.originalFile) {
      setPreviewState((prev) => ({
        ...prev,
        settingsChanged: true,
      }));
    }
  };

  /**
   * 应用当前设置并重新压缩
   */
  const applyCompression = () => {
    if (previewState.originalFile && previewState.settingsChanged) {
      handleImageFile(previewState.originalFile);
    }
  };

  /**
   * 触发文件选择对话框
   */
  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  // 计算是否应该使用单列布局
  const useSingleColumn = isMobile && !forceTwoColumns;

  // 放大查看图片
  const expandImage = () => {
    setExpandedImage(true);
  };

  // 关闭放大查看
  const closeExpandedImage = () => {
    setExpandedImage(false);
  };

  return (
    <div className="max-w-4xl mx-auto p-4 rounded-lg max-h-[70vh] overflow-y-auto">
      <h2 className="text-lg font-medium mb-5 text-foreground flex items-center">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5 mr-2 text-primary"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
            clipRule="evenodd"
          />
        </svg>
        {i18n.t("imageCompressor.preview.title")}
      </h2>

      {/* 压缩设置 */}
      <div className="mb-6 bg-background p-5 rounded-lg shadow-md border border-border">
        <h3 className="font-medium mb-4 text-base flex items-center text-foreground">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4 mr-1 text-primary"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z"
              clipRule="evenodd"
            />
          </svg>
          {i18n.t("imageCompressor.settings.title")}
        </h3>

        {/* 压缩选项开关 */}
        <div className="mb-4">
          <h4 className="text-sm font-medium mb-3 bg-muted p-2 rounded-md text-foreground">
            {i18n.t("imageCompressor.settings.options")}
          </h4>

          {/* 压缩质量选项 */}
          <div className="mb-5 pl-2">
            <label className="flex items-center space-x-2 mb-2 hover:bg-muted p-2 rounded-md transition-colors cursor-pointer">
              <input
                type="checkbox"
                checked={settings.useQuality !== false}
                onChange={(e) =>
                  handleSettingChange({ useQuality: e.currentTarget.checked })
                }
                className="h-5 w-5 rounded text-primary focus:ring-primary"
              />
              <span className="text-sm font-medium text-foreground">
                {i18n.t("imageCompressor.settings.useQuality")}
              </span>
            </label>

            {settings.useQuality !== false && (
              <>
                <div className="ml-6 mt-3">
                  <label className="block text-sm font-medium mb-2 text-foreground">
                    {i18n.t("imageCompressor.settings.quality")} (
                    {Math.round(settings.quality * 100)}%)
                    <div className="flex items-center mt-2">
                      <input
                        type="range"
                        min="10"
                        max="100"
                        value={settings.quality * 100}
                        onChange={(e) =>
                          handleSettingChange({
                            quality: Number(e.currentTarget.value) / 100,
                          })
                        }
                        className="block w-full mr-3 h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                      />
                      <input
                        type="number"
                        min="10"
                        max="100"
                        value={Math.round(settings.quality * 100)}
                        onChange={(e) =>
                          handleSettingChange({
                            quality: Number(e.currentTarget.value) / 100,
                          })
                        }
                        className="w-16 px-2 py-1 border border-input rounded text-center focus:ring-1 focus:ring-primary focus:border-primary"
                      />
                    </div>
                  </label>
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>10%</span>
                    <span>100%</span>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* 百分比缩放选项 */}
          <div className="mb-5 pl-2">
            <label className="flex items-center space-x-2 mb-2 hover:bg-muted p-2 rounded-md transition-colors cursor-pointer">
              <input
                type="checkbox"
                checked={settings.useScaling !== false}
                onChange={(e) =>
                  handleSettingChange({ useScaling: e.currentTarget.checked })
                }
                className="h-5 w-5 rounded text-primary focus:ring-primary"
              />
              <span className="text-sm font-medium text-foreground">
                {i18n.t("imageCompressor.settings.useScaling")}
              </span>
            </label>

            {settings.useScaling !== false && (
              <div className="ml-6 mt-3">
                <label className="block text-sm font-medium mb-2 text-foreground">
                  {i18n.t("imageCompressor.settings.scalePercent")} (
                  {settings.scalePercent || 100}%)
                  <div className="flex items-center mt-2">
                    <input
                      type="range"
                      min="10"
                      max="100"
                      step="1"
                      value={settings.scalePercent || 100}
                      onChange={(e) =>
                        handleSettingChange({
                          scalePercent: Number(e.currentTarget.value),
                        })
                      }
                      className="block w-full mr-3 h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                    <input
                      type="number"
                      min="10"
                      max="100"
                      value={settings.scalePercent || 100}
                      onChange={(e) =>
                        handleSettingChange({
                          scalePercent: Number(e.currentTarget.value),
                        })
                      }
                      className="w-16 px-2 py-1 border border-input rounded text-center focus:ring-1 focus:ring-primary focus:border-primary"
                    />
                  </div>
                </label>
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>10%</span>
                  <span>100%</span>
                </div>
              </div>
            )}
          </div>

          {/* 最大尺寸限制选项 */}
          <div className="mb-4 pl-2">
            <label className="flex items-center space-x-2 mb-2 hover:bg-muted p-2 rounded-md transition-colors cursor-pointer">
              <input
                type="checkbox"
                checked={settings.useSizeLimits !== false}
                onChange={(e) =>
                  handleSettingChange({
                    useSizeLimits: e.currentTarget.checked,
                  })
                }
                className="h-5 w-5 rounded text-primary focus:ring-primary"
              />
              <span className="text-sm font-medium text-foreground">
                {i18n.t("imageCompressor.settings.useSizeLimits")}
              </span>
            </label>

            {settings.useSizeLimits !== false && (
              <div className="ml-6">
                <div
                  className={`grid ${
                    isMobile ? "grid-cols-1 gap-2" : "grid-cols-2 gap-4"
                  } mb-2`}
                >
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      {i18n.t("imageCompressor.settings.maxWidth")} (px)
                      <input
                        type="number"
                        min="100"
                        max="10000"
                        value={settings.maxWidth || 1920}
                        onChange={(e) =>
                          handleSettingChange({
                            maxWidth: Number(e.currentTarget.value),
                          })
                        }
                        className="mt-1 block w-full px-3 py-2 border border-input rounded-md shadow-sm sm:text-sm"
                      />
                    </label>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      {i18n.t("imageCompressor.settings.maxHeight")} (px)
                      <input
                        type="number"
                        min="100"
                        max="10000"
                        value={settings.maxHeight || 1080}
                        onChange={(e) =>
                          handleSettingChange({
                            maxHeight: Number(e.currentTarget.value),
                          })
                        }
                        className="mt-1 block w-full px-3 py-2 border border-input rounded-md shadow-sm sm:text-sm"
                      />
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 重置按钮 */}
        <div className="mt-5 flex justify-between">
          {/* 应用压缩按钮 - 仅当设置已更改且有原始文件时才启用 */}
          {previewState.originalFile && previewState.settingsChanged && (
            <button
              onClick={applyCompression}
              className="py-2 px-4 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
              disabled={previewState.isCompressing}
            >
              {previewState.isCompressing
                ? "正在压缩..."
                : i18n.t("imageCompressor.preview.compressNow")}
            </button>
          )}

          <button
            onClick={() => handleSettingChange({ ...DEFAULT_SETTINGS })}
            className="py-2 px-4 bg-muted text-foreground rounded hover:bg-muted/80 transition-colors"
          >
            {i18n.t("imageCompressor.settings.reset")}
          </button>
        </div>
      </div>

      {/* 文件上传区域 */}
      {!previewState.originalImage && (
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center ${
            isDragging ? "border-primary bg-primary/5" : "border-muted bg-muted"
          } transition-colors`}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={triggerFileInput}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileSelect}
          />
          <div className="flex flex-col items-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-12 w-12 text-muted-foreground mb-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <p className="mb-2">
              {i18n.t("imageCompressor.preview.dragImage")}
            </p>
          </div>
        </div>
      )}

      {/* 错误提示 */}
      {previewState.error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-md mt-4 shadow-sm">
          <div className="flex">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 text-destructive mr-2"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            {previewState.error}
          </div>
        </div>
      )}

      {/* 加载中提示 */}
      {previewState.isCompressing && (
        <div className="text-center py-8 bg-background rounded-md shadow-sm border border-border mt-4">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-muted border-t-primary"></div>
          <p className="mt-4 text-muted-foreground">压缩中...</p>
        </div>
      )}

      {/* 预览区域 */}
      {previewState.originalImage &&
        previewState.compressedImage &&
        !previewState.isCompressing && (
          <div className="mt-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-foreground flex items-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 mr-2 text-primary"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 9.5H3M21 4.5H3M21 14.5H3M21 19.5H3" />
                  <rect x="6" y="4" width="4" height="16" rx="1" />
                  <rect x="14" y="4" width="4" height="16" rx="1" />
                </svg>
                图片对比
              </h3>

              {isMobile && (
                <button
                  onClick={() => setForceTwoColumns(!forceTwoColumns)}
                  className="text-xs bg-muted hover:bg-muted/80 text-foreground px-2 py-1 rounded flex items-center"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 mr-1"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    {forceTwoColumns ? (
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 6h16M4 12h16M4 18h7"
                      />
                    ) : (
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7"
                      />
                    )}
                  </svg>
                  {forceTwoColumns ? "单列显示" : "双列显示"}
                </button>
              )}
            </div>

            {/* 压缩对比数据 */}
            <div className="bg-background border border-border rounded-lg overflow-hidden shadow-sm mb-4">
              <div className="bg-gradient-to-r from-primary/5 to-primary/10 px-4 py-3 border-b border-border">
                <div className="flex flex-wrap justify-between items-center">
                  <div className="flex items-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 mr-2 text-primary"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect
                        x="3"
                        y="3"
                        width="18"
                        height="18"
                        rx="2"
                        ry="2"
                      ></rect>
                      <circle cx="8.5" cy="8.5" r="1.5"></circle>
                      <polyline points="21 15 16 10 5 21"></polyline>
                    </svg>
                    <div>
                      <span className="font-medium">原始图片:</span>
                      <span className="ml-2 text-sm text-foreground">
                        {ImageCompressor.formatFileSize(
                          previewState.originalSize
                        )}
                        {previewState.originalDimensions && (
                          <span className="ml-1">
                            ({previewState.originalDimensions.width} ×{" "}
                            {previewState.originalDimensions.height})
                          </span>
                        )}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center mt-2 sm:mt-0">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 mr-2 text-primary"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M8 17L12 21L16 17"></path>
                      <path d="M12 12V21"></path>
                      <path d="M20.39 18.39A5 5 0 0018 9h-1.26A8 8 0 103 16.3"></path>
                      <polyline points="16 16 12 12 8 16"></polyline>
                    </svg>
                    <div>
                      <span className="font-medium">压缩后:</span>
                      <span className="ml-2 text-sm text-foreground">
                        {ImageCompressor.formatFileSize(
                          previewState.compressedSize
                        )}
                        {previewState.compressedDimensions && (
                          <span className="ml-1">
                            ({previewState.compressedDimensions.width} ×{" "}
                            {previewState.compressedDimensions.height})
                          </span>
                        )}
                        <span
                          className={
                            previewState.compressionRatio < 1
                              ? "ml-1 text-primary font-medium"
                              : "ml-1 text-destructive font-medium"
                          }
                        >
                          (
                          {Math.round(
                            (1 - previewState.compressionRatio) * 100
                          )}
                          % 减少)
                        </span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 图片预览 */}
            <div
              className="border border-border rounded-lg overflow-hidden shadow-sm cursor-pointer mb-4 bg-background relative group"
              onClick={expandImage}
            >
              <div className="flex justify-center items-center p-3">
                {/* 悬浮提示 */}
                <div className="absolute inset-0 bg-foreground/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
                  <div className="bg-background bg-opacity-90 text-foreground px-4 py-2 rounded-full shadow-lg flex items-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 mr-2 text-primary"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m4-3h-6"
                      />
                    </svg>
                    点击查看大图对比
                  </div>
                </div>

                <div
                  className={`grid ${
                    useSingleColumn ? "grid-cols-1 gap-4" : "grid-cols-2 gap-4"
                  } w-full`}
                >
                  <div className="flex flex-col items-center">
                    <div className="text-sm text-muted-foreground mb-2 text-center">
                      原始图片
                    </div>
                    <div className="bg-muted p-2 rounded w-full flex justify-center">
                      <img
                        src={previewState.originalImage}
                        alt="Original"
                        className="object-contain max-h-[300px] w-auto"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col items-center">
                    <div className="text-sm text-muted-foreground mb-2 text-center">
                      压缩后
                    </div>
                    <div className="bg-muted p-2 rounded w-full flex justify-center">
                      <img
                        src={previewState.compressedImage}
                        alt="Compressed"
                        className="object-contain max-h-[300px] w-auto"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 重新选择按钮 */}
            <div className="flex justify-center mt-6 mb-6">
              <button
                className="px-8 py-3 bg-background border border-primary text-primary rounded-md hover:bg-primary/5 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-opacity-50 shadow-sm font-medium flex items-center"
                onClick={() => {
                  setPreviewState({
                    originalImage: null,
                    compressedImage: null,
                    originalSize: 0,
                    compressedSize: 0,
                    compressionRatio: 0,
                    originalDimensions: null,
                    compressedDimensions: null,
                    isCompressing: false,
                    error: null,
                    originalFile: null,
                    settingsChanged: false,
                  });
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 mr-2"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                  />
                </svg>
                重新选择图片
              </button>
            </div>
          </div>
        )}

      {/* 图片放大查看弹窗 - 同时显示两张图片对比 */}
      {expandedImage && (
        <div
          className="fixed inset-0 bg-foreground/90 z-50 flex items-center justify-center p-4"
          onClick={closeExpandedImage}
        >
          <div
            className="relative max-w-[90vw] max-h-[90vh] bg-background rounded-lg p-4 overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col md:flex-row items-center justify-center gap-4">
              <div className="flex flex-col items-center">
                <h3 className="text-base text-foreground mb-2">原始图片</h3>
                <div className="bg-muted p-2 rounded">
                  <img
                    src={previewState.originalImage || ""}
                    alt="Original full view"
                    className="max-h-[70vh] max-w-[45vw] object-contain"
                  />
                </div>
                <div className="text-sm text-muted-foreground mt-2">
                  {ImageCompressor.formatFileSize(previewState.originalSize)}
                  {previewState.originalDimensions && (
                    <span>
                      {" "}
                      ({previewState.originalDimensions.width} ×{" "}
                      {previewState.originalDimensions.height})
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-col items-center">
                <h3 className="text-base text-foreground mb-2">压缩后</h3>
                <div className="bg-muted p-2 rounded">
                  <img
                    src={previewState.compressedImage || ""}
                    alt="Compressed full view"
                    className="max-h-[70vh] max-w-[45vw] object-contain"
                  />
                </div>
                <div className="text-sm text-muted-foreground mt-2">
                  {ImageCompressor.formatFileSize(previewState.compressedSize)}
                  {previewState.compressedDimensions && (
                    <span>
                      {" "}
                      ({previewState.compressedDimensions.width} ×{" "}
                      {previewState.compressedDimensions.height})
                    </span>
                  )}
                  <span
                    className={
                      previewState.compressionRatio < 1
                        ? "ml-1 text-primary"
                        : "ml-1 text-destructive"
                    }
                  >
                    ({Math.round((1 - previewState.compressionRatio) * 100)}%
                    减少)
                  </span>
                </div>
              </div>
            </div>

            <button
              className="absolute top-2 right-2 bg-muted text-foreground p-2 rounded-full hover:bg-muted/80"
              onClick={closeExpandedImage}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
