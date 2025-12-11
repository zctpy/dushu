import React, { useState } from 'react';
import { Book, ConversionTask } from '../types';
import { ArrowLeft, Wand2, FileText, Globe, Drama, History, Download, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { processBookContent } from '../services/gemini';

interface ConverterProps {
  book: Book;
  onClose: () => void;
}

const Converter: React.FC<ConverterProps> = ({ book, onClose }) => {
  const [activeTask, setActiveTask] = useState<ConversionTask['type']>('summarize');
  const [status, setStatus] = useState<ConversionTask['status']>('idle');
  const [result, setResult] = useState<string | undefined>(undefined);
  const [targetLang, setTargetLang] = useState('英语');

  const handleProcess = async () => {
    setStatus('processing');
    setResult(undefined);
    try {
      const output = await processBookContent(book.content, activeTask, targetLang);
      setResult(output);
      setStatus('completed');
    } catch (error) {
      console.error(error);
      setStatus('failed');
    }
  };

  const downloadResult = () => {
    if (!result) return;
    const blob = new Blob([result], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${book.title}-${activeTask}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <Wand2 className="w-5 h-5 text-purple-600" />
              智能转换实验室
            </h1>
            <p className="text-sm text-gray-500">正在对 <span className="font-medium text-gray-800">{book.title}</span> 进行 AI 增强处理</p>
          </div>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        {/* Sidebar Controls */}
        <div className="w-80 bg-white border-r p-6 flex flex-col gap-6 overflow-y-auto">
          <div>
            <h3 className="text-xs font-bold text-gray-400 uppercase mb-4 tracking-wider">操作选项</h3>
            <div className="space-y-2">
              <button 
                onClick={() => setActiveTask('summarize')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all ${activeTask === 'summarize' ? 'border-purple-500 bg-purple-50 text-purple-700 shadow-sm' : 'border-gray-200 hover:border-gray-300 text-gray-700'}`}
              >
                <div className={`p-2 rounded-lg ${activeTask === 'summarize' ? 'bg-purple-100' : 'bg-gray-100'}`}>
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-medium">智能总结</div>
                  <div className="text-xs opacity-70">生成内容概要</div>
                </div>
              </button>

              <button 
                onClick={() => setActiveTask('translate')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all ${activeTask === 'translate' ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm' : 'border-gray-200 hover:border-gray-300 text-gray-700'}`}
              >
                 <div className={`p-2 rounded-lg ${activeTask === 'translate' ? 'bg-blue-100' : 'bg-gray-100'}`}>
                  <Globe className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-medium">翻译</div>
                  <div className="text-xs opacity-70">转换语言</div>
                </div>
              </button>

              <button 
                onClick={() => setActiveTask('modernize')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all ${activeTask === 'modernize' ? 'border-amber-500 bg-amber-50 text-amber-700 shadow-sm' : 'border-gray-200 hover:border-gray-300 text-gray-700'}`}
              >
                 <div className={`p-2 rounded-lg ${activeTask === 'modernize' ? 'bg-amber-100' : 'bg-gray-100'}`}>
                  <History className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-medium">白话文重写</div>
                  <div className="text-xs opacity-70">使古文通俗易懂</div>
                </div>
              </button>

               <button 
                onClick={() => setActiveTask('screenplay')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all ${activeTask === 'screenplay' ? 'border-pink-500 bg-pink-50 text-pink-700 shadow-sm' : 'border-gray-200 hover:border-gray-300 text-gray-700'}`}
              >
                 <div className={`p-2 rounded-lg ${activeTask === 'screenplay' ? 'bg-pink-100' : 'bg-gray-100'}`}>
                  <Drama className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-medium">剧本改编</div>
                  <div className="text-xs opacity-70">转换为剧本格式</div>
                </div>
              </button>
            </div>
          </div>

          {/* Options */}
          {activeTask === 'translate' && (
             <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-2">目标语言</label>
              <select 
                className="w-full p-2 border border-gray-300 rounded-lg bg-white"
                value={targetLang}
                onChange={(e) => setTargetLang(e.target.value)}
              >
                <option>英语</option>
                <option>日语</option>
                <option>韩语</option>
                <option>法语</option>
                <option>德语</option>
                <option>俄语</option>
                <option>中文</option>
              </select>
             </div>
          )}

          <div className="mt-auto">
            <button 
              onClick={handleProcess}
              disabled={status === 'processing'}
              className="w-full bg-gray-900 text-white py-3 rounded-xl font-medium hover:bg-black transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {status === 'processing' ? <Loader2 className="animate-spin w-5 h-5" /> : <Wand2 className="w-5 h-5" />}
              <span>开始处理</span>
            </button>
          </div>
        </div>

        {/* Preview Area */}
        <div className="flex-1 bg-gray-100 p-8 overflow-y-auto">
          <div className="max-w-3xl mx-auto bg-white min-h-full rounded-xl shadow-sm border border-gray-200 flex flex-col">
             {status === 'idle' && (
               <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-8 text-center">
                 <Wand2 className="w-12 h-12 mb-4 opacity-20" />
                 <p className="max-w-sm">请在左侧选择一项操作，利用 Gemini AI 对您的书籍内容进行转换。</p>
               </div>
             )}
             
             {status === 'processing' && (
               <div className="flex-1 flex flex-col items-center justify-center p-8">
                  <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-6"></div>
                  <h3 className="text-lg font-medium text-gray-900">Gemini 正在思考中...</h3>
                  <p className="text-gray-500">这可能需要几秒钟。</p>
               </div>
             )}

             {status === 'completed' && result && (
               <>
                <div className="p-4 border-b bg-gray-50 flex justify-between items-center rounded-t-xl">
                  <span className="text-xs font-bold text-green-600 uppercase tracking-wide bg-green-100 px-2 py-1 rounded">已完成</span>
                  <button onClick={downloadResult} className="text-gray-600 hover:text-gray-900 flex items-center gap-1 text-sm font-medium">
                    <Download className="w-4 h-4" /> 导出结果
                  </button>
                </div>
                <div className="p-8 prose prose-indigo max-w-none">
                  <ReactMarkdown>{result}</ReactMarkdown>
                </div>
               </>
             )}

            {status === 'failed' && (
               <div className="flex-1 flex flex-col items-center justify-center text-red-500 p-8">
                 <p>出错了。请检查您的 API Key 并重试。</p>
               </div>
             )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Converter;
