import React, { useState, useEffect, useRef } from 'react';
import { VocabList } from './components/VocabList';
import { Editor } from './components/Editor';
import { InputPanel } from './components/InputPanel';
import { VocabItem, VocabGenerationParams } from './types';
import { Sparkles, Menu, X, Layout, Settings, Cat, PawPrint, GripVertical } from 'lucide-react';
import { generateVocabList } from './services/geminiService';

const App: React.FC = () => {
  // Initialize with empty list as requested
  const [vocabItems, setVocabItems] = useState<VocabItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<VocabItem | null>(null);
  
  // Layout & Grid State (Lifted from Editor)
  const [layoutId, setLayoutId] = useState(0);
  // gridAssignments stores the ID of the word assigned to each cell index
  const [gridAssignments, setGridAssignments] = useState<number[]>([]);
  // Track which cell is currently "Active" (highlighted/selected by user)
  const [activeCellIndex, setActiveCellIndex] = useState(0);

  // Mobile drawer state
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Desktop Input Panel visibility (Drawer functionality)
  const [showInputPanel, setShowInputPanel] = useState(true);

  const [isGenerating, setIsGenerating] = useState(false);
  const [viewMode, setViewMode] = useState<'input' | 'list'>('list'); // For mobile views

  // Resizing State
  // Set to minimum viable widths for initial load on web/tablet
  const [inputPanelWidth, setInputPanelWidth] = useState(250);
  const [resultsPanelWidth, setResultsPanelWidth] = useState(200);
  const [isResizing, setIsResizing] = useState(false);
  
  // Refs for drag logic (avoiding stale closures in event listeners)
  const resizingState = useRef<'input' | 'results' | null>(null);
  const widthsRef = useRef({ input: 250, results: 200 });
  const showInputPanelRef = useRef(showInputPanel);

  // Sync refs with state
  useEffect(() => {
      widthsRef.current = { input: inputPanelWidth, results: resultsPanelWidth };
  }, [inputPanelWidth, resultsPanelWidth]);

  useEffect(() => {
      showInputPanelRef.current = showInputPanel;
  }, [showInputPanel]);

  // Global Drag Listeners
  useEffect(() => {
      const handleMouseMove = (e: MouseEvent) => {
          if (!resizingState.current) return;
          
          e.preventDefault();
          if (!isResizing) setIsResizing(true);

          if (resizingState.current === 'input') {
              // Clamp between 250px and 600px
              const newWidth = Math.max(250, Math.min(600, e.clientX));
              setInputPanelWidth(newWidth);
              document.body.style.cursor = 'col-resize';
          } else if (resizingState.current === 'results') {
              const inputWidth = showInputPanelRef.current ? widthsRef.current.input : 0;
              // Calculate width relative to the input panel (or screen edge if input hidden)
              const newWidth = Math.max(200, Math.min(600, e.clientX - inputWidth));
              setResultsPanelWidth(newWidth);
              document.body.style.cursor = 'col-resize';
          }
      };

      const handleMouseUp = () => {
          if (resizingState.current) {
              resizingState.current = null;
              setIsResizing(false);
              document.body.style.cursor = 'default';
          }
      };

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
          window.removeEventListener('mousemove', handleMouseMove);
          window.removeEventListener('mouseup', handleMouseUp);
      };
  }, [isResizing]);


  const handleGenerateList = async (params: VocabGenerationParams) => {
      setIsGenerating(true);
      try {
          const newItems = await generateVocabList(params);
          setVocabItems(newItems);
          if (newItems.length > 0) {
              setSelectedItem(newItems[0]);
              // Reset grid
              setGridAssignments([newItems[0].id]);
              setLayoutId(0);
              setActiveCellIndex(0);
              
              // On mobile/tablet, switch to list view automatically
              // Increased threshold to 1024px to include tablets in "mobile" drawer behavior
              if (window.innerWidth < 1024) {
                  setViewMode('list');
                  setIsSidebarOpen(true);
              }
          }
      } catch (error) {
          alert("Failed to generate vocabulary. Please check your inputs and try again.");
      } finally {
          setIsGenerating(false);
      }
  };

  // Logic: Always fill the grid with the first 'count' words from the vocabulary list
  // regardless of previous state. This ensures a clean reset on layout change or re-click.
  const handleLayoutChange = (id: number, count: number) => {
      setLayoutId(id);
      setActiveCellIndex(0); // Reset active selection to first cell
      
      const newAssignments: number[] = [];
      
      for (let i = 0; i < count; i++) {
          if (i < vocabItems.length) {
              newAssignments.push(vocabItems[i].id);
          } else {
              newAssignments.push(0); // Empty slot if not enough words
          }
      }
      
      setGridAssignments(newAssignments);

      // If switching to Single view (id === 0), also update selectedItem to the first word
      // to maintain consistency with the grid assignment.
      if (id === 0 && vocabItems.length > 0) {
          setSelectedItem(vocabItems[0]);
      }
  };

  const handleUnselectAll = () => {
      // Keep the array length but clear the IDs (set to 0)
      setGridAssignments(prev => prev.map(() => 0));
  };

  const handleGridUpdate = (newAssignments: number[]) => {
      setGridAssignments(newAssignments);
  };

  const handleVocabSelect = (item: VocabItem) => {
      setSelectedItem(item);

      if (layoutId > 0) {
          // In multi-layout, assign the clicked word to the ACTIVE cell
          const newAssignments = [...gridAssignments];
          // Ensure array is large enough (just in case)
          while (newAssignments.length <= activeCellIndex) newAssignments.push(0);
          
          newAssignments[activeCellIndex] = item.id;
          setGridAssignments(newAssignments);
      } else {
          // In single mode, typical behavior
          setGridAssignments([item.id]);
      }
      
      setIsSidebarOpen(false);
  };

  return (
    <div 
        className="flex flex-col h-screen overflow-hidden bg-orange-50"
        style={{
            '--input-width': `${inputPanelWidth}px`,
            '--results-width': `${resultsPanelWidth}px`
        } as React.CSSProperties}
    >
      
      {/* Header */}
      <header className="bg-white border-b border-orange-200 p-2 md:p-4 flex items-center justify-between shadow-sm z-30 relative shrink-0">
        <div className="flex items-center gap-2 md:gap-4">
            <div className="flex items-center gap-2">
                <div className="bg-orange-500 text-white p-1.5 md:p-2 rounded-lg">
                    <Sparkles size={20} className="md:w-6 md:h-6" />
                </div>
                <div>
                    <h1 className="text-lg md:text-2xl font-bold text-gray-800 tracking-tight leading-none">Sir Isaac's</h1>
                    <p className="text-[10px] md:text-xs text-gray-500">Vocab Studio</p>
                </div>
            </div>

            {/* Desktop Cat Toggle for Input Panel */}
            <div className="hidden lg:flex items-center gap-3">
                 <span className="text-xs font-bold text-orange-900 uppercase tracking-wider w-24 text-right">
                    {showInputPanel ? "Studio Open" : "Nap Mode"}
                 </span>
                <button 
                    onClick={() => setShowInputPanel(!showInputPanel)}
                    className={`relative w-20 h-10 rounded-full shadow-inner border-2 focus:outline-none transition-all duration-300
                    ${showInputPanel ? 'bg-orange-100 border-orange-300' : 'bg-gray-800 border-gray-900'}
                    `}
                    title={showInputPanel ? "Hide Setup" : "Show Setup"}
                >
                    {/* Background Faces (Mutually Exclusive) */}
                    <div className="absolute inset-0 flex items-center justify-between px-2 pointer-events-none">
                        {/* White Cat (Visible when Open/True - positioned Left relative to thumb on Right) */}
                        <div className={`transition-all duration-300 transform ${showInputPanel ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`}>
                             <span className="text-2xl filter drop-shadow-sm">🐱</span>
                        </div>
                        
                        {/* Cute White Cat Face (Visible when Closed/False - positioned Right relative to thumb on Left) */}
                        <div className={`transition-all duration-300 transform ${!showInputPanel ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`}>
                             <span className="text-2xl">🐱</span>
                        </div>
                    </div>
                    
                    {/* Sliding Paw Thumb */}
                    <div 
                        className={`absolute top-1/2 -translate-y-1/2 transition-transform duration-300 ease-in-out
                        ${showInputPanel ? 'translate-x-11' : 'translate-x-1'}
                        `}
                    >
                        <div className="w-8 h-8 flex items-center justify-center bg-white rounded-full shadow-md border border-gray-200">
                             <PawPrint size={18} fill="currentColor" className="text-orange-900" />
                        </div>
                    </div>
                </button>
            </div>
        </div>
        
        {/* Mobile/Tablet View Toggles - Visible below lg (1024px) */}
        <div className="flex gap-2 lg:hidden">
             <button 
                className={`p-2 rounded ${viewMode === 'input' ? 'bg-orange-100 text-orange-800' : 'bg-gray-100'}`}
                onClick={() => {
                    setIsSidebarOpen(true);
                    setViewMode('input');
                }}
            >
                <Settings size={20} />
            </button>
             <button 
                className={`p-2 rounded ${viewMode === 'list' ? 'bg-orange-100 text-orange-800' : 'bg-gray-100'}`}
                onClick={() => {
                    setIsSidebarOpen(true);
                    setViewMode('list');
                }}
            >
                <Menu size={20} />
            </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex flex-1 overflow-hidden relative">
        
        {/* Left Sidebar (Input Panel) */}
        <div className={`
            absolute lg:relative z-50 h-full bg-white shadow-xl lg:shadow-none border-r border-orange-200 
            ${!isResizing ? 'transition-all duration-300 ease-in-out' : ''}
            ${isSidebarOpen && viewMode === 'input' ? 'translate-x-0 w-full' : '-translate-x-full lg:translate-x-0'}
            ${showInputPanel ? 'lg:w-[var(--input-width)] lg:opacity-100' : 'lg:w-0 lg:opacity-0 lg:overflow-hidden lg:border-none'}
        `}>
            <div className="h-full relative overflow-hidden w-full flex">
                <button 
                    onClick={() => setIsSidebarOpen(false)}
                    className="absolute top-2 right-2 lg:hidden p-2 text-gray-500 z-10"
                >
                    <X size={20} />
                </button>
                
                {/* Content Container - Ensure width matches parent to prevent squishing */}
                <div className="h-full w-full lg:w-[var(--input-width)] overflow-hidden"> 
                     <InputPanel onGenerate={handleGenerateList} isLoading={isGenerating} />
                </div>

                {/* Drag Handle (Desktop Only - lg+) */}
                {showInputPanel && (
                    <div 
                        onMouseDown={() => resizingState.current = 'input'}
                        className="hidden lg:flex absolute top-0 right-0 h-full w-4 cursor-col-resize z-50 hover:bg-orange-400/20 active:bg-orange-400/50 items-center justify-center -mr-2 transition-colors group"
                    >
                         <div className="w-1 h-8 bg-gray-300 rounded-full group-hover:bg-orange-400" />
                    </div>
                )}
            </div>
        </div>

        {/* Middle Sidebar (Results List) */}
        <div className={`
             absolute lg:relative z-50 h-full w-full lg:w-[var(--results-width)] bg-white shadow-xl lg:shadow-none border-r border-orange-200
             ${!isResizing ? 'transition-transform duration-300' : ''}
             ${isSidebarOpen && viewMode === 'list' ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} 
        `}>
            <div className="h-full relative flex">
                 <button 
                    onClick={() => setIsSidebarOpen(false)}
                    className="absolute top-2 right-2 lg:hidden p-2 text-gray-500"
                >
                    <X size={20} />
                </button>
                
                <div className="h-full w-full overflow-hidden">
                    <VocabList 
                        items={vocabItems}
                        selectedId={selectedItem?.id || null} 
                        onSelect={handleVocabSelect} 
                        layoutId={layoutId}
                        gridAssignments={gridAssignments}
                        activeCellIndex={activeCellIndex}
                        onUnselectAll={handleUnselectAll}
                    />
                </div>

                {/* Drag Handle (Desktop Only - lg+) */}
                <div 
                    onMouseDown={() => resizingState.current = 'results'}
                    className="hidden lg:flex absolute top-0 right-0 h-full w-4 cursor-col-resize z-50 hover:bg-orange-400/20 active:bg-orange-400/50 items-center justify-center -mr-2 transition-colors group"
                >
                    <div className="w-1 h-8 bg-gray-300 rounded-full group-hover:bg-orange-400" />
                </div>
            </div>
        </div>

        {/* Editor Area */}
        <div className="flex-1 bg-pattern relative w-full h-full overflow-hidden">
           <Editor 
                selectedItem={selectedItem} 
                vocabItems={vocabItems}
                layoutId={layoutId}
                onLayoutChange={handleLayoutChange}
                gridAssignments={gridAssignments}
                onGridUpdate={handleGridUpdate}
                activeCellIndex={activeCellIndex}
                onActiveCellChange={setActiveCellIndex}
           />
        </div>

      </main>
    </div>
  );
};

export default App;