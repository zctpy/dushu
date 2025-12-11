import React, { useState, useEffect, useRef } from 'react';
import { Book, ReaderSettings } from '../types';
import { ArrowLeft, Settings, Sun, Moon, Coffee, Eye, Monitor, Check, Copy, X, Type, MoveHorizontal } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface ReaderProps {
  book: Book;
  onClose: () => void;
  onUpdateProgress: (id: string, progress: number) => void;
}

const Reader: React.FC<ReaderProps> = ({ book, onClose, onUpdateProgress }) => {
  const [settings, setSettings] = useState<ReaderSettings>({
    theme: 'sepia',
    fontSize: 20,
    fontFamily: 'serif',
    lineHeight: 1.8,
    maxWidth: 65,
  });
  
  const [showSettings, setShowSettings] = useState(false);
  const [progress, setProgress] = useState(book.progress || 0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Restore scroll position on mount
  useEffect(() => {
    if (isInitialLoad && containerRef.current && book.progress && book.progress > 0) {
      // Small timeout to ensure content is rendered
      setTimeout(() => {
        if (containerRef.current) {
          const { scrollHeight, clientHeight } = containerRef.current;
          const scrollTop = (book.progress! / 100) * (scrollHeight - clientHeight);
          containerRef.current.scrollTop = scrollTop;
          setIsInitialLoad(false);
        }
      }, 100);
    }
  }, [isInitialLoad, book.progress]);

  // Handle scroll progress
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - clientHeight <= 0) return;
    const p = (scrollTop / (scrollHeight - clientHeight)) * 100;
    setProgress(Math.min(Math.max(p, 0), 100));
  };

  const handleBack = () => {
    onUpdateProgress(book.id, progress);
    onClose();
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(book.content);
      showToast('全文已复制到剪贴板');
    } catch (err) {
      showToast('复制失败');
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const getThemeClasses = (theme: string) => {
    switch (theme) {
      case 'light': return 'bg-white text-gray-900 prose-gray';
      case 'dark': return 'bg-[#1a1a1a] text-[#a1a1aa] prose-invert';
      case 'sepia': return 'bg-[#f4ecd8] text-[#5b4636] prose-sepia';
      case 'slate': return 'bg-[#1e293b] text-[#cbd5e1] prose-invert';
      case 'green': return 'bg-[#cce8cf] text-[#064e3b] prose-green'; // Classic eye-protection
      default: return 'bg-white text-gray-900';
    }
  };

  const getHeaderClasses = (theme: string) => {
    switch (theme) {
      case 'dark': 
      case 'slate':
        return 'border-white/10 bg-[#1a1a1a]/80 text-gray-300';
      case 'sepia': 
        return 'border-[#5b4636]/10 bg-[#f4ecd8]/90 text-[#5b4636]';
      case 'green':
        return 'border-[#064e3b]/10 bg-[#cce8cf]/90 text-[#064e3b]';
      default: 
        return 'border-gray-200 bg-white/90 text-gray-700';
    }
  };

  return (
    <div className={`h-full flex flex-col relative transition-colors duration-500 ${getThemeClasses(settings.theme).split(' ')[0]}`}>
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 animate-in fade-in zoom-in duration-300">
           <div className="bg-gray-800 text-white px-4 py-2 rounded-full shadow-lg text-sm flex items-center gap-2">
             <Check className="w-4 h-4 text-green-400" />
             {toastMessage}
           </div>
        </div>
      )}

      {/* Floating Header */}
      <div className={`
        flex items-center justify-between px-6 py-3 border-b backdrop-blur-md sticky top-0 z-40 transition-all duration-300
        ${getHeaderClasses(settings.theme)}
      `}>
        <div className="flex items-center gap-4 flex-1">
          <button 
            onClick={handleBack} 
            className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            title="返回书库 (自动保存进度)"
          >
            <ArrowLeft className="w-5 h-5 opacity-80" />
          </button>
          <h2 className="text-sm font-serif tracking-wide opacity-90 truncate max-w-xs">{book.title}</h2>
        </div>

        <div className="flex items-center gap-1">
           <button 
            onClick={copyToClipboard}
            className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            title="复制全文"
          >
            <Copy className="w-5 h-5 opacity-70" />
          </button>

          <div className="relative">
            <button 
              onClick={() => setShowSettings(!showSettings)} 
              className={`p-2 rounded-full transition-colors ${showSettings ? 'bg-black/10 dark:bg-white/10' : 'hover:bg-black/5 dark:hover:bg-white/10'}`}
              title="阅读设置"
            >
              <Settings className="w-5 h-5 opacity-70" />
            </button>

            {/* Settings Dropdown */}
            {showSettings && (
              <>
                <div 
                  className="fixed inset-0 z-40 cursor-default" 
                  onClick={() => setShowSettings(false)}
                />
                <div className="absolute right-0 top-14 w-80 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 p-5 z-50 text-gray-800 dark:text-gray-200 origin-top-right animate-in fade-in zoom-in-95 duration-200">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">阅读设置</h3>
                    <button onClick={() => setShowSettings(false)} className="text-gray-400 hover:text-gray-600">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  
                  {/* Themes */}
                  <div className="grid grid-cols-5 gap-2 mb-6">
                    <button 
                      onClick={() => setSettings({ ...settings, theme: 'light' })}
                      className={`h-10 rounded-lg border flex items-center justify-center transition-all ${settings.theme === 'light' ? 'ring-2 ring-indigo-500 border-indigo-500 scale-105' : 'border-gray-200 bg-white hover:bg-gray-50'}`}
                      title="明亮"
                    ><Sun className="w-5 h-5 text-gray-600" /></button>
                    <button 
                      onClick={() => setSettings({ ...settings, theme: 'sepia' })}
                      className={`h-10 rounded-lg border flex items-center justify-center transition-all bg-[#f4ecd8] ${settings.theme === 'sepia' ? 'ring-2 ring-indigo-500 border-indigo-500 scale-105' : 'border-[#e3d7bf] hover:brightness-95'}`}
                      title="羊皮纸"
                    ><Coffee className="w-5 h-5 text-[#5b4636]" /></button>
                    <button 
                      onClick={() => setSettings({ ...settings, theme: 'green' })}
                      className={`h-10 rounded-lg border flex items-center justify-center transition-all bg-[#cce8cf] ${settings.theme === 'green' ? 'ring-2 ring-indigo-500 border-indigo-500 scale-105' : 'border-[#b7d6bb] hover:brightness-95'}`}
                      title="护眼"
                    ><Eye className="w-5 h-5 text-[#064e3b]" /></button>
                     <button 
                      onClick={() => setSettings({ ...settings, theme: 'slate' })}
                      className={`h-10 rounded-lg border flex items-center justify-center transition-all bg-[#1e293b] ${settings.theme === 'slate' ? 'ring-2 ring-indigo-500 border-indigo-500 scale-105' : 'border-slate-700 hover:bg-slate-700'}`}
                      title="Slate"
                    ><Monitor className="w-5 h-5 text-slate-300" /></button>
                    <button 
                      onClick={() => setSettings({ ...settings, theme: 'dark' })}
                      className={`h-10 rounded-lg border flex items-center justify-center transition-all bg-[#1a1a1a] ${settings.theme === 'dark' ? 'ring-2 ring-indigo-500 border-indigo-500 scale-105' : 'border-gray-800 hover:bg-black'}`}
                      title="暗黑"
                    ><Moon className="w-5 h-5 text-gray-400" /></button>
                  </div>

                  {/* Font Size */}
                  <div className="mb-4 bg-gray-50 dark:bg-gray-700/50 p-3 rounded-xl">
                     <div className="flex justify-between mb-3 items-center">
                       <span className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1">
                         <Type className="w-3 h-3" /> 字号
                       </span>
                       <span className="text-xs font-mono bg-white dark:bg-gray-600 px-2 py-0.5 rounded border border-gray-200 dark:border-gray-500">{settings.fontSize}px</span>
                     </div>
                     <input 
                      type="range" 
                      min="14" 
                      max="48" 
                      step="1"
                      value={settings.fontSize} 
                      onChange={(e) => setSettings({ ...settings, fontSize: Number(e.target.value) })}
                      className="w-full accent-indigo-600 h-1.5 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer"
                     />
                     <div className="flex justify-between mt-1 text-[10px] text-gray-400">
                       <span>小</span>
                       <span>大</span>
                     </div>
                  </div>

                  {/* Line Width */}
                  <div className="mb-6 bg-gray-50 dark:bg-gray-700/50 p-3 rounded-xl">
                     <div className="flex justify-between mb-3 items-center">
                       <span className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1">
                         <MoveHorizontal className="w-3 h-3" /> 行宽
                       </span>
                       <span className="text-xs font-mono bg-white dark:bg-gray-600 px-2 py-0.5 rounded border border-gray-200 dark:border-gray-500">{settings.maxWidth}ch</span>
                     </div>
                     <input 
                      type="range" 
                      min="30" 
                      max="100" 
                      step="1"
                      value={settings.maxWidth} 
                      onChange={(e) => setSettings({ ...settings, maxWidth: Number(e.target.value) })}
                      className="w-full accent-indigo-600 h-1.5 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer"
                     />
                     <div className="flex justify-between mt-1 text-[10px] text-gray-400">
                       <span>窄</span>
                       <span>宽</span>
                     </div>
                  </div>

                  {/* Font Family */}
                  <div>
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-2">字体风格</span>
                    <div className="grid grid-cols-2 gap-2">
                      {(['serif', 'sans', 'mono', 'art'] as const).map(font => (
                        <button
                          key={font}
                          onClick={() => setSettings({ ...settings, fontFamily: font })}
                          className={`py-2 px-3 text-sm rounded-lg border transition-all text-left ${
                            settings.fontFamily === font 
                            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 ring-1 ring-indigo-500' 
                            : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 text-gray-600 dark:text-gray-300'
                          }`}
                        >
                          <span className={
                            font === 'serif' ? 'font-serif' : 
                            font === 'sans' ? 'font-sans' : 
                            font === 'mono' ? 'font-mono' : 'font-art'
                          }>
                            {font === 'serif' ? '宋体 / Serif' : 
                             font === 'sans' ? '黑体 / Sans' : 
                             font === 'mono' ? '等宽 / Mono' : '书法 / Art'}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-y-auto reader-scroll relative scroll-smooth"
        onScroll={handleScroll}
      >
        <div className="w-full flex justify-center px-6 sm:px-10 py-16 min-h-screen">
          <div 
            className={`prose prose-lg transition-all duration-300 ease-in-out ${getThemeClasses(settings.theme)}`}
            style={{ 
              fontSize: `${settings.fontSize}px`,
              fontFamily: settings.fontFamily === 'mono' ? 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace' : 
                          settings.fontFamily === 'serif' ? '"Noto Serif SC", Georgia, serif' : 
                          settings.fontFamily === 'art' ? '"Ma Shan Zheng", cursive' :
                          '"Noto Sans SC", system-ui, sans-serif',
              lineHeight: settings.lineHeight,
              maxWidth: `${settings.maxWidth}ch`,
              width: '100%' // Ensure container takes full width up to maxWidth
            }}
          >
           {book.format === 'md' ? (
             <ReactMarkdown>{book.content}</ReactMarkdown>
           ) : (
             <div className="whitespace-pre-wrap text-justify break-words leading-relaxed">{book.content}</div>
           )}
           
           <div className="mt-32 pt-12 border-t opacity-30 text-center text-sm font-serif italic">
             ( 完 ) &mdash; {book.title}
           </div>
          </div>
        </div>
      </div>

      {/* Minimal Progress Bar */}
      <div className="h-0.5 w-full bg-transparent fixed bottom-0 left-0 z-50 pointer-events-none">
        <div 
          className="h-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)] transition-all duration-100 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
      
      {/* Page number indicator (optional, mostly for visual flair) */}
      <div className={`fixed bottom-4 right-6 text-xs font-mono opacity-40 pointer-events-none ${settings.theme === 'dark' ? 'text-white' : 'text-black'}`}>
        {Math.round(progress)}%
      </div>
    </div>
  );
};

export default Reader;