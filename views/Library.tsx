import React, { useRef, useState } from 'react';
import { Book } from '../types';
import { Plus, Search, Upload, BookOpen, Trash2, Sparkles, Copy, Check, AlertCircle } from 'lucide-react';
import { generateBookMetadata, generateCoverImage } from '../services/gemini';
import { extractTextFromPdf } from '../services/pdf';
import { extractTextFromEpub, extractTextFromMobi } from '../services/ebookParser';

interface LibraryProps {
  books: Book[];
  isLoading?: boolean;
  onOpenBook: (book: Book) => void;
  onAddBook: (book: Book) => void;
  onDeleteBook: (id: string) => void;
  onGoToConverter: (book: Book) => void;
}

const MAX_FILE_SIZE = 50 * 1024 * 1024; // Increased to 50MB for EPUB/MOBI

const BookSkeleton = () => (
  <div className="flex flex-col animate-pulse">
    <div className="aspect-[2/3] bg-gray-200 rounded-lg mb-4 w-full border border-gray-100"></div>
    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
    <div className="h-3 bg-gray-200 rounded w-1/2 mb-3"></div>
    <div className="flex gap-2">
      <div className="h-5 w-12 bg-gray-200 rounded"></div>
      <div className="h-5 w-10 bg-gray-200 rounded"></div>
    </div>
  </div>
);

// Helper function to handle text encoding (GBK vs UTF-8)
const readTextFile = async (file: File): Promise<string> => {
  const buffer = await file.arrayBuffer();
  
  // 1. Try decoding as UTF-8 first
  const utf8Decoder = new TextDecoder('utf-8', { fatal: false });
  const utf8Text = utf8Decoder.decode(buffer);

  // 2. Check for "replacement characters" (). If there are too many, it's likely not UTF-8.
  // A heuristic threshold of 1% replacement characters usually indicates wrong encoding for Chinese text.
  const replacementCount = (utf8Text.match(/\uFFFD/g) || []).length;
  
  if (replacementCount > 0 && replacementCount > utf8Text.length * 0.01) {
    try {
      console.log("Detected potential encoding issue, attempting GB18030/GBK decode...");
      // GB18030 covers GBK and GB2312
      const gbkDecoder = new TextDecoder('gb18030');
      const gbkText = gbkDecoder.decode(buffer);
      return gbkText;
    } catch (e) {
      console.warn("GBK decoding failed, falling back to UTF-8", e);
    }
  }

  return utf8Text;
};

