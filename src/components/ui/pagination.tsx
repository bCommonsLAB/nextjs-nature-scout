'use client';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  // Erzeuge Seitenzahlen-Array
  const pages: number[] = [];
  const maxVisiblePages = 5;
  
  let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
  let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
  
  if (endPage - startPage + 1 < maxVisiblePages) {
    startPage = Math.max(1, endPage - maxVisiblePages + 1);
  }
  
  for (let i = startPage; i <= endPage; i++) {
    pages.push(i);
  }
  
  return (
    <div className="flex justify-center">
      <nav className="inline-flex">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-3 py-1 rounded-l-md border border-gray-300 bg-white text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Zurück
        </button>
        
        {startPage > 1 && (
          <>
            <button
              onClick={() => onPageChange(1)}
              className="px-3 py-1 border-t border-b border-l border-gray-300 bg-white text-gray-500 hover:bg-gray-50"
            >
              1
            </button>
            {startPage > 2 && (
              <span className="px-3 py-1 border-t border-b border-l border-gray-300 bg-white text-gray-500">
                ...
              </span>
            )}
          </>
        )}
        
        {pages.map((page) => (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={`px-3 py-1 border-t border-b border-l border-gray-300 ${
              page === currentPage
                ? 'bg-blue-500 text-white hover:bg-blue-600'
                : 'bg-white text-gray-500 hover:bg-gray-50'
            }`}
          >
            {page}
          </button>
        ))}
        
        {endPage < totalPages && (
          <>
            {endPage < totalPages - 1 && (
              <span className="px-3 py-1 border-t border-b border-l border-gray-300 bg-white text-gray-500">
                ...
              </span>
            )}
            <button
              onClick={() => onPageChange(totalPages)}
              className="px-3 py-1 border-t border-b border-l border-gray-300 bg-white text-gray-500 hover:bg-gray-50"
            >
              {totalPages}
            </button>
          </>
        )}
        
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="px-3 py-1 rounded-r-md border border-gray-300 bg-white text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Weiter
        </button>
      </nav>
    </div>
  );
} 