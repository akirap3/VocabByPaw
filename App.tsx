import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { VocabList } from './components/VocabList.tsx';
import { Editor } from './components/Editor.tsx';
import { InputPanel } from './components/InputPanel.tsx';
import { LoginPage } from './components/LoginPage.tsx';
import { ProtectedRoute } from './components/ProtectedRoute.tsx';
import { VocabItem, VocabGenerationParams, AppMode, Character, CHARACTERS } from './types.ts';
import { Sparkles, Menu, X, Settings, Image, BookType, LogOut, ChevronLeft, ChevronRight } from 'lucide-react';
import { generateVocabList } from './services/geminiService.ts';
import { getAllImages, saveAllImages, clearAllImages } from './services/imageCacheDB.ts';

// --- Dashboard Component (Main Application) ---
const STORAGE_KEYS = {
    vocabItems: 'vocabByPaw_vocabItems',
    themeSentence: 'vocabByPaw_themeSentence',
    selectedCharacter: 'vocabByPaw_selectedCharacter',
    vocabLayoutId: 'vocabByPaw_vocabLayoutId',
    vocabGridAssignments: 'vocabByPaw_vocabGridAssignments',
    imageCache: 'vocabByPaw_imageCache', // Legacy key - will migrate to IndexedDB
    collageLayoutId: 'vocabByPaw_collageLayoutId',
    collageGridAssignments: 'vocabByPaw_collageGridAssignments',
    appMode: 'vocabByPaw_appMode',
};

// Flag to track if we've migrated localStorage cache to IndexedDB
const MIGRATION_KEY = 'vocabByPaw_imageCacheMigrated';

// Helper to safely parse JSON from localStorage
const loadFromStorage = <T,>(key: string, defaultValue: T): T => {
    try {
        const stored = localStorage.getItem(key);
        return stored ? JSON.parse(stored) : defaultValue;
    } catch {
        return defaultValue;
    }
};

