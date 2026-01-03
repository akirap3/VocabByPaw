import React from 'react';
import { VocabItem } from '../types';
import { Eraser } from 'lucide-react';

interface VocabListProps {
  items: VocabItem[];
  onSelect: (item: VocabItem) => void;
  selectedId: number | null;
  layoutId?: number;
  gridAssignments?: number[];
  activeCellIndex?: number;
  onUnselectAll?: () => void;
}

export const VocabList: React.FC<VocabListProps> = ({ 
  items, 
  onSelect, 
  selectedId, 
  layoutId = 0, 
  gridAssignments = [],
  activeCellIndex = 0,
  onUnselectAll
}) => {
  return (
    <div className="w-full bg-white border-r border-orange-200 overflow-y-auto h-full flex flex-col">
       {/* Header Area with Unselect Option */}
      <div className="p-4 pb-2">
        <div className="flex justify-between items-center mb-2 md:mb-4 gap-2">
            <h2 className="text-lg md:text-xl font-bold text-orange-600 font-serif whitespace-nowrap">Results ({items.length})</h2>
            {layoutId > 0 && onUnselectAll && (
                <button 
                    onClick={onUnselectAll}
                    className="text-xs flex items-center gap-1 bg-gray-100 hover:bg-gray-200 text-gray-600 px-2 py-1.5 rounded transition-colors shrink-0"
                    title="Clear all grid selections"
                >
                    <Eraser size={14} /> Unselect
                </button>
            )}
        </div>
      </div>
      
      <div className="space-y-2 p-4 pt-0">
        {items.length === 0 ? (
            <p className="text-gray-400 text-center mt-10 italic">No words generated yet. Use the panel to start.</p>
        ) : (
            items.map((item, index) => {
                // Logic for highlighting
                const assignedIndex = gridAssignments.indexOf(item.id);
                const isInGrid = assignedIndex !== -1 && layoutId > 0;
                
                // Is this word assigned to the cell currently being edited?
                const isActiveTarget = isInGrid && assignedIndex === activeCellIndex;

                let borderClass = 'border-gray-100 hover:bg-orange-50 hover:border-orange-200';
                let bgClass = 'bg-gray-50 text-gray-700';
                
                if (isActiveTarget) {
                    // Distinct Blue style for the active cell connection
                    borderClass = 'border-blue-500 ring-1 ring-blue-500';
                    bgClass = 'bg-blue-50 text-blue-900';
                } else if (selectedId === item.id && layoutId === 0) {
                    // Standard selection in single mode
                    borderClass = 'border-orange-400';
                    bgClass = 'bg-orange-100 text-orange-800';
                } else if (isInGrid) {
                    // In grid, but not active cell
                    borderClass = 'border-orange-200';
                    bgClass = 'bg-white text-gray-600';
                }

                return (
                    <button
                        key={item.id}
                        onClick={() => onSelect(item)}
                        className={`w-full text-left p-3 rounded-lg transition-all duration-200 border-2 relative ${bgClass} ${borderClass}`}
                    >
                        <div className="flex justify-between items-center pr-6">
                             <span className="font-bold text-lg">{index + 1}. {item.word}</span>
                        </div>
                        <p className="text-sm opacity-80 chinese-text truncate">{item.definition}</p>

                        {/* Circular Number Badge for Grid Layout */}
                        {isInGrid && (
                            <div className={`absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shadow-sm border border-white transition-colors
                                ${isActiveTarget ? 'bg-blue-500 text-white' : 'bg-orange-500 text-white'}
                            `}>
                                {assignedIndex + 1}
                            </div>
                        )}
                    </button>
                )
            })
        )}
      </div>
    </div>
  );
};