const Library: React.FC<LibraryProps> = ({ books, isLoading = false, onOpenBook, onAddBook, onDeleteBook, onGoToConverter }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      await processFile(files[0]);
    }
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const processFile = async (file: File) => {
    // 1. Check File Size
    if (file.size > MAX_FILE_SIZE) {
      alert(`文件太大 (${(file.size / 1024 / 1024).toFixed(2)}MB)。请上传小于 50MB 的文件。`);
      return;
    }

    setIsUploading(true);
    try {
      let text = '';
      let format: Book['format'] = 'txt';
      const fileName = file.name.toLowerCase();

      // 2. Handle specific formats
      if (file.type === 'application/pdf' || fileName.endsWith('.pdf')) {
        text = await extractTextFromPdf(file);
        format = 'pdf';
      } else if (fileName.endsWith('.epub')) {
        text = await extractTextFromEpub(file);
        format = 'epub';
      } else if (fileName.endsWith('.mobi')) {
        text = await extractTextFromMobi(file);
        format = 'mobi';
      } else {
        // Intelligent text reading (handles GBK/UTF-8)
        text = await readTextFile(file);
        format = fileName.endsWith('.md') ? 'md' : 'txt';
      }

      if (!text.trim()) {
        throw new Error("文件内容为空或无法解析");
      }

      // 3. Metadata Generation
      // Note: We only send a snippet to AI, not the whole book
      const metadataSnippet = text.substring(0, 3000); 
      const metadata = await generateBookMetadata(metadataSnippet);
      
      // Basic AI Cover Generation
      let coverUrl = `https://placehold.co/300x450/e2e8f0/475569?text=${metadata.title.substring(0,10)}`;
      
      try {
        const generatedCover = await generateCoverImage(metadata.title, metadata.author, metadata.description);
        if (generatedCover) coverUrl = generatedCover;
      } catch (e) {
        console.warn("Cover generation skipped", e);
      }

      const newBook: Book = {
        id: crypto.randomUUID(),
        title: metadata.title,
        author: metadata.author,
        description: metadata.description,
        tags: metadata.tags,
        content: text,
        format: format, 
        coverUrl: coverUrl,
        addedAt: Date.now(),
        progress: 0,
      };
      
      onAddBook(newBook);
    } catch (error: any) {
      console.error("Upload failed", error);
      alert(`上传失败: ${error.message || "未知错误"}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleCopy = async (e: React.MouseEvent, book: Book) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(book.content);
      setCopiedId(book.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error("Failed to copy", err);
    }
  };

  const filteredBooks = books.filter(b => 
    b.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    b.author.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div 
      className="h-full flex flex-col bg-[#f8fafc]"
      onDragEnter={handleDrag}
    >
      {/* Header */}
      <header className="bg-white/80 backdrop-blur border-b border-gray-200 px-8 py-5 flex items-center justify-between sticky top-0 z-30 shadow-sm transition-all">
        <h1 className="text-2xl font-serif font-bold text-gray-800 flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-200 text-white">
            <BookOpen className="w-6 h-6" />
          </div>
          <div className="flex flex-col">
            <span className="leading-none">星云</span>
            <span className="text-xs text-gray-400 font-sans font-medium tracking-widest uppercase mt-1">Reader</span>
          </div>
        </h1>

        <div className="flex items-center gap-4 flex-1 justify-end">
          <div className="relative w-full max-w-md hidden md:block group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 group-focus-within:text-indigo-500 transition-colors" />
            <input 
              type="text" 
              placeholder="搜索标题、作者、标签..." 
              className="w-full pl-10 pr-4 py-2.5 bg-gray-100 border-2 border-transparent rounded-xl text-sm focus:border-indigo-100 focus:bg-white focus:ring-4 focus:ring-indigo-50 transition-all outline-none"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="flex items-center gap-2 bg-gray-900 hover:bg-black text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-70 disabled:translate-y-0 disabled:shadow-none"
          >
            {isUploading ? (
              <span className="animate-pulse flex items-center gap-2">
                 <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                 解析中...
              </span>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                <span>导入书籍</span>
              </>
            )}
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept=".txt,.md,.json,.pdf,.epub,.mobi" 
            onChange={handleFileUpload} 
          />
        </div>
      </header>

      {/* Main Grid */}
      <main 
        className="flex-1 overflow-y-auto p-8 relative"
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        {dragActive && (
          <div className="absolute inset-0 bg-indigo-50/90 border-4 border-indigo-400 border-dashed z-50 flex items-center justify-center rounded-2xl m-6 animate-in fade-in zoom-in duration-200">
            <div className="text-center text-indigo-700 bg-white p-8 rounded-2xl shadow-xl">
              <Upload className="w-16 h-16 mx-auto mb-4 text-indigo-500" />
              <p className="text-xl font-bold">释放以添加书籍</p>
              <p className="text-sm opacity-70 mt-2">支持 PDF, EPUB, MOBI, TXT, MD</p>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-8 pb-10">
            {Array.from({ length: 10 }).map((_, i) => (
              <BookSkeleton key={i} />
            ))}
          </div>
        ) : books.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-400">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6">
              <BookOpen className="w-10 h-10 opacity-30" />
            </div>
            <p className="text-xl font-medium text-gray-600">书库空空如也</p>
            <p className="text-sm mt-2">点击右上角按钮导入您的第一本书</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-8 pb-10">
            {filteredBooks.map(book => (
              <div 
                key={book.id} 
                className="group relative flex flex-col"
              >
                {/* Book Cover */}
                <div 
                  className="aspect-[2/3] relative overflow-hidden rounded-lg bg-white shadow-md group-hover:shadow-2xl group-hover:-translate-y-2 transition-all duration-300 cursor-pointer border border-gray-100"
                  onClick={() => onOpenBook(book)}
                >
                  {/* Format Badge */}
                  <div className="absolute top-2 right-2 z-20">
                     <span className={`bg-black/60 backdrop-blur-sm text-white text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider border border-white/10 ${book.format === 'epub' ? 'bg-green-600/80' : book.format === 'pdf' ? 'bg-red-600/80' : ''}`}>
                       {book.format}
                     </span>
                  </div>

                  {book.coverUrl ? (
                    <img src={book.coverUrl} alt={book.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400 bg-gray-50 flex-col p-4 border-2 border-dashed border-gray-200">
                       <BookOpen className="w-8 h-8 mb-2 opacity-20" />
                       <span className="text-xs font-bold uppercase tracking-widest text-center line-clamp-2">{book.title}</span>
                    </div>
                  )}
                  
                  {/* Progress Bar (Visible on Cover) */}
                  {book.progress !== undefined && book.progress > 0 && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200/50 backdrop-blur-sm z-10">
                      <div 
                        className="h-full bg-indigo-500 shadow-[0_0_4px_rgba(99,102,241,0.6)]" 
                        style={{ width: `${book.progress}%` }} 
                      />
                    </div>
                  )}

                  {/* Hover Overlay Actions */}
                  <div className="absolute inset-0 bg-gray-900/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center gap-3 backdrop-blur-[2px] z-20">
                    <div className="flex gap-2">
                      <button 
                        onClick={(e) => { e.stopPropagation(); onOpenBook(book); }}
                        className="w-10 h-10 bg-white rounded-full text-gray-900 hover:bg-indigo-500 hover:text-white flex items-center justify-center shadow-lg transition-all hover:scale-110"
                        title={book.progress && book.progress > 0 ? `继续阅读 (${Math.round(book.progress)}%)` : "开始阅读"}
                      >
                        <BookOpen className="w-5 h-5" />
                      </button>
                       <button 
                        onClick={(e) => handleCopy(e, book)}
                        className="w-10 h-10 bg-white rounded-full text-gray-700 hover:bg-green-500 hover:text-white flex items-center justify-center shadow-lg transition-all hover:scale-110"
                        title={copiedId === book.id ? "已复制" : "复制全文"}
                      >
                        {copiedId === book.id ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                      </button>
                    </div>
                    
                    <div className="flex gap-2">
                      <button 
                        onClick={(e) => { e.stopPropagation(); onGoToConverter(book); }}
                        className="w-10 h-10 bg-white rounded-full text-indigo-600 hover:bg-purple-500 hover:text-white flex items-center justify-center shadow-lg transition-all hover:scale-110"
                        title="AI 转换"
                      >
                        <Sparkles className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); onDeleteBook(book.id); }}
                        className="w-10 h-10 bg-white rounded-full text-red-600 hover:bg-red-500 hover:text-white flex items-center justify-center shadow-lg transition-all hover:scale-110"
                        title="删除书籍"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Book Info */}
                <div className="mt-4 px-1">
                  <h3 className="font-bold text-gray-800 truncate leading-tight group-hover:text-indigo-600 transition-colors" title={book.title}>{book.title}</h3>
                  <div className="flex justify-between items-center mt-1">
                    <p className="text-sm text-gray-500 truncate font-serif flex-1">{book.author}</p>
                    {book.progress !== undefined && book.progress > 0 && (
                      <span className="text-[10px] font-mono text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded ml-2">
                        {Math.round(book.progress)}%
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2.5 h-6 overflow-hidden mask-linear">
                    {book.tags.slice(0, 3).map(tag => (
                      <span key={tag} className="text-[10px] uppercase font-bold tracking-wider bg-white border border-gray-200 text-gray-500 px-2 py-0.5 rounded shadow-sm whitespace-nowrap">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Library;