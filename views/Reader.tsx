import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Book, ReaderSettings } from '../types';
import { ArrowLeft, Settings, Sun, Moon, Coffee, Eye, Monitor, Check, Copy, X, Type, MoveHorizontal, List, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, FileText, StickyNote, BookOpen } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface ReaderProps {
  book: Book;
  onClose: () => void;
  onUpdateProgress: (id: string, progress: number) => void;
}

interface TocItem {
  title: string;
  pageIndex: number;
  level: number;
}

const CHARS_PER_PAGE = 1200; 

const Reader: React.FC<ReaderProps> = ({ book, onClose, onUpdateProgress }) => {
  const [settings, setSettings] = useState<ReaderSettings>(() => {
    try {
      const saved = localStorage.getItem('nebula-reader-settings');
      return saved ? JSON.parse(saved) : {
        theme: 'sepia',
        fontSize: 20,
        fontFamily: 'serif',
        lineHeight: 1.8,
        maxWidth: 70,
      };
    } catch (e) {
      return {
        theme: 'sepia',
        fontSize: 20,
        fontFamily: 'serif',
        lineHeight: 1.8,
        maxWidth: 70,
      };
    }
  });
  
  const [showSettings, setShowSettings] = useState(false);
  const [showCopyMenu, setShowCopyMenu] = useState(false);
  const [showToc, setShowToc] = useState(false); 
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  
  const [pages, setPages] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [toc, setToc] = useState<TocItem[]>([]);
  const [jumpInput, setJumpInput] = useState('');
  const [isReady, setIsReady] = useState(false);
  
  const tocRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem('nebula-reader-settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    const processContent = () => {
      const content = book.content || '';
      const lines = content.split('\n');
      const newPages: string[] = [];
      let currentChunk = '';
      let currentLength = 0;

      const tempToc: TocItem[] = [];
      let pageIndex = 0;

      const headerRegex = /^(#{1,6}\s+|第[0-9零一二三四五六七八九十百千]+[章回节卷]|Chapter\s+\d+)/i;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        if (headerRegex.test(line.trim())) {
           const level = line.startsWith('#') ? line.match(/^#+/)?.[0].length || 1 : 1;
           const title = line.replace(/^[#\s]+/, '').trim();
           
           let targetPage = pageIndex;
           if (currentLength > CHARS_PER_PAGE * 0.8) {
              targetPage = pageIndex + 1;
           }

           tempToc.push({
             title: title.length > 20 ? title.substring(0, 20) + '...' : title,
             pageIndex: targetPage,
             level
           });
        }

        currentChunk += line + '\n';
        currentLength += line.length;

        if (currentLength > CHARS_PER_PAGE) {
          newPages.push(currentChunk);
          currentChunk = '';
          currentLength = 0;
          pageIndex++;
        }
      }

      if (currentChunk.trim()) {
        newPages.push(currentChunk);
      }
      
      if (newPages.length === 0) newPages.push("暂无内容");

      setPages(newPages);
      setToc(tempToc);
      
      if (book.progress) {
        const initialPage = Math.max(1, Math.ceil((book.progress / 100) * newPages.length));
        setCurrentPage(initialPage);
      } else {
        setCurrentPage(1);
      }
      
      setIsReady(true);
    };

    processContent();
  }, [book.content, book.progress]);

  useEffect(() => {
    if (showToc && tocRef.current) {
      const activeItem = tocRef.current.querySelector('[data-active="true"]');
      if (activeItem) {
        activeItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [showToc, currentPage]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pages.length) {
      setCurrentPage(newPage);
      const contentArea = document.getElementById('reader-content-area');
      if (contentArea) {
        contentArea.scrollTo({ top: 0, behavior: 'instant' });
      }
    }
  };

  const handleJumpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const p = parseInt(jumpInput);
    if (!isNaN(p)) {
      handlePageChange(p);
    }
    setJumpInput('');
  };

  const handleBack = () => {
    const finalProgress = (currentPage / pages.length) * 100;
    onUpdateProgress(book.id, finalProgress);
    onClose();
  };

  const handleCopy = async (type: 'page' | 'full') => {
    try {
      const text = type === 'page' ? pages[currentPage - 1] : book.content;
      if (!text) {
          showToast('无内容可复制');
          return;
      }
      await navigator.clipboard.writeText(text);
      showToast(type === 'page' ? '当前页内容已复制' : '全文内容已复制');
    } catch (err) {
      showToast('复制失败');
    } finally {
      setShowCopyMenu(false);
    }
  };

  const toggleNightMode = () => {
    const isDark = settings.theme === 'dark' || settings.theme === 'slate';
    setSettings(prev => ({
      ...prev,
      theme: isDark ? 'light' : 'dark'
    }));
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Refined theme colors for better readability and contrast
  const getThemeClasses = (theme: string) => {
    switch (theme) {
      case 'light': return 'bg-[#ffffff] text-[#1a1a1a] selection:bg-indigo-100 selection:text-indigo-900';
      case 'dark': return 'bg-[#121212] text-[#d4d4d4] selection:bg-gray-700 selection:text-white';
      case 'sepia': return 'bg-[#f8f1e3] text-[#5b4636] selection:bg-[#eaddb6] selection:text-[#3d2e1e]';
      case 'slate': return 'bg-[#1e293b] text-[#e2e8f0] selection:bg-slate-600 selection:text-white';
      case 'green': return 'bg-[#d5e8d4] text-[#2d4b32] selection:bg-[#b0cbb5] selection:text-[#0f301e]'; 
      default: return 'bg-white text-gray-900';
    }
  };

  // UI Components (Header/Footer/Sidebar)
  // Increased opacity to 95% or 98% to prevent the "muddy" (糊) look where text bleeds through too much
  const getHeaderClasses = (theme: string) => {
    const base = "backdrop-blur-md transition-colors border-b shadow-sm z-40";
    switch (theme) {
      case 'dark': 
        return `${base} border-white/10 bg-[#121212]/95 text-gray-300`;
      case 'slate':
        return `${base} border-white/10 bg-[#1e293b]/95 text-gray-300`;
      case 'sepia': 
        return `${base} border-[#5b4636]/10 bg-[#f8f1e3]/95 text-[#5b4636]`;
      case 'green':
        return `${base} border-[#2d4b32]/10 bg-[#d5e8d4]/95 text-[#2d4b32]`;
      default: 
        return `${base} border-gray-200/80 bg-white/95 text-gray-800`;
    }
  };

  const currentContent = pages[currentPage - 1] || "";
  const isNightMode = settings.theme === 'dark' || settings.theme === 'slate';
  const progressPercent = (currentPage / pages.length) * 100;

  return (
    <div className={`h-full flex flex-col relative transition-colors duration-500 overflow-hidden ${getThemeClasses(settings.theme)}`}>
      
      {/* Top Progress Bar Line */}
      <div className="absolute top-0 left-0 right-0 h-0.5 z-50 bg-transparent">
        <div 
          className="h-full bg-indigo-500 transition-all duration-300 ease-out shadow-[0_0_8px_rgba(99,102,241,0.5)]" 
          style={{ width: `${progressPercent}%` }}
        ></div>
      </div>

      {/* Toast */}
      {toastMessage && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 z-[60] animate-in fade-in zoom-in duration-300 slide-in-from-top-4">
           <div className={`px-5 py-2.5 rounded-full shadow-xl text-sm font-medium flex items-center gap-2 backdrop-blur-md border ${isNightMode ? 'bg-gray-800/95 text-white border-white/10' : 'bg-white/95 text-gray-800 border-gray-200'}`}>
             <Check className="w-4 h-4 text-green-500" />
             {toastMessage}
           </div>
        </div>
      )}

      {/* Top Header */}
      <div className={`
        flex items-center justify-between px-4 sm:px-6 py-3 shrink-0 h-14
        ${getHeaderClasses(settings.theme)}
      `}>
        <div className="flex items-center gap-1 sm:gap-2 flex-1 overflow-hidden">
          <button 
            onClick={handleBack} 
            className="p-2 rounded-full hover:bg-current hover:bg-opacity-10 transition-all active:scale-95"
            title="返回书库"
          >
            <ArrowLeft className="w-5 h-5 opacity-90" />
          </button>
          
          <button
             onClick={() => setShowToc(!showToc)}
             className={`p-2 rounded-lg transition-all flex items-center gap-2 text-sm font-bold tracking-wide active:scale-95 ${showToc ? 'bg-current bg-opacity-10' : 'hover:bg-current hover:bg-opacity-5'}`}
             title="目录"
          >
            <List className="w-5 h-5 opacity-90" />
            <span className="hidden sm:inline">目录</span>
          </button>

          <div className="h-4 w-px bg-current opacity-10 mx-2 hidden sm:block"></div>
          
          <h2 className="text-sm font-serif font-bold tracking-wide opacity-90 truncate max-w-[150px] sm:max-w-xs select-none" title={book.title}>
            {book.title}
          </h2>
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
           <button 
            onClick={toggleNightMode}
            className="p-2 rounded-full hover:bg-current hover:bg-opacity-10 transition-all hover:rotate-12 active:scale-90"
            title={isNightMode ? "切换到日间模式" : "切换到夜间模式"}
          >
            {isNightMode ? (
              <Sun className="w-5 h-5 opacity-80" />
            ) : (
              <Moon className="w-5 h-5 opacity-80" />
            )}
          </button>

           <div className="relative">
             <button 
              onClick={() => setShowCopyMenu(!showCopyMenu)}
              className={`p-2 rounded-full transition-all active:scale-90 ${showCopyMenu ? 'bg-current bg-opacity-10' : 'hover:bg-current hover:bg-opacity-5'}`}
              title="复制内容"
            >
              <Copy className="w-5 h-5 opacity-80" />
            </button>
             
             {showCopyMenu && (
                <>
                <div 
                    className="fixed inset-0 z-40 cursor-default" 
                    onClick={() => setShowCopyMenu(false)}
                />
                <div className={`absolute top-12 right-0 w-44 rounded-xl shadow-xl border py-2 z-50 text-sm font-medium animate-in fade-in zoom-in-95 slide-in-from-top-2 duration-200 overflow-hidden backdrop-blur-xl ${isNightMode ? 'bg-gray-900/95 border-gray-700/50 text-gray-200' : 'bg-white/95 border-white/50 text-gray-700'}`}>
                    <div className="px-4 py-1.5 text-xs font-bold opacity-40 uppercase tracking-wider mb-1">复制选项</div>
                    <button 
                        onClick={() => handleCopy('page')}
                        className="w-full text-left px-4 py-2.5 hover:bg-current hover:bg-opacity-5 transition-colors flex items-center gap-3"
                    >
                        <StickyNote className="w-4 h-4 opacity-70" />
                        复制本页
                    </button>
                    <div className="h-px bg-current opacity-5 mx-4"></div>
                    <button 
                        onClick={() => handleCopy('full')}
                        className="w-full text-left px-4 py-2.5 hover:bg-current hover:bg-opacity-5 transition-colors flex items-center gap-3"
                    >
                        <FileText className="w-4 h-4 opacity-70" />
                        复制全文
                    </button>
                </div>
                </>
            )}
           </div>

          <div className="relative">
            <button 
              onClick={() => setShowSettings(!showSettings)} 
              className={`p-2 rounded-full transition-all active:scale-90 ${showSettings ? 'bg-current bg-opacity-10' : 'hover:bg-current hover:bg-opacity-5'}`}
              title="阅读设置"
            >
              <Settings className="w-5 h-5 opacity-80" />
            </button>

            {/* Settings Dropdown */}
            {showSettings && (
              <>
                <div 
                  className="fixed inset-0 z-40 cursor-default" 
                  onClick={() => setShowSettings(false)}
                />
                <div className={`absolute right-0 top-12 w-80 rounded-2xl shadow-2xl border p-5 z-50 origin-top-right animate-in fade-in zoom-in-95 slide-in-from-top-2 duration-200 backdrop-blur-xl ${isNightMode ? 'bg-gray-900/98 border-gray-700/50 text-gray-100' : 'bg-white/98 border-white/50 text-gray-800'}`}>
                  <div className="flex justify-between items-center mb-5">
                    <h3 className="text-xs font-bold opacity-50 uppercase tracking-[0.2em]">界面设置</h3>
                    <button onClick={() => setShowSettings(false)} className="opacity-50 hover:opacity-100 transition-opacity p-1">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  
                  {/* Themes */}
                  <div className="grid grid-cols-5 gap-2 mb-6">
                    <button 
                      onClick={() => setSettings({ ...settings, theme: 'light' })}
                      className={`h-9 rounded-lg border flex items-center justify-center transition-all shadow-sm ${settings.theme === 'light' ? 'border-indigo-500 scale-105 ring-2 ring-indigo-500/20' : 'border-gray-200 bg-white hover:border-gray-300'}`}
                      title="明亮"
                    ><Sun className="w-4 h-4 text-gray-600" /></button>
                    <button 
                      onClick={() => setSettings({ ...settings, theme: 'sepia' })}
                      className={`h-9 rounded-lg border flex items-center justify-center transition-all shadow-sm bg-[#f8f1e3] ${settings.theme === 'sepia' ? 'border-indigo-500 scale-105 ring-2 ring-indigo-500/20' : 'border-[#e3d7bf] hover:border-[#d4c3a3]'}`}
                      title="羊皮纸"
                    ><Coffee className="w-4 h-4 text-[#5b4636]" /></button>
                    <button 
                      onClick={() => setSettings({ ...settings, theme: 'green' })}
                      className={`h-9 rounded-lg border flex items-center justify-center transition-all shadow-sm bg-[#d5e8d4] ${settings.theme === 'green' ? 'border-indigo-500 scale-105 ring-2 ring-indigo-500/20' : 'border-[#b0cbb5] hover:border-[#9ab59f]'}`}
                      title="护眼"
                    ><Eye className="w-4 h-4 text-[#2d4b32]" /></button>
                     <button 
                      onClick={() => setSettings({ ...settings, theme: 'slate' })}
                      className={`h-9 rounded-lg border flex items-center justify-center transition-all shadow-sm bg-[#1e293b] ${settings.theme === 'slate' ? 'border-indigo-500 scale-105 ring-2 ring-indigo-500/20' : 'border-slate-600 hover:border-slate-500'}`}
                      title="深蓝"
                    ><Monitor className="w-4 h-4 text-slate-300" /></button>
                    <button 
                      onClick={() => setSettings({ ...settings, theme: 'dark' })}
                      className={`h-9 rounded-lg border flex items-center justify-center transition-all shadow-sm bg-[#121212] ${settings.theme === 'dark' ? 'border-indigo-500 scale-105 ring-2 ring-indigo-500/20' : 'border-gray-700 hover:border-gray-600'}`}
                      title="暗黑"
                    ><Moon className="w-4 h-4 text-gray-400" /></button>
                  </div>

                  {/* Font Size */}
                  <div className={`mb-5 p-3 rounded-xl ${isNightMode ? 'bg-white/5' : 'bg-black/5'}`}>
                     <div className="flex justify-between mb-3 items-center">
                       <span className="text-xs font-bold opacity-60 flex items-center gap-2">
                         <Type className="w-3 h-3" /> 字号大小
                       </span>
                       <span className={`text-xs font-mono px-2 py-0.5 rounded border ${isNightMode ? 'bg-black/30 border-white/10' : 'bg-white border-gray-200'}`}>{settings.fontSize}px</span>
                     </div>
                     <input 
                      type="range" 
                      min="16" 
                      max="48" 
                      step="1"
                      value={settings.fontSize} 
                      onChange={(e) => setSettings({ ...settings, fontSize: Number(e.target.value) })}
                      className="w-full accent-indigo-500 h-1.5 bg-current bg-opacity-10 rounded-lg appearance-none cursor-pointer"
                     />
                     <div className="flex justify-between mt-1 text-[10px] opacity-40 font-serif">
                        <span>A</span>
                        <span>A</span>
                     </div>
                  </div>

                   {/* Line Width */}
                  <div className={`mb-6 p-3 rounded-xl ${isNightMode ? 'bg-white/5' : 'bg-black/5'}`}>
                     <div className="flex justify-between mb-3 items-center">
                       <span className="text-xs font-bold opacity-60 flex items-center gap-2">
                         <MoveHorizontal className="w-3 h-3" /> 阅读宽度
                       </span>
                       <span className={`text-xs font-mono px-2 py-0.5 rounded border ${isNightMode ? 'bg-black/30 border-white/10' : 'bg-white border-gray-200'}`}>{settings.maxWidth}ch</span>
                     </div>
                     <input 
                      type="range" 
                      min="40" 
                      max="120" 
                      step="2"
                      value={settings.maxWidth} 
                      onChange={(e) => setSettings({ ...settings, maxWidth: Number(e.target.value) })}
                      className="w-full accent-indigo-500 h-1.5 bg-current bg-opacity-10 rounded-lg appearance-none cursor-pointer"
                     />
                  </div>

                  {/* Font Family */}
                  <div>
                    <span className="text-xs font-bold opacity-50 block mb-2 uppercase tracking-[0.1em]">字体风格</span>
                    <div className="grid grid-cols-2 gap-2">
                      {(['serif', 'sans', 'mono', 'art'] as const).map(font => (
                        <button
                          key={font}
                          onClick={() => setSettings({ ...settings, fontFamily: font })}
                          className={`py-2 px-3 text-sm rounded-lg border transition-all text-left relative overflow-hidden group ${
                            settings.fontFamily === font 
                            ? 'border-indigo-500 text-indigo-500 bg-indigo-50/10' 
                            : 'border-transparent bg-current bg-opacity-5 hover:bg-opacity-10 opacity-70 hover:opacity-100'
                          }`}
                        >
                          <span className={`relative z-10 ${
                            font === 'serif' ? 'font-serif' : 
                            font === 'sans' ? 'font-sans' : 
                            font === 'mono' ? 'font-mono' : 'font-art'
                          }`}>
                            {font === 'serif' ? '宋体 / Serif' : 
                             font === 'sans' ? '黑体 / Sans' : 
                             font === 'mono' ? '等宽 / Mono' : '书法 / Art'}
                          </span>
                          {settings.fontFamily === font && (
                            <div className="absolute top-1 right-1">
                              <Check className="w-3 h-3 text-indigo-500" />
                            </div>
                          )}
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

      <div className="flex-1 flex overflow-hidden relative">
        
        {/* TOC Sidebar */}
        <div className={`
            absolute top-0 bottom-0 left-0 w-80 z-50 flex flex-col transition-transform duration-300 ease-in-out border-r shadow-2xl
            ${getHeaderClasses(settings.theme).replace('border-b', '')}
            ${showToc ? 'translate-x-0' : '-translate-x-full'}
          `}>
             <div className="p-4 border-b border-current border-opacity-10 flex justify-between items-center bg-current bg-opacity-[0.02]">
               <span className="text-xs font-bold uppercase opacity-70 tracking-widest">目录结构</span>
               <button onClick={() => setShowToc(false)} className="opacity-50 hover:opacity-100 p-1">
                 <X className="w-4 h-4" />
               </button>
             </div>
             {toc.length === 0 ? (
               <div className="flex-1 flex flex-col items-center justify-center opacity-40 p-10 text-center gap-3">
                 <BookOpen className="w-8 h-8" />
                 <span className="text-sm">本书暂无目录</span>
               </div>
             ) : (
               <div ref={tocRef} className="flex-1 overflow-y-auto reader-scroll py-2">
                 {toc.map((item, idx) => (
                   <button
                     key={idx}
                     data-active={currentPage === item.pageIndex + 1}
                     onClick={() => {
                       handlePageChange(item.pageIndex + 1);
                       setShowToc(false);
                     }}
                     className={`w-full text-left px-5 py-2.5 text-sm transition-colors border-l-[3px] relative group
                       ${currentPage === item.pageIndex + 1 
                         ? 'border-indigo-500 bg-current bg-opacity-10 font-bold text-indigo-500' 
                         : 'border-transparent opacity-80 hover:bg-current hover:bg-opacity-5'
                       }
                     `}
                     style={{ paddingLeft: `${Math.max(20, item.level * 16)}px` }}
                   >
                     {item.title}
                   </button>
                 ))}
               </div>
             )}
        </div>

        {/* TOC Overlay */}
        {showToc && (
          <div 
            className="absolute inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity"
            onClick={() => setShowToc(false)}
          />
        )}

        {/* Main Reading Area */}
        <div className="flex-1 flex flex-col min-w-0 relative">
          
          <div 
            id="reader-content-area"
            className="flex-1 overflow-y-auto reader-scroll p-4 sm:p-6 md:p-10 flex justify-center scroll-smooth"
            onClick={() => {
              if (showSettings) setShowSettings(false);
              if (showCopyMenu) setShowCopyMenu(false);
            }}
          >
            {isReady ? (
              <div 
                key={currentPage} 
                className={`transition-all duration-300 ease-in-out animate-fade-in subpixel-antialiased
                  [&>p]:indent-[2em] [&>p]:mb-6 [&>p]:leading-loose
                  [&>h1]:text-3xl [&>h1]:font-bold [&>h1]:mb-8 [&>h1]:mt-8 [&>h1]:text-center [&>h1]:indent-0
                  [&>h2]:text-2xl [&>h2]:font-bold [&>h2]:mb-6 [&>h2]:mt-8 [&>h2]:indent-0
                  [&>h3]:text-xl [&>h3]:font-bold [&>h3]:mb-4 [&>h3]:mt-6 [&>h3]:indent-0
                  [&>blockquote]:border-l-4 [&>blockquote]:border-current [&>blockquote]:border-opacity-30 [&>blockquote]:pl-4 [&>blockquote]:italic [&>blockquote]:opacity-80 [&>blockquote]:mb-6 [&>blockquote]:indent-0
                  [&>ul]:list-disc [&>ul]:pl-6 [&>ul]:mb-6 [&>ul]:indent-0
                  [&>ol]:list-decimal [&>ol]:pl-6 [&>ol]:mb-6 [&>ol]:indent-0
                  [&>pre]:p-4 [&>pre]:bg-current [&>pre]:bg-opacity-5 [&>pre]:rounded-lg [&>pre]:mb-6 [&>pre]:overflow-x-auto [&>pre]:indent-0
                `}
                style={{ 
                  fontSize: `${settings.fontSize}px`,
                  fontFamily: settings.fontFamily === 'mono' ? 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace' : 
                              settings.fontFamily === 'serif' ? '"Noto Serif SC", Georgia, serif' : 
                              settings.fontFamily === 'art' ? '"Ma Shan Zheng", cursive' :
                              '"Noto Sans SC", system-ui, sans-serif',
                  lineHeight: settings.lineHeight,
                  maxWidth: `${settings.maxWidth}ch`,
                  width: '100%' 
                }}
              >
               {book.format === 'md' ? (
                 <ReactMarkdown>{currentContent}</ReactMarkdown>
               ) : (
                 <div className="whitespace-pre-wrap break-words leading-loose min-h-[60vh]">
                   {currentContent}
                 </div>
               )}
               
               <div className="h-20 flex items-center justify-center opacity-30 text-sm italic font-serif mt-12 mb-20 select-none">
                 - 第 {currentPage} 页 -
               </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full opacity-50 gap-4">
                <div className="w-10 h-10 border-4 border-current border-t-transparent rounded-full animate-spin"></div>
                <div className="text-sm tracking-widest font-serif">正在排版...</div>
              </div>
            )}
          </div>

          {/* Bottom Pagination Bar */}
          <div className={`
             h-16 shrink-0 flex items-center justify-center px-4 sm:px-8 z-40
             ${getHeaderClasses(settings.theme).replace('border-b', 'border-t')}
          `}>
             <div className="flex items-center gap-3 sm:gap-6 bg-current bg-opacity-5 rounded-full px-4 py-1.5 shadow-sm border border-current border-opacity-5">
               <button 
                 onClick={() => handlePageChange(currentPage - 1)}
                 disabled={currentPage <= 1}
                 className="p-2 rounded-full hover:bg-current hover:bg-opacity-10 disabled:opacity-20 transition-all active:scale-90"
                 title="上一页"
               >
                 <ChevronLeft className="w-5 h-5" />
               </button>

               <div className="flex items-center gap-1 min-w-[80px] justify-center">
                 <form onSubmit={handleJumpSubmit} className="relative">
                   <input 
                    type="text" 
                    className="w-10 bg-transparent text-center text-lg font-bold outline-none font-mono border-b border-transparent focus:border-current transition-colors"
                    value={jumpInput || currentPage}
                    onChange={(e) => setJumpInput(e.target.value)}
                    onFocus={() => setJumpInput('')}
                    onBlur={() => setJumpInput('')}
                   />
                 </form>
                 <span className="opacity-30 text-lg font-light">/</span>
                 <span className="text-sm font-mono opacity-60 mt-0.5">{pages.length}</span>
               </div>

               <button 
                 onClick={() => handlePageChange(currentPage + 1)}
                 disabled={currentPage >= pages.length}
                 className="p-2 rounded-full hover:bg-current hover:bg-opacity-10 disabled:opacity-20 transition-all active:scale-90"
                 title="下一页"
               >
                 <ChevronRight className="w-5 h-5" />
               </button>
             </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Reader;