const Dashboard: React.FC = () => {
    const navigate = useNavigate();
    const [appMode, setAppMode] = useState<AppMode>(() =>
        loadFromStorage(STORAGE_KEYS.appMode, 'vocab') as AppMode
    );
  
    // Load initial state from localStorage
    const [vocabItems, setVocabItems] = useState<VocabItem[]>(() =>
        loadFromStorage(STORAGE_KEYS.vocabItems, [])
    );
    const [selectedItem, setSelectedItem] = useState<VocabItem | null>(() => {
        const items = loadFromStorage<VocabItem[]>(STORAGE_KEYS.vocabItems, []);
        return items.length > 0 ? items[0] : null;
    });
    const [themeSentence, setThemeSentence] = useState<string>(() =>
        loadFromStorage(STORAGE_KEYS.themeSentence, "")
    );
    const [selectedCharacter, setSelectedCharacter] = useState<Character>(() => {
        const saved = loadFromStorage<Character | null>(STORAGE_KEYS.selectedCharacter, null);
        return saved || CHARACTERS[0];
    });

    const handleLogout = () => {
        // Clear all app data from localStorage
        Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
        localStorage.removeItem('isAuthenticated');
        localStorage.removeItem(MIGRATION_KEY);
        // Clear IndexedDB image cache
        clearAllImages();
        navigate('/');
    };

    const [vocabLayoutId, setVocabLayoutId] = useState(() =>
        loadFromStorage(STORAGE_KEYS.vocabLayoutId, 0)
    );
    const [vocabGridAssignments, setVocabGridAssignments] = useState<number[]>(() =>
        loadFromStorage(STORAGE_KEYS.vocabGridAssignments, [])
    );
  const [vocabActiveCellIndex, setVocabActiveCellIndex] = useState(0);

    const [collageLayoutId, setCollageLayoutId] = useState(() =>
        loadFromStorage(STORAGE_KEYS.collageLayoutId, 0)
    );
    const [collageGridAssignments, setCollageGridAssignments] = useState<number[]>(() =>
        loadFromStorage(STORAGE_KEYS.collageGridAssignments, [0])
    );
  const [collageActiveCellIndex, setCollageActiveCellIndex] = useState(0);

    // Image cache now uses IndexedDB with string keys - start empty, load async
    const [imageCache, setImageCache] = useState<Record<string, string>>({});
    const [imageCacheLoaded, setImageCacheLoaded] = useState(false);
    const [stitchedImage, setStitchedImage] = useState<string | null>(null);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showInputPanel, setShowInputPanel] = useState(true);
    const [showResultsPanel, setShowResultsPanel] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [viewMode, setViewMode] = useState<'input' | 'list'>('list');

  const [inputPanelWidth, setInputPanelWidth] = useState(250);
  const [resultsPanelWidth, setResultsPanelWidth] = useState(300);
  const [isResizing, setIsResizing] = useState(false);

    const widthsRef = useRef({ input: 250, results: 300 });

  useEffect(() => {
      widthsRef.current = { input: inputPanelWidth, results: resultsPanelWidth };
  }, [inputPanelWidth, resultsPanelWidth]);

    // Save vocab data to localStorage whenever it changes
    useEffect(() => {
        localStorage.setItem(STORAGE_KEYS.vocabItems, JSON.stringify(vocabItems));
    }, [vocabItems]);

    useEffect(() => {
        localStorage.setItem(STORAGE_KEYS.themeSentence, JSON.stringify(themeSentence));
    }, [themeSentence]);

    useEffect(() => {
        localStorage.setItem(STORAGE_KEYS.selectedCharacter, JSON.stringify(selectedCharacter));
    }, [selectedCharacter]);

    useEffect(() => {
        localStorage.setItem(STORAGE_KEYS.vocabLayoutId, JSON.stringify(vocabLayoutId));
    }, [vocabLayoutId]);

    useEffect(() => {
        localStorage.setItem(STORAGE_KEYS.vocabGridAssignments, JSON.stringify(vocabGridAssignments));
    }, [vocabGridAssignments]);

    // Load image cache from IndexedDB on mount
    useEffect(() => {
        const loadImageCache = async () => {
            // Check if we need to migrate from localStorage (old number-keyed cache)
            const migrated = localStorage.getItem(MIGRATION_KEY);
            if (!migrated) {
                const oldCache = loadFromStorage<Record<number, string>>(STORAGE_KEYS.imageCache, {});
                if (Object.keys(oldCache).length > 0) {
                    // Convert number keys to string keys with vocab_ prefix
                    const stringKeyCache: Record<string, string> = {};
                    Object.entries(oldCache).forEach(([key, val]) => {
                        stringKeyCache[`vocab_${key}`] = val;
                    });
                    await saveAllImages(stringKeyCache);
                    localStorage.removeItem(STORAGE_KEYS.imageCache);
                }
                localStorage.setItem(MIGRATION_KEY, 'true');
            }

            const cache = await getAllImages();
            setImageCache(cache);
            setImageCacheLoaded(true);
        };
        loadImageCache();
    }, []);

    // Persist appMode to localStorage
    useEffect(() => {
        localStorage.setItem(STORAGE_KEYS.appMode, JSON.stringify(appMode));
    }, [appMode]);

    // Save image cache to IndexedDB whenever it changes (debounced)
    const imageCacheSaveTimeout = useRef<NodeJS.Timeout | null>(null);
    useEffect(() => {
        if (!imageCacheLoaded) return; // Don't save until initial load is done
        if (imageCacheSaveTimeout.current) {
            clearTimeout(imageCacheSaveTimeout.current);
        }
        imageCacheSaveTimeout.current = setTimeout(() => {
            saveAllImages(imageCache);
        }, 500); // Debounce 500ms
        return () => {
            if (imageCacheSaveTimeout.current) {
                clearTimeout(imageCacheSaveTimeout.current);
            }
        };
    }, [imageCache, imageCacheLoaded]);

    useEffect(() => {
        localStorage.setItem(STORAGE_KEYS.collageLayoutId, JSON.stringify(collageLayoutId));
    }, [collageLayoutId]);

    useEffect(() => {
        localStorage.setItem(STORAGE_KEYS.collageGridAssignments, JSON.stringify(collageGridAssignments));
    }, [collageGridAssignments]);

  const handleGenerateList = async (params: VocabGenerationParams) => {
      setIsGenerating(true);
      try {
          const result = await generateVocabList({ ...params, character: selectedCharacter });
          setVocabItems(result.items);
          setThemeSentence(result.theme);
          if (result.items.length > 0) {
              setSelectedItem(result.items[0]);
              setVocabGridAssignments([result.items[0].id]);
              setVocabLayoutId(0);
              setVocabActiveCellIndex(0);
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

  const handleLayoutChange = (id: number, count: number) => {
      if (appMode === 'vocab') {
          setVocabLayoutId(id);
          setVocabActiveCellIndex(0);
          const newAssignments: number[] = [];
          for (let i = 0; i < count; i++) {
              if (i < vocabItems.length) {
                  newAssignments.push(vocabItems[i].id);
              } else {
                  newAssignments.push(0);
              }
          }
          setVocabGridAssignments(newAssignments);
          if (id === 0 && vocabItems.length > 0) {
              setSelectedItem(vocabItems[0]);
          }
      } else {
          setCollageLayoutId(id);
          setCollageActiveCellIndex(0);
          setCollageGridAssignments(new Array(count).fill(0));
      }
  };

  const handleUnselectAll = () => {
      if (appMode === 'vocab') {
          setVocabGridAssignments(prev => prev.map(() => 0));
      } else {
          setCollageGridAssignments(prev => prev.map(() => 0));
      }
  };

  const handleGridUpdate = (newAssignments: number[]) => {
      if (appMode === 'vocab') {
          setVocabGridAssignments(newAssignments);
      } else {
          setCollageGridAssignments(newAssignments);
      }
  };

  const handleVocabSelect = (item: VocabItem) => {
      setSelectedItem(item);
      if (vocabLayoutId > 0) {
          const newAssignments = [...vocabGridAssignments];
          while (newAssignments.length <= vocabActiveCellIndex) newAssignments.push(0);
          const existingIndex = newAssignments.indexOf(item.id);
          if (existingIndex !== -1 && existingIndex !== vocabActiveCellIndex) {
              newAssignments[existingIndex] = 0;
          }
          newAssignments[vocabActiveCellIndex] = item.id;
          setVocabGridAssignments(newAssignments);
      } else {
          setVocabGridAssignments([item.id]);
      }
      setIsSidebarOpen(false);
  };
  
  const toggleAppMode = (mode: AppMode) => {
      setAppMode(mode);
      setStitchedImage(null);
  };

  const currentLayoutId = appMode === 'vocab' ? vocabLayoutId : collageLayoutId;
  const currentGridAssignments = appMode === 'vocab' ? vocabGridAssignments : collageGridAssignments;
  const currentActiveCellIndex = appMode === 'vocab' ? vocabActiveCellIndex : collageActiveCellIndex;
  const setActiveCellIndex = appMode === 'vocab' ? setVocabActiveCellIndex : setCollageActiveCellIndex;

  return (
    <div 
          className="flex flex-col h-screen overflow-hidden bg-orange-50"
          style={{
              '--input-width': `${inputPanelWidth}px`,
              '--results-width': `${resultsPanelWidth}px`
          } as React.CSSProperties}
    >
      <header className="bg-white border-b border-orange-200 p-2 md:p-4 flex items-center justify-between shadow-sm z-30 relative shrink-0">
        <div className="flex items-center gap-2 md:gap-4">
                  <div className="flex items-center gap-2">
                      <div className="bg-orange-500 text-white p-1.5 md:p-2 rounded-lg">
                          <Sparkles size={20} className="md:w-6 md:h-6" />
                      </div>
                      <div className="hidden md:block">
                          <h1 className="text-lg md:text-2xl font-bold text-gray-800 tracking-tight leading-none">Sir Isaac's</h1>
                          <p className="text-[10px] md:text-xs text-gray-500">Vocab Studio</p>
                      </div>
                  </div>

                  <div className="bg-gray-100 p-1 rounded-lg flex items-center gap-1 border border-gray-200 ml-2 md:ml-4">
                      <button
                          onClick={() => toggleAppMode('vocab')}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-bold transition-all ${appMode === 'vocab'
                              ? 'bg-white text-orange-600 shadow-sm ring-1 ring-black/5'
                              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200'
                              }`}
                      >
                          <BookType size={16} />
                          <span className="hidden sm:inline">Vocab Studio</span>
                      </button>
                      <button
                          onClick={() => toggleAppMode('collage')}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-bold transition-all ${appMode === 'collage'
                              ? 'bg-white text-orange-600 shadow-sm ring-1 ring-black/5'
                              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200'
                              }`}
                      >
                          <Image size={16} />
                          <span className="hidden sm:inline">Free Collage</span>
                      </button>
                  </div>
        </div>
        
              <div className="flex items-center gap-2">
                  <div className="flex gap-2 lg:hidden">
                      {appMode === 'vocab' && (
                          <>
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
                          </>
                      )}
                  </div>

                  {/* Logout Button */}
                  <button
                      onClick={handleLogout}
                      className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                      title="Logout"
                  >
                      <LogOut size={20} />
                  </button>
              </div>
      </header>

      <main className="flex flex-1 overflow-hidden relative">
        {appMode === 'vocab' && (
                  <>
                      {/* Setup Studio Drawer Toggle */}
                      <button
                          onClick={() => setShowInputPanel(!showInputPanel)}
                          className="hidden lg:flex absolute left-0 top-1/2 -translate-y-1/2 z-[60] bg-orange-500 hover:bg-orange-600 text-white p-1 rounded-r-lg shadow-lg transition-all duration-300"
                          style={{ left: showInputPanel ? inputPanelWidth - 1 : 0 }}
                          title={showInputPanel ? 'Hide Setup Studio' : 'Show Setup Studio'}
                      >
                          {showInputPanel ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
                      </button>

                      <div
                          className={`
                absolute lg:relative z-50 h-full bg-white shadow-xl lg:shadow-none border-r border-orange-200 transition-all duration-300 ease-in-out
                ${isSidebarOpen && viewMode === 'input' ? 'translate-x-0 w-full' : '-translate-x-full lg:translate-x-0'}
              `}
                          style={{
                              width: showInputPanel ? inputPanelWidth : 0,
                              minWidth: showInputPanel ? 180 : 0,
                              opacity: showInputPanel ? 1 : 0,
                              overflow: showInputPanel ? 'visible' : 'hidden'
                          }}
                      >
                          <div className="h-full relative overflow-hidden w-full flex">
                              <button
                                  onClick={() => setIsSidebarOpen(false)}
                                  className="absolute top-2 right-2 lg:hidden p-2 text-gray-500 z-10"
                              >
                                  <X size={20} />
                              </button>
                              <div className="h-full w-full overflow-hidden">
                                  <InputPanel onGenerate={handleGenerateList} isLoading={isGenerating} />
                              </div>
                          </div>
                      </div>

                      {/* Resize handle between InputPanel and VocabList */}
                      {showInputPanel && (
                          <div
                              className="hidden lg:flex w-1.5 bg-gray-100 hover:bg-orange-300 cursor-col-resize items-center justify-center group transition-colors z-50"
                              onMouseDown={(e) => {
                                  e.preventDefault();
                                  setIsResizing(true);
                                  const startX = e.clientX;
                                  const startWidth = inputPanelWidth;

                                  const onMouseMove = (e: MouseEvent) => {
                                      const delta = e.clientX - startX;
                                      const newWidth = Math.max(180, Math.min(400, startWidth + delta));
                                      setInputPanelWidth(newWidth);
                                  };

                                  const onMouseUp = () => {
                                      setIsResizing(false);
                                      document.removeEventListener('mousemove', onMouseMove);
                                      document.removeEventListener('mouseup', onMouseUp);
                                  };

                                  document.addEventListener('mousemove', onMouseMove);
                                  document.addEventListener('mouseup', onMouseUp);
                              }}
                          >
                              <div className="w-0.5 h-8 bg-gray-300 group-hover:bg-orange-500 rounded transition-colors" />
                          </div>
                      )}
                  </>
        )}

        {appMode === 'vocab' && (
                  <>
                      <div
                          className={`
                absolute lg:relative z-50 h-full bg-white shadow-xl lg:shadow-none border-r border-orange-200 transition-all duration-300 ease-in-out
                ${isSidebarOpen && viewMode === 'list' ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} 
              `}
                          style={{
                              width: showResultsPanel ? resultsPanelWidth : 0,
                              minWidth: showResultsPanel ? 180 : 0,
                              opacity: showResultsPanel ? 1 : 0,
                              overflow: showResultsPanel ? 'visible' : 'hidden'
                          }}
                      >
                          <div className="h-full relative flex">
                              <div className="h-full w-full overflow-hidden">
                                  <VocabList
                                      items={vocabItems}
                                      themeSentence={themeSentence}
                                      onThemeChange={setThemeSentence}
                                      selectedId={selectedItem?.id || null}
                                      onSelect={handleVocabSelect}
                                      layoutId={vocabLayoutId}
                                      gridAssignments={vocabGridAssignments}
                                      activeCellIndex={vocabActiveCellIndex}
                                      onUnselectAll={handleUnselectAll}
                                      onClose={() => setIsSidebarOpen(false)}
                                      imageCache={imageCache}
                                      stitchedImage={stitchedImage}
                                      selectedCharacter={selectedCharacter}
                                      onCharacterChange={setSelectedCharacter}
                                  />
                              </div>
                          </div>
                      </div>

                      {/* Resize handle between VocabList and Editor */}
                      {showResultsPanel && (
                          <div
                              className="hidden lg:flex w-1.5 bg-gray-100 hover:bg-orange-300 cursor-col-resize items-center justify-center group transition-colors z-50"
                              onMouseDown={(e) => {
                                  e.preventDefault();
                                  setIsResizing(true);
                                  const startX = e.clientX;
                                  const startWidth = resultsPanelWidth;

                                  const onMouseMove = (e: MouseEvent) => {
                                      const delta = e.clientX - startX;
                                      const newWidth = Math.max(180, Math.min(500, startWidth + delta));
                                      setResultsPanelWidth(newWidth);
                                  };

                                  const onMouseUp = () => {
                                      setIsResizing(false);
                                      document.removeEventListener('mousemove', onMouseMove);
                                      document.removeEventListener('mouseup', onMouseUp);
                                  };

                                  document.addEventListener('mousemove', onMouseMove);
                                  document.addEventListener('mouseup', onMouseUp);
                              }}
                          >
                              <div className="w-0.5 h-8 bg-gray-300 group-hover:bg-orange-500 rounded transition-colors" />
                          </div>
                      )}

                      {/* Results Drawer Toggle */}
                      <button
                          onClick={() => setShowResultsPanel(!showResultsPanel)}
                          className="hidden lg:flex absolute top-1/2 -translate-y-1/2 z-[60] bg-orange-500 hover:bg-orange-600 text-white p-1 rounded-r-lg shadow-lg transition-all duration-300"
                          style={{
                              left: (showInputPanel ? inputPanelWidth + 6 : 0) + (showResultsPanel ? resultsPanelWidth + 6 : 0) - 1
                          }}
                          title={showResultsPanel ? 'Hide Results' : 'Show Results'}
                      >
                          {showResultsPanel ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
                      </button>
                  </>
        )}

              <div
                  className="flex-1 relative w-full h-full overflow-hidden"
                  style={{
                      backgroundColor: '#fff9f5',
                      backgroundImage: `
              linear-gradient(to right, rgba(251, 146, 60, 0.15) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(251, 146, 60, 0.15) 1px, transparent 1px)
            `,
                      backgroundSize: '24px 24px'
                  }}
              >
                  <Editor
                      selectedItem={appMode === 'vocab' ? selectedItem : null}
                      vocabItems={vocabItems}
                      layoutId={currentLayoutId}
                      onLayoutChange={handleLayoutChange}
                      gridAssignments={currentGridAssignments}
                      onGridUpdate={handleGridUpdate}
                      activeCellIndex={currentActiveCellIndex}
                      onActiveCellChange={setActiveCellIndex}
                      appMode={appMode}
                      initialImageCache={imageCache}
                      onImageCacheChange={setImageCache}
                      onStitchedImageChange={setStitchedImage}
                      selectedCharacter={selectedCharacter}
                      onCharacterChange={setSelectedCharacter}
                  />
        </div>
      </main>
    </div>
  );
};

// Redirect component that checks auth status
const CatchAllRedirect: React.FC = () => {
    const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
    return <Navigate to={isAuthenticated ? '/dashboard' : '/'} replace />;
};

const App: React.FC = () => {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<LoginPage />} />
                <Route element={<ProtectedRoute />}>
                    <Route path="/dashboard" element={<Dashboard />} />
                </Route>
                <Route path="*" element={<CatchAllRedirect />} />
            </Routes>
        </BrowserRouter>
    );
};

export default App;