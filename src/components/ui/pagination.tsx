'use client';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  // Erzeuge Seitenzahlen-Array
  const pages: number[] = [];
  
  const pageSpread = 2; // Number of pages to show before and after current page
  let startPage = Math.max(1, currentPage - pageSpread);
  const endPage = Math.min(totalPages, startPage + pageSpread * 2);
  
  // Adjust startPage to maintain consistent number of pagination buttons
  startPage = Math.max(1, endPage - pageSpread * 2);
  
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