export interface Book {
  id: string;
  title: string;
  author: string;
  content: string; // Storing content in memory for this demo.
  format: 'txt' | 'md' | 'json' | 'pdf';
  coverUrl?: string;
  tags: string[];
  addedAt: number;
  description?: string;
  progress?: number; // 0 to 100 representing percentage read
}

export type ViewMode = 'library' | 'reader' | 'converter';

export type ThemeName = 'light' | 'sepia' | 'dark' | 'slate' | 'green';

export interface ReaderSettings {
  theme: ThemeName;
  fontSize: number;
  fontFamily: 'serif' | 'sans' | 'mono' | 'art';
  lineHeight: number;
  maxWidth: number;
}

export interface ConversionTask {
  id: string;
  bookId: string;
  type: 'summarize' | 'translate' | 'modernize' | 'screenplay';
  status: 'idle' | 'processing' | 'completed' | 'failed';
  result?: string;
  targetLanguage?: string;
}