import React, { useState, useEffect } from 'react';
import Library from './views/Library';
import Reader from './views/Reader';
import Converter from './views/Converter';
import { Book, ViewMode } from './types';

const App: React.FC = () => {
  const [view, setView] = useState<ViewMode>('library');
  const [activeBook, setActiveBook] = useState<Book | null>(null);
  const [books, setBooks] = useState<Book[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Simulate loading data on mount (removed Time Machine sample)
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  const handleAddBook = (book: Book) => {
    setBooks(prev => [...prev, book]);
  };

  const handleDeleteBook = (id: string) => {
    setBooks(prev => prev.filter(b => b.id !== id));
    if (activeBook?.id === id) {
      setActiveBook(null);
      setView('library');
    }
  };

  const handleOpenBook = (book: Book) => {
    setActiveBook(book);
    setView('reader');
  };

  const handleUpdateProgress = (bookId: string, progress: number) => {
    setBooks(prev => prev.map(b => b.id === bookId ? { ...b, progress } : b));
    if (activeBook?.id === bookId) {
      setActiveBook(prev => prev ? { ...prev, progress } : null);
    }
  };

  const handleGoToConverter = (book: Book) => {
    setActiveBook(book);
    setView('converter');
  };

  const handleCloseView = () => {
    setActiveBook(null);
    setView('library');
  };

  return (
    <div className="h-screen w-full bg-gray-50 text-gray-900 font-sans overflow-hidden">
      {view === 'library' && (
        <Library 
          books={books} 
          isLoading={isLoading}
          onAddBook={handleAddBook} 
          onOpenBook={handleOpenBook}
          onDeleteBook={handleDeleteBook}
          onGoToConverter={handleGoToConverter}
        />
      )}

      {view === 'reader' && activeBook && (
        <Reader 
          book={activeBook} 
          onClose={handleCloseView} 
          onUpdateProgress={handleUpdateProgress}
        />
      )}

      {view === 'converter' && activeBook && (
        <Converter 
          book={activeBook} 
          onClose={handleCloseView} 
        />
      )}
    </div>
  );
};

export default App;