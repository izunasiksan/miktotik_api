import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, X } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Komponen SearchableSelect kustom menggunakan Tailwind CSS
 * @param {Array} options - Array objek { value, label }
 * @param {string} value - Nilai yang terpilih
 * @param {function} onChange - Callback saat nilai berubah
 * @param {string} placeholder - Placeholder saat kosong
 * @param {string} className - Kelas tambahan untuk container
 */
const SearchableSelect = ({ 
  options = [], 
  value = '', 
  onChange, 
  placeholder = 'Pilih...', 
  className = '' 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef(null);

  const selectedOption = options.find(opt => opt.value === value);

  const filteredOptions = options.filter(opt => 
    opt.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Menutup dropdown saat klik di luar
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (optionValue) => {
    onChange(optionValue);
    setIsOpen(false);
    setSearchTerm('');
  };

  return (
    <div className={twMerge("relative w-full min-w-[200px]", className)} ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => {
          const next = !isOpen;
          setIsOpen(next);
          if (!next) setSearchTerm('');
        }}
        className={clsx(
          "w-full flex items-center justify-between px-3 py-2 text-sm bg-blue-50 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all",
          isOpen ? "ring-2 ring-blue-500 border-transparent" : ""
        )}
      >
        <span className={clsx("truncate font-semibold", selectedOption ? "text-blue-700" : "text-blue-400")}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown className={clsx("w-4 h-4 text-blue-500 transition-transform duration-200", isOpen ? "rotate-180" : "")} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl animate-in fade-in zoom-in-95 duration-100 origin-top">
          {/* Search Input */}
          <div className="sticky top-0 p-2 bg-white border-b border-gray-100 rounded-t-lg">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                autoFocus
                type="text"
                className="w-full pl-8 pr-8 py-1.5 text-sm border-gray-200 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="Cari router..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 hover:bg-gray-100 rounded-full"
                >
                  <X className="w-3.5 h-3.5 text-gray-400" />
                </button>
              )}
            </div>
          </div>

          {/* Options List */}
          <div className="max-h-60 overflow-y-auto py-1">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleSelect(opt.value)}
                  className={clsx(
                    "w-full text-left px-3 py-2 text-sm transition-colors",
                    opt.value === value 
                      ? "bg-blue-600 text-white font-medium" 
                      : "text-gray-700 hover:bg-blue-50"
                  )}
                >
                  {opt.label}
                </button>
              ))
            ) : (
              <div className="px-3 py-4 text-sm text-center text-gray-500 italic">
                Router tidak ditemukan
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchableSelect;
