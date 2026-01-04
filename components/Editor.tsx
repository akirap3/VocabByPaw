import React, { useState, useEffect, useRef } from 'react';
import { VocabItem, AppMode } from '../types';
import { generateImageContent } from '../services/geminiService';
import { RefreshCw, Wand2, Download, Layers, X, Image as ImageIcon, Upload, Check, MessageSquare, Type, Trash2, Settings2, Minus, MoreHorizontal, GripHorizontal, Copy, Edit3, Star, RotateCcw } from 'lucide-react';

interface EditorProps {
  selectedItem: VocabItem | null;
  vocabItems: VocabItem[];
  layoutId: number;
  onLayoutChange: (id: number, count: number) => void;
  gridAssignments: number[];
  onGridUpdate: (newAssignments: number[]) => void;
  activeCellIndex?: number;
  onActiveCellChange?: (index: number) => void;
  appMode?: AppMode;
}

// Types for Grid State
interface GridCellData {
  id: string;
  imageSrc: string | null;
  isLoading: boolean;
  prompt: string; 
  wordId: number; 
  showWordInfo: boolean; // Controls Word, Phonetic, Definition
  showSentences: boolean; // Controls English/Target Sentences
}

interface DividerConfig {
    show: boolean;
    color: string;
    style: 'solid' | 'dashed' | 'dotted';
    thickness: number;
}

// Custom Icons with consistent 2px gaps and alignment
const Icons = {
    Single: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
            <rect x="3" y="3" width="18" height="18" rx="2" />
        </svg>
    ),
    SplitH: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
            <rect x="3" y="3" width="8" height="18" rx="2" />
            <rect x="13" y="3" width="8" height="18" rx="2" />
        </svg>
    ),
    SplitV: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
             <rect x="3" y="3" width="18" height="8" rx="2" />
             <rect x="3" y="13" width="18" height="8" rx="2" />
        </svg>
    ),
    Grid4: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
            <rect x="3" y="3" width="8" height="8" rx="2" />
            <rect x="13" y="3" width="8" height="8" rx="2" />
            <rect x="3" y="13" width="8" height="8" rx="2" />
            <rect x="13" y="13" width="8" height="8" rx="2" />
        </svg>
    ),
    LeftFocus: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
            <rect x="3" y="3" width="8" height="18" rx="2" />
            <rect x="13" y="3" width="8" height="8" rx="2" />
            <rect x="13" y="13" width="8" height="8" rx="2" />
        </svg>
    ),
    RightFocus: (
         <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
            <rect x="3" y="3" width="8" height="8" rx="2" />
            <rect x="3" y="13" width="8" height="8" rx="2" />
            <rect x="13" y="3" width="8" height="18" rx="2" />
        </svg>
    ),
    Grid9: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M9 3v18 M15 3v18 M3 9h18 M3 15h18" />
        </svg>
    )
};

const LAYOUTS = [
  { id: 0, name: 'Single', count: 1, icon: Icons.Single },
  { id: 1, name: 'Split H', count: 2, icon: Icons.SplitH },
  { id: 2, name: 'Split V', count: 2, icon: Icons.SplitV },
  { id: 3, name: 'Grid 4', count: 4, icon: Icons.Grid4 },
  { id: 4, name: 'Left Focus', count: 3, icon: Icons.LeftFocus },
  { id: 5, name: 'Right Focus', count: 3, icon: Icons.RightFocus },
  { id: 6, name: 'Grid 9', count: 9, icon: Icons.Grid9 },
];

// --- CANVAS HELPERS ---

const drawRoundedRect = (ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number, fillStyle: string) => {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    ctx.fillStyle = fillStyle;
    ctx.fill();
};

const getLines = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number) => {
    const words = text.split(' ');
    let tempLines: string[] = [];
    let currentLine = words[0];

    for (let i = 1; i < words.length; i++) {
        const word = words[i];
        const width = ctx.measureText(currentLine + " " + word).width;
        if (width < maxWidth) {
            currentLine += " " + word;
        } else {
            tempLines.push(currentLine);
            currentLine = word;
        }
    }
    if (currentLine) tempLines.push(currentLine);

    const finalLines: string[] = [];
    tempLines.forEach(line => {
        if (ctx.measureText(line).width > maxWidth) {
            let charLine = '';
            for (const char of line) {
                if (ctx.measureText(charLine + char).width > maxWidth) {
                    finalLines.push(charLine);
                    charLine = char;
                } else {
                    charLine += char;
                }
            }
            if (charLine) finalLines.push(charLine);
        } else {
            finalLines.push(line);
        }
    });

    return finalLines;
};

const drawCellContent = (
    ctx: CanvasRenderingContext2D, 
    img: HTMLImageElement, 
    cell: GridCellData, 
    wordItem: VocabItem | undefined,
    x: number, y: number, w: number, h: number
) => {
    if (img) {
        const ratio = img.width / img.height;
        const targetRatio = w / h;
        let sx = 0, sy = 0, sw = img.width, sh = img.height;
        if (ratio > targetRatio) {
            sw = img.height * targetRatio;
            sx = (img.width - sw) / 2;
        } else {
            sh = img.width / targetRatio;
            sy = (img.height - sh) / 2;
        }
        ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
    }

    const effectiveDimension = Math.min(w, h * 1.4); 
    const scale = effectiveDimension / 1000;

    if (cell.showWordInfo && wordItem) {
        const padding = 16 * scale;
        const wordSize = Math.max(24, 56 * scale); 
        const phoneticSize = Math.max(12, 28 * scale);
        const defSize = Math.max(16, 30 * scale);
        const lineHeight = 1.4;

        ctx.font = `bold ${defSize}px "Noto Sans TC", sans-serif`;
        const defLines = getLines(ctx, wordItem.definition, w - (padding * 2));
        const defLineHeight = defSize * lineHeight;
        const totalContentHeight = (wordSize * 1.1) + (10 * scale) + (defLines.length * defLineHeight);
        const boxHeight = totalContentHeight + (padding * 1.5);

        drawRoundedRect(ctx, x, y, w, boxHeight, 0, 'rgba(255, 255, 255, 0.9)');
        ctx.textAlign = 'center';
        const centerX = x + (w / 2);
        let currentY = y + padding + (wordSize * 0.85);
        ctx.font = `900 ${wordSize}px "Comic Neue", sans-serif`;
        const wordWidth = ctx.measureText(wordItem.word).width;
        ctx.font = `normal ${phoneticSize}px sans-serif`;
        const phoneWidth = ctx.measureText(" " + wordItem.phonetic).width;
        const totalTopLineWidth = wordWidth + phoneWidth;
        let startX = centerX - (totalTopLineWidth / 2);
        ctx.textAlign = 'left';
        ctx.fillStyle = '#000000';
        ctx.font = `900 ${wordSize}px "Comic Neue", sans-serif`;
        ctx.fillText(wordItem.word, startX, currentY);
        ctx.font = `normal ${phoneticSize}px sans-serif`;
        ctx.fillStyle = '#4b5563';
        ctx.fillText(" " + wordItem.phonetic, startX + wordWidth, currentY);
        currentY += (15 * scale);
        ctx.font = `bold ${defSize}px "Noto Sans TC", sans-serif`;
        ctx.fillStyle = '#000000';
        ctx.textAlign = 'center';
        defLines.forEach(line => {
            currentY += defLineHeight;
            ctx.fillText(line, centerX, currentY - (defLineHeight * 0.25)); 
        });
    }

    if (cell.showSentences && wordItem) {
        const padding = 16 * scale;
        const sentSize = Math.max(14, 28 * scale); 
        const lineHeight = sentSize * 1.4;
        ctx.font = `bold ${sentSize}px "Comic Neue", sans-serif`;
        const engLines = getLines(ctx, wordItem.englishSentence, w - (padding * 2));
        ctx.font = `normal ${sentSize}px "Noto Sans TC", sans-serif`;
        const targetLines = getLines(ctx, wordItem.targetSentence, w - (padding * 2));
        const totalTextHeight = (engLines.length * lineHeight) + (8 * scale) + (targetLines.length * lineHeight);
        const boxHeight = totalTextHeight + (padding * 1.5);
        const boxY = y + h - boxHeight;
        drawRoundedRect(ctx, x, boxY, w, boxHeight, 0, 'rgba(0, 0, 0, 0.75)');
        let currentY = boxY + padding + (sentSize * 0.8);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'alphabetic';
        ctx.fillStyle = '#FFFFFF';
        const centerX = x + (w / 2);
        ctx.font = `bold ${sentSize}px "Comic Neue", sans-serif`;
        engLines.forEach(line => {
            ctx.fillText(line, centerX, currentY);
            currentY += lineHeight;
        });
        currentY += (5 * scale);
        ctx.fillStyle = '#e5e7eb';
        ctx.font = `normal ${sentSize}px "Noto Sans TC", sans-serif`;
        targetLines.forEach(line => {
            ctx.fillText(line, centerX, currentY);
            currentY += lineHeight;
        });
    }
};

const generateStars = (count: number) => {
    return Array.from({ length: count }).map((_, i) => ({
        id: i,
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
    }));
};

export const Editor: React.FC<EditorProps> = ({ 
    selectedItem, 
    vocabItems,
    layoutId,
    onLayoutChange,
    gridAssignments,
    onGridUpdate,
    activeCellIndex = 0,
    onActiveCellChange = () => {},
    appMode = 'vocab'
}) => {
  // State
  const [cells, setCells] = useState<GridCellData[]>([]);
  const cellsRef = useRef<GridCellData[]>([]);

  useEffect(() => {
      cellsRef.current = cells;
  }, [cells]);

  const layoutPersistence = useRef<Record<number, GridCellData[]>>({});
  const prevLayoutId = useRef<number>(layoutId);
  const [customCharacter, setCustomCharacter] = useState<string | null>(null);
  const [starsFar] = useState(() => generateStars(40));
  const [starsMid] = useState(() => generateStars(20));
  const [starsNear] = useState(() => generateStars(10));
  const imageCache = useRef<Map<number, string>>(new Map());
  const [magicPrompt, setMagicPrompt] = useState("");
  const [applyToAll, setApplyToAll] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stitchedImage, setStitchedImage] = useState<string | null>(null);
  const [isStitching, setIsStitching] = useState(false);
  const [dividerConfig, setDividerConfig] = useState<DividerConfig>({
      show: false,
      color: '#ffffff',
      style: 'solid',
      thickness: 20
  });
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  useEffect(() => {
      const savedCharacter = localStorage.getItem('vocab_studio_custom_character');
      if (savedCharacter) setCustomCharacter(savedCharacter);
  }, []);

  useEffect(() => {
    if (appMode === 'vocab' && vocabItems.length === 0) return;

    if (appMode === 'collage') {
        if (prevLayoutId.current !== undefined && prevLayoutId.current !== layoutId) {
             layoutPersistence.current[prevLayoutId.current] = [...cellsRef.current];
        }

        const savedLayoutData = layoutPersistence.current[layoutId];
        let newCells: GridCellData[] = [];
        
        if (savedLayoutData && savedLayoutData.length === gridAssignments.length) {
            newCells = [...savedLayoutData];
        } else {
             for (let i = 0; i < gridAssignments.length; i++) {
                newCells.push({
                    id: `cell-collage-${i}-${layoutId}-${Date.now()}`,
                    imageSrc: null,
                    isLoading: false,
                    prompt: "",
                    wordId: 0,
                    showWordInfo: false,
                    showSentences: false
                });
            }
        }
        setCells(newCells);
        prevLayoutId.current = layoutId;
    } else {
        setCells(prevCells => {
            const newCells: GridCellData[] = [];
            for (let i = 0; i < gridAssignments.length; i++) {
                const wordId = gridAssignments[i];
                let existingCell: GridCellData | undefined;
                const existingIndex = prevCells.findIndex(c => c.wordId === wordId && wordId !== 0);
                if (existingIndex !== -1) existingCell = prevCells[existingIndex];

                let cachedImage = null;
                if (wordId !== 0 && imageCache.current.has(wordId)) {
                    cachedImage = imageCache.current.get(wordId)!;
                }

                if (existingCell) {
                     newCells.push({ ...existingCell, id: `cell-${wordId}-${i}` });
                } else {
                     newCells.push({
                        id: `cell-${wordId}-${i}`,
                        imageSrc: cachedImage, 
                        isLoading: false,
                        prompt: "",
                        wordId: wordId,
                        showWordInfo: false, 
                        showSentences: false 
                     });
                }
            }
            return newCells;
        });
        prevLayoutId.current = layoutId;
    }
    setStitchedImage(null); 
  }, [gridAssignments, vocabItems, appMode, layoutId]); 

  const getTargetAspectRatio = (layout: number, idx: number): string => {
      if (layout === 1) return "9:16";
      if (layout === 2) return "16:9";
      if (layout === 4 && idx === 0) return "9:16";
      if (layout === 5 && idx === 2) return "9:16";
      return "1:1";
  };

  const getCellScale = (layout: number, idx: number): number => {
      switch (layout) {
          case 0: return 1.0;
          case 1: return 0.65;
          case 2: return 0.8;
          case 3: return 0.55;
          case 4: return idx === 0 ? 1.0 : 0.55;
          case 5: return idx === 2 ? 1.0 : 0.55;
          case 6: return 0.38;
          default: return 1.0;
      }
  };

  const allInfoVisible = cells.length > 0 && cells.every(c => c.showWordInfo);
  const allSentencesVisible = cells.length > 0 && cells.every(c => c.showSentences);

  const toggleAllInfo = () => {
    const targetState = !allInfoVisible;
    setCells(prev => prev.map(c => ({ ...c, showWordInfo: targetState })));
  };

  const toggleAllSentences = () => {
    const targetState = !allSentencesVisible;
    setCells(prev => prev.map(c => ({ ...c, showSentences: targetState })));
  };

  const renderCellToCanvas = async (cell: GridCellData, wordItem: VocabItem, layoutId: number, index: number): Promise<HTMLCanvasElement | null> => {
      if (!cell.imageSrc) return null;
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = cell.imageSrc;
      await new Promise(r => img.onload = r);
      const aspectRatioStr = getTargetAspectRatio(layoutId, index);
      const [rw, rh] = aspectRatioStr.split(':').map(Number);
      const targetRatio = rw / rh;
      const imgRatio = img.naturalWidth / img.naturalHeight;
      let canvasW, canvasH;
      if (imgRatio > targetRatio) {
          canvasH = img.naturalHeight;
          canvasW = canvasH * targetRatio;
      } else {
          canvasW = img.naturalWidth;
          canvasH = canvasW / targetRatio;
      }
      const canvas = document.createElement('canvas');
      canvas.width = canvasW;
      canvas.height = canvasH;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      drawCellContent(ctx, img, cell, wordItem, 0, 0, canvas.width, canvas.height);
      return canvas;
  };

  const handleDownloadSingle = async (e: React.MouseEvent, index: number) => {
      e.stopPropagation();
      const cell = cells[index];
      if(!cell || !cell.imageSrc) return;
      const item = vocabItems.find(v => v.id === cell.wordId);
      const filename = `${item?.word || 'image'}.png`;
      let downloadUrl = cell.imageSrc;
      const canvas = await renderCellToCanvas(cell, item!, layoutId, index);
      if (canvas) downloadUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const handleCopySingle = async (e: React.MouseEvent, index: number) => {
      e.stopPropagation();
      const cell = cells[index];
      if(!cell || !cell.imageSrc) return;
      const item = vocabItems.find(v => v.id === cell.wordId);
      try {
          let blob: Blob | null = null;
          const canvas = await renderCellToCanvas(cell, item!, layoutId, index);
          if (canvas) blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
          if (blob) {
              await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
              const btn = e.currentTarget as HTMLButtonElement;
              const originalColor = btn.style.backgroundColor;
              btn.style.backgroundColor = '#10b981';
              setTimeout(() => { btn.style.backgroundColor = originalColor }, 1000);
          }
      } catch (err) {
          console.error("Copy failed", err);
      }
  };

  const handleGenerateCell = async (index: number, mode: 'create' | 'edit') => {
    const cell = cells[index];
    if (!cell) return;
    const targetWordItem = vocabItems.find(v => v.id === cell.wordId);
    let promptToUse = mode === 'create' ? (targetWordItem?.imagePrompt || "") : magicPrompt;
    if (mode === 'create' && !targetWordItem && appMode === 'vocab') {
        setError("Please select a word first.");
        return;
    }
    if (!promptToUse?.trim()) return;
    updateCell(index, { isLoading: true });
    setError(null);
    const aspectRatio = getTargetAspectRatio(layoutId, index);
    try {
      const baseImage = mode === 'edit' ? cell.imageSrc : undefined;
      const result = await generateImageContent(promptToUse, baseImage || undefined, aspectRatio);
      if (result) updateCell(index, { imageSrc: result, isLoading: false });
      else updateCell(index, { isLoading: false });
    } catch (err) {
      setError(`Failed to generate image for cell ${index + 1}`);
      updateCell(index, { isLoading: false });
    }
  };

  const handleClearCell = (index: number) => {
      const cell = cells[index];
      if (cell && cell.wordId && appMode === 'vocab') {
          imageCache.current.delete(cell.wordId);
      }
      updateCell(index, { imageSrc: null });
  };

  const handleClearAllImages = (e: React.MouseEvent) => {
      e.stopPropagation(); 
      if (window.confirm("確定要清空當前版面上所有的圖片嗎？此操作將同時移除快取。")) {
          // 1. 徹底清空快取
          if (appMode === 'vocab') {
              imageCache.current.clear();
          }
          if (appMode === 'collage') {
              // 直接清空當前 Layout 的持久化儲存
              layoutPersistence.current[layoutId] = [];
          }

          // 2. 更新 State 並強制重設 ID (確保元件重新渲染)
          setCells(prev => prev.map((c, i) => ({ 
              ...c, 
              imageSrc: null, 
              isLoading: false,
              id: `cell-reset-${i}-${layoutId}-${Date.now()}` // 重新生成 ID 強制渲染
          })));

          // 3. 清除 UI 狀態
          setStitchedImage(null); 
          setError(null);
      }
  };

  const handleMagicApply = () => {
      if (!magicPrompt.trim()) return;
      if (applyToAll) {
          cells.forEach((cell, idx) => { if (cell.imageSrc) handleGenerateCell(idx, 'edit'); });
      } else {
          if (cells[activeCellIndex]?.imageSrc) handleGenerateCell(activeCellIndex, 'edit');
          else setError("Please generate/upload an image first.");
      }
  };

  const handleFileUpload = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => updateCell(index, { imageSrc: reader.result as string });
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };
  
  const handleCharacterUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
              const result = reader.result as string;
              setCustomCharacter(result);
              localStorage.setItem('vocab_studio_custom_character', result);
          };
          reader.readAsDataURL(file);
      }
      e.target.value = '';
  };

  const updateCell = (index: number, updates: Partial<GridCellData>) => {
    setCells(prev => {
        const newCells = [...prev];
        if (!newCells[index]) return prev;
        newCells[index] = { ...newCells[index], ...updates };
        if (updates.imageSrc !== undefined && appMode === 'vocab') {
             const wordId = newCells[index].wordId;
             if (wordId) {
                 if (updates.imageSrc) imageCache.current.set(wordId, updates.imageSrc);
                 else imageCache.current.delete(wordId);
             }
        }
        return newCells;
    });
    if (updates.wordId !== undefined) {
         const newAssignments = [...gridAssignments];
         newAssignments[index] = updates.wordId;
         onGridUpdate(newAssignments);
    }
  };
  
  const handleDragStart = (e: React.DragEvent, index: number) => {
      setDraggedIndex(index);
      e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
      e.preventDefault();
      if (draggedIndex === null || draggedIndex === targetIndex) return;
      const newAssignments = [...gridAssignments];
      const draggedWordId = newAssignments[draggedIndex];
      newAssignments.splice(draggedIndex, 1);
      newAssignments.splice(targetIndex, 0, draggedWordId);
      onGridUpdate(newAssignments);
      if (appMode === 'collage') {
          setCells(prev => {
              const newCells = [...prev];
              if (draggedIndex === null) return prev;
              const draggedCell = newCells[draggedIndex];
              newCells.splice(draggedIndex, 1);
              newCells.splice(targetIndex, 0, draggedCell);
              return newCells;
          });
      }
      setDraggedIndex(null);
      onActiveCellChange(targetIndex);
  };

  const handleStitchImages = async () => {
    if (cells.length === 0 || cells.some(c => !c.imageSrc)) return;
    setIsStitching(true);
    try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const size = 2048; 
        canvas.width = size;
        canvas.height = size;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, size, size);
        const loadedImages = await Promise.all(cells.map(cell => {
            return new Promise<HTMLImageElement>((resolve, reject) => {
                const img = new Image();
                img.crossOrigin = "anonymous";
                img.onload = () => resolve(img);
                img.onerror = reject;
                img.src = cell.imageSrc!;
            });
        }));
        const drawCell = (cellIndex: number, x: number, y: number, w: number, h: number) => {
             const img = loadedImages[cellIndex];
             const cell = cells[cellIndex];
             const wordItem = appMode === 'vocab' ? vocabItems.find(v => v.id === cell.wordId) : undefined;
             drawCellContent(ctx, img, cell, wordItem, x, y, w, h);
        };
        const w = size;
        const h = size;
        switch (layoutId) {
            case 0: if(cells[0]) drawCell(0, 0, 0, w, h); break;
            case 1: if(cells[0]) drawCell(0, 0, 0, w/2, h); if(cells[1]) drawCell(1, w/2, 0, w/2, h); break;
            case 2: if(cells[0]) drawCell(0, 0, 0, w, h/2); if(cells[1]) drawCell(1, 0, h/2, w, h/2); break;
            case 3: 
                if(cells[0]) drawCell(0, 0, 0, w/2, h/2); if(cells[1]) drawCell(1, w/2, 0, w/2, h/2); 
                if(cells[2]) drawCell(2, 0, h/2, w/2, h/2); if(cells[3]) drawCell(3, w/2, h/2, w/2, h/2); 
                break;
            case 4: if(cells[0]) drawCell(0, 0, 0, w/2, h); if(cells[1]) drawCell(1, w/2, 0, w/2, h/2); if(cells[2]) drawCell(2, w/2, h/2, w/2, h/2); break;
            case 5: if(cells[0]) drawCell(0, 0, 0, w/2, h/2); if(cells[1]) drawCell(1, 0, h/2, w/2, h/2); if(cells[2]) drawCell(2, w/2, 0, w/2, h); break;
            case 6: 
                const s = w/3;
                for(let i=0; i<3; i++) for(let j=0; j<3; j++) {
                    const idx = i*3 + j;
                    if (cells[idx]) drawCell(idx, j*s, i*s, s, s);
                }
                break;
        }
        if (dividerConfig.show) {
            ctx.strokeStyle = dividerConfig.color;
            ctx.lineWidth = dividerConfig.thickness;
            ctx.lineCap = 'butt';
            if (dividerConfig.style === 'dashed') ctx.setLineDash([dividerConfig.thickness * 2, dividerConfig.thickness * 1.5]);
            else if (dividerConfig.style === 'dotted') ctx.setLineDash([dividerConfig.thickness, dividerConfig.thickness]);
            else ctx.setLineDash([]);
            const drawLine = (x1: number, y1: number, x2: number, y2: number) => {
                ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
            };
            const midW = w/2, midH = h/2, thirdW = w/3, thirdH = h/3;
            switch (layoutId) {
                case 1: drawLine(midW, 0, midW, h); break;
                case 2: drawLine(0, midH, w, midH); break;
                case 3: drawLine(midW, 0, midW, h); drawLine(0, midH, w, midH); break;
                case 4: drawLine(midW, 0, midW, h); drawLine(midW, midH, w, midH); break;
                case 5: drawLine(midW, 0, midW, h); drawLine(0, midH, midW, midH); break;
                case 6: 
                    drawLine(thirdW, 0, thirdW, h); drawLine(thirdW*2, 0, thirdW*2, h);
                    drawLine(0, thirdH, w, thirdH); drawLine(0, thirdH*2, w, thirdH*2);
                    break;
            }
        }
        setStitchedImage(canvas.toDataURL('image/png'));
    } catch (e) {
        setError("Failed to create stitched layout.");
    } finally {
        setIsStitching(false);
    }
  };

  const getGridClasses = () => {
    switch (layoutId) {
        case 0: return "grid-cols-1";
        case 1: return "grid-cols-1 lg:grid-cols-2"; 
        case 2: return "grid-cols-1";
        case 3: return "grid-cols-1 lg:grid-cols-2";
        case 4: return "grid-cols-1 lg:grid-cols-2";
        case 5: return "grid-cols-1 lg:grid-cols-2";
        case 6: return "grid-cols-1 lg:grid-cols-3";
        default: return "grid-cols-1";
    }
  };

  const getCellSpanClasses = (index: number) => {
    if (layoutId === 4 && index === 0) return `lg:row-span-2 h-full`;
    if (layoutId === 5 && index === 2) return `lg:row-span-2 lg:col-start-2 lg:row-start-1 h-full`;
    return "";
  };

  const getCellAspectRatioClass = (index: number) => {
     switch(layoutId) {
         case 1: return "aspect-[9/16]"; 
         case 2: return "aspect-[16/9]";
         case 4: if (index === 0) return "aspect-square lg:aspect-auto lg:h-full lg:w-full"; return "aspect-square";
         case 5: if (index === 2) return "aspect-square lg:aspect-auto lg:h-full lg:w-full"; return "aspect-square";
         default: return "aspect-square";
     }
  };

  if (appMode === 'vocab' && !selectedItem && layoutId === 0) {
    return (
        <div className="flex-1 h-full flex flex-col items-center justify-center p-8 text-center relative overflow-hidden bg-gray-50">
            <div className="absolute inset-0 bg-[#f9fafb]">
                <div className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] bg-slate-200/50 rounded-full blur-[100px] mix-blend-multiply opacity-60"></div>
                <div className="absolute top-[40%] -right-[10%] w-[60%] h-[60%] bg-orange-100/80 rounded-full blur-[100px] mix-blend-multiply opacity-80"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[40%] h-[40%] bg-white/60 blur-[80px] rounded-full"></div>
            </div>
            <style>{`
                @keyframes space-float { 0%, 100% { transform: translateY(10px); } 50% { transform: translateY(-10px); } }
                @keyframes space-drift { 0%, 100% { transform: rotate(-1deg); } 50% { transform: rotate(1deg); } }
                @keyframes star-slide { from { transform: translateX(0); } to { transform: translateX(100vw); } }
                .animate-space-float { animation: space-float 7s ease-in-out infinite; }
                .animate-space-drift { animation: space-drift 5s ease-in-out infinite; }
                .animate-drift-far { animation: star-slide 120s linear infinite; }
                .animate-drift-mid { animation: star-slide 80s linear infinite; }
                .animate-drift-near { animation: star-slide 40s linear infinite; }
            `}</style>
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute inset-0 animate-drift-far opacity-30">
                    {starsFar.map((star) => <div key={`far-${star.id}`} className="absolute rounded-full bg-slate-400 w-[2px] h-[2px]" style={{ left: star.left, top: star.top }}></div>)}
                    {starsFar.map((star) => <div key={`far-dup-${star.id}`} className="absolute rounded-full bg-slate-400 w-[2px] h-[2px]" style={{ left: `calc(${star.left} - 100vw)`, top: star.top }}></div>)}
                </div>
            </div>
            <div className="relative mb-8 z-10 animate-space-float">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-white/60 blur-3xl rounded-full pointer-events-none"></div>
                <div className="relative animate-space-drift group cursor-pointer">
                    <img 
                        src={customCharacter || "https://img.freepik.com/free-vector/hand-drawn-cat-astronaut-illustration_23-2151368058.jpg"}
                        alt="Sir Isaac Astronaut" 
                        className="relative h-80 w-auto object-contain drop-shadow-[0_20px_50px_rgba(0,0,0,0.15)] transform transition-transform duration-500 group-hover:scale-105"
                    />
                    <label className="absolute bottom-10 right-0 bg-orange-500 hover:bg-orange-600 text-white p-2.5 rounded-full shadow-lg border-2 border-white cursor-pointer z-30 transition-all duration-300 opacity-0 group-hover:opacity-100 hover:scale-110 flex items-center justify-center group/edit" title="Upload your own cat image">
                        <input type="file" accept="image/*" onChange={handleCharacterUpload} className="hidden" />
                        <Edit3 size={16} />
                    </label>
                </div>
            </div>
            <h2 className="text-3xl font-black text-slate-800 mb-3 tracking-tight z-10">Welcome to Vocab Studio!</h2>
            <p className="text-lg text-slate-500 max-w-md leading-relaxed z-10 font-medium">Use the <span className="font-bold text-orange-700 bg-orange-100 border border-orange-200 px-2 py-0.5 rounded-md mx-1">Setup Panel</span> to generate a vocabulary list based on your interests.</p>
        </div>
    )
  }

  return (
    <div className="flex-1 h-full overflow-y-auto p-4 md:p-8 flex flex-col items-center bg-gray-50/50">
       <div className="flex flex-col items-center gap-4 mb-8 sticky top-0 z-40 w-fit max-w-[95vw]">
            <div className="flex flex-nowrap items-center gap-1 md:gap-2 p-1.5 md:p-2 bg-white/90 backdrop-blur rounded-full border-2 border-gray-800 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] no-scrollbar overflow-x-auto">
                {LAYOUTS.map((l) => (
                    <button
                        key={l.id}
                        onClick={() => onLayoutChange(l.id, l.count)}
                        className={`p-1.5 md:p-3 rounded-full border-2 transition-all shrink-0 ${layoutId === l.id ? 'bg-orange-500 text-white border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transform -translate-y-0.5' : 'border-transparent text-gray-400 hover:bg-gray-100'}`}
                        title={l.name}
                    >
                        <div className="w-5 h-5 md:w-6 md:h-6">{l.icon}</div>
                    </button>
                ))}
            </div>
            {layoutId > 0 && appMode === 'vocab' && (
                <div className="flex items-center gap-2 p-1.5 bg-white/90 backdrop-blur rounded-xl border border-gray-300 shadow-sm animate-in fade-in slide-in-from-top-2">
                    <button onClick={toggleAllInfo} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${allInfoVisible ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}><Type size={14} />{allInfoVisible ? 'Hide All Words' : 'Show All Words'}</button>
                    <div className="w-px h-4 bg-gray-300"></div>
                    <button onClick={toggleAllSentences} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${allSentencesVisible ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}><MessageSquare size={14} />{allSentencesVisible ? 'Hide All Sentences' : 'Show All Sentences'}</button>
                </div>
            )}
       </div>

       <div className={`w-full max-w-4xl grid gap-3 md:gap-x-6 md:gap-y-10 mb-12 ${getGridClasses()}`}>
            {cells.map((cell, index) => {
                const cellWordItem = appMode === 'vocab' ? vocabItems.find(v => v.id === cell.wordId) : undefined;
                const isSelected = activeCellIndex === index;
                const cellScale = getCellScale(layoutId, index);
                return (
                    <div 
                        key={cell.id} 
                        className={`flex flex-col gap-3 ${getCellSpanClasses(index)} ${draggedIndex === index ? 'opacity-50' : 'opacity-100'}`}
                        onClick={() => onActiveCellChange(index)}
                        draggable
                        onDragStart={(e) => handleDragStart(e, index)}
                        onDragEnd={() => setDraggedIndex(null)}
                        onDragOver={(e) => handleDragOver(e, index)}
                        onDrop={(e) => handleDrop(e, index)}
                    >
                        <div className={`bg-white rounded-xl border-2 overflow-hidden transition-all duration-300 group cursor-grab active:cursor-grabbing h-full flex flex-col ${isSelected ? 'border-blue-500 shadow-[6px_6px_0px_0px_#3b82f6] -translate-y-1 ring-2 ring-blue-100' : 'border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] hover:border-gray-600 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]'}`}>
                            <div className={`p-3 border-b-2 flex flex-col gap-2 shrink-0 ${isSelected ? 'bg-blue-50 border-blue-500' : 'bg-gray-50 border-gray-900'}`}>
                                <div className="flex items-center gap-2 justify-between">
                                    <div className="flex items-center gap-2 flex-1 overflow-hidden">
                                        <div className={`w-6 h-6 shrink-0 rounded-full flex items-center justify-center text-xs text-white font-bold ${isSelected ? 'bg-blue-500' : 'bg-gray-500'}`}>{index + 1}</div>
                                        {appMode === 'vocab' ? (
                                            <select 
                                                className="bg-transparent w-full outline-none cursor-pointer truncate font-bold text-sm"
                                                value={cell.wordId || 0}
                                                onChange={(e) => {
                                                    const newWordId = Number(e.target.value);
                                                    const newAssignments = [...gridAssignments];
                                                    if (newWordId !== 0) {
                                                        const existingIndex = newAssignments.indexOf(newWordId);
                                                        if (existingIndex !== -1 && existingIndex !== index) newAssignments[existingIndex] = 0;
                                                    }
                                                    newAssignments[index] = newWordId;
                                                    onGridUpdate(newAssignments);
                                                }}
                                            >
                                                <option value={0}>Select a word...</option>
                                                {vocabItems.map(v => <option key={v.id} value={v.id}>{v.word}</option>)}
                                            </select>
                                        ) : <span className="font-bold text-gray-400 text-sm">Image Box</span>}
                                    </div>
                                    {appMode === 'vocab' && (
                                        <div className="flex items-center gap-1 bg-white/50 p-1 rounded-md border border-gray-200">
                                            <button onClick={(e) => { e.stopPropagation(); updateCell(index, { showWordInfo: !cell.showWordInfo }); }} className={`p-1 rounded transition-colors ${cell.showWordInfo ? 'bg-blue-200 text-blue-800' : 'text-gray-400 hover:bg-gray-200'}`}><Type size={14} /></button>
                                            <button onClick={(e) => { e.stopPropagation(); updateCell(index, { showSentences: !cell.showSentences }); }} className={`p-1 rounded transition-colors ${cell.showSentences ? 'bg-green-200 text-green-800' : 'text-gray-400 hover:bg-gray-200'}`}><MessageSquare size={14} /></button>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className={`relative flex-1 ${getCellAspectRatioClass(index)} bg-gray-100 flex items-center justify-center overflow-hidden`}>
                                {cell.isLoading ? <RefreshCw className="animate-spin text-orange-500" size={32} /> : cell.imageSrc ? (
                                    <>
                                        <img src={cell.imageSrc} alt={`Cell ${index}`} className="w-full h-full object-cover block" />
                                        {appMode === 'vocab' && cellWordItem && cell.showWordInfo && (
                                            <div className="absolute top-0 left-0 right-0 bg-white/90 p-3 backdrop-blur-sm border-b border-gray-200 animate-in fade-in slide-in-from-top-2 z-10 text-center">
                                                <div className="flex items-baseline gap-2 mb-1 justify-center flex-wrap">
                                                    <span className="font-black leading-none" style={{ fontSize: `${2.25 * cellScale}rem` }}>{cellWordItem.word}</span>
                                                    <span className="font-sans text-gray-600" style={{ fontSize: `${1.1 * cellScale}rem` }}>{cellWordItem.phonetic}</span>
                                                </div>
                                                <div className="font-bold chinese-text text-gray-900 leading-snug line-clamp-2" style={{ fontSize: `${1.25 * cellScale}rem`, lineHeight: 1.4 }}>{cellWordItem.definition}</div>
                                            </div>
                                        )}
                                        {appMode === 'vocab' && cellWordItem && cell.showSentences && (
                                            <div className="absolute bottom-0 left-0 right-0 bg-black/75 p-2 backdrop-blur-sm text-white animate-in fade-in slide-in-from-bottom-2 z-10 text-center">
                                                <p className="font-bold leading-snug mb-1 opacity-95 line-clamp-3" style={{ fontSize: `${1.1 * cellScale}rem`, lineHeight: 1.4 }}>{cellWordItem.englishSentence}</p>
                                                <p className="chinese-text text-gray-300 leading-snug line-clamp-3" style={{ fontSize: `${1.1 * cellScale}rem`, lineHeight: 1.4 }}>{cellWordItem.targetSentence}</p>
                                            </div>
                                        )}
                                        <div className="absolute top-2 right-2 flex gap-1 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
                                             <button onClick={(e) => handleCopySingle(e, index)} className="p-1.5 bg-purple-500/80 text-white rounded hover:bg-purple-600 backdrop-blur-sm transition-colors"><Copy size={14} /></button>
                                             <button onClick={(e) => handleDownloadSingle(e, index)} className="p-1.5 bg-blue-500/80 text-white rounded hover:bg-blue-600 backdrop-blur-sm transition-colors"><Download size={14} /></button>
                                            <button onClick={(e) => { e.stopPropagation(); handleClearCell(index); }} className="p-1.5 bg-red-500/80 text-white rounded hover:bg-red-600 backdrop-blur-sm transition-colors"><Trash2 size={14} /></button>
                                        </div>
                                    </>
                                ) : <div className="flex flex-col items-center gap-2 text-gray-300 p-4 text-center"><ImageIcon size={32} /><span className="text-xs font-bold uppercase">{appMode === 'vocab' ? "Ready" : "Upload"}</span></div>}
                            </div>
                        </div>
                        <div className={`grid gap-2 shrink-0 ${appMode === 'vocab' ? 'grid-cols-2' : 'grid-cols-1'}`}>
                             {appMode === 'vocab' && (
                                <button onClick={(e) => { e.stopPropagation(); handleGenerateCell(index, 'create'); onActiveCellChange(index); }} disabled={!cellWordItem} className="h-10 bg-white border-2 border-gray-900 rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-orange-50 active:translate-y-0.5 active:shadow-none disabled:opacity-50 transition-all flex items-center justify-center gap-1 text-xs font-bold"><RefreshCw size={14} /> Generate</button>
                             )}
                            <label className={`h-10 bg-white border-2 border-gray-900 rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-blue-50 active:translate-y-0.5 active:shadow-none transition-all flex items-center justify-center gap-1 text-xs font-bold cursor-pointer ${appMode === 'collage' ? 'w-full' : ''}`}><Upload size={14} /> Upload<input type="file" accept="image/*" onChange={(e) => handleFileUpload(index, e)} className="hidden" /></label>
                        </div>
                    </div>
                );
            })}
        </div>

      <div className="w-full max-w-4xl mb-8">
        <div className={`bg-white rounded-2xl border-4 border-gray-900 p-4 md:p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-colors ${layoutId > 0 && applyToAll ? 'ring-4 ring-purple-200' : ''}`}>
             <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-2 text-xl font-black text-gray-900"><div className="bg-purple-600 text-white p-2 rounded-lg border-2 border-black transform -rotate-3"><Wand2 size={20} /></div>Magic Editor</div>
                {layoutId > 0 && (
                    <div onClick={() => setApplyToAll(!applyToAll)} className={`cursor-pointer flex items-center gap-2 px-3 py-1.5 rounded-lg border-2 border-black font-bold text-sm transition-all select-none ${applyToAll ? 'bg-purple-100 text-purple-900' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                        <div className={`w-5 h-5 rounded border-2 border-black flex items-center justify-center bg-white ${applyToAll ? 'border-purple-600' : 'border-gray-400'}`}>{applyToAll && <Check size={14} className="text-purple-600 stroke-[4]" />}</div>Apply to ALL
                    </div>
                )}
             </div>
             <div className="flex flex-col md:flex-row gap-3">
                <div className="flex-1 relative">
                    <input className="w-full h-12 px-4 border-2 border-gray-900 rounded-xl focus:outline-none focus:border-purple-600 focus:ring-4 focus:ring-purple-100 font-medium bg-gray-50" placeholder="Describe changes... e.g., 'Make it watercolor style'" value={magicPrompt} onChange={(e) => setMagicPrompt(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleMagicApply()} />
                    {layoutId > 0 && !applyToAll && <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold bg-orange-100 text-orange-800 px-2 py-1 rounded border border-orange-300 pointer-events-none">Editing #{activeCellIndex + 1}</div>}
                </div>
                <button onClick={handleMagicApply} disabled={!magicPrompt.trim()} className="h-12 px-6 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 text-white font-bold rounded-xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2">Apply Magic</button>
             </div>
        </div>
      </div>

      <div className="w-full max-w-4xl pb-10">
           {error && <div className="bg-red-100 border-2 border-red-500 text-red-700 px-4 py-3 rounded-xl shadow-[4px_4px_0px_0px_#ef4444] mb-4 font-bold">{error}</div>}
            
            {(layoutId > 0 || appMode === 'collage') && (
                <div className="bg-gray-100 p-4 rounded-xl border-2 border-gray-200 mb-4 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-6 justify-center md:justify-start">
                        <div className="flex items-center gap-2 font-bold text-gray-700"><Settings2 size={20} /> Collage Settings</div>
                        <div className="flex items-center gap-4 flex-wrap justify-center">
                            <label className="flex items-center gap-2 cursor-pointer select-none">
                                <div className={`w-10 h-6 rounded-full p-1 transition-colors ${dividerConfig.show ? 'bg-indigo-500' : 'bg-gray-300'}`} onClick={() => setDividerConfig(prev => ({...prev, show: !prev.show}))}>
                                    <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${dividerConfig.show ? 'translate-x-4' : 'translate-x-0'}`} />
                                </div><span className="text-sm font-semibold text-gray-600">Divider Lines</span>
                            </label>
                            {dividerConfig.show && (
                                <div className="flex items-center gap-3 animate-in fade-in slide-in-from-left-2">
                                    <input type="color" value={dividerConfig.color} onChange={(e) => setDividerConfig(prev => ({...prev, color: e.target.value}))} className="w-8 h-8 rounded cursor-pointer border-2 border-gray-300 p-0.5" />
                                    <div className="flex items-center gap-2 bg-white px-2 py-1 rounded border border-gray-300">
                                        <GripHorizontal size={14} className="text-gray-400" />
                                        <input type="range" min="2" max="50" value={dividerConfig.thickness} onChange={(e) => setDividerConfig(prev => ({...prev, thickness: Number(e.target.value)}))} className="w-24 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-500" />
                                    </div>
                                    <div className="flex gap-1 bg-white p-1 rounded border border-gray-300">
                                        <button onClick={() => setDividerConfig(prev => ({...prev, style: 'solid'}))} className={`p-1 rounded ${dividerConfig.style === 'solid' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-400'}`}><Minus size={16} strokeWidth={3} /></button>
                                        <button onClick={() => setDividerConfig(prev => ({...prev, style: 'dashed'}))} className={`p-1 rounded ${dividerConfig.style === 'dashed' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-400'}`}><MoreHorizontal size={16} /></button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleClearAllImages}
                            className="flex items-center gap-2 px-6 py-2.5 bg-white border-2 border-red-200 hover:border-red-500 hover:bg-red-50 text-red-500 hover:text-red-700 rounded-xl font-black transition-all shadow-sm active:scale-95 group relative overflow-hidden"
                            title="Reset Canvas"
                        >
                           <RotateCcw size={18} className="group-hover:-rotate-180 transition-transform duration-500 ease-in-out" />
                           <span className="text-sm tracking-tight uppercase">Clear Canvas</span>
                        </button>
                    </div>
                </div>
            )}

            {layoutId > 0 && cells.every(c => c.imageSrc) && !stitchedImage && (
                <button onClick={handleStitchImages} disabled={isStitching} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl border-2 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2">
                     {isStitching ? <RefreshCw className="animate-spin" /> : <Layers size={24} />}<span className="text-lg">Stitch & Download Collage</span>
                </button>
            )}

            {stitchedImage && (
                <div className="bg-white border-2 border-black p-4 rounded-2xl shadow-[8px_8px_0px_0px_#4f46e5] flex flex-col md:flex-row items-center gap-6 animate-in fade-in slide-in-from-bottom-4">
                    <img src={stitchedImage} alt="Stitched Result" className="w-32 h-32 object-cover rounded-xl border-2 border-black" />
                    <div className="flex-1 text-center md:text-left"><h4 className="font-black text-2xl text-indigo-900 mb-1">Collage Ready!</h4><p className="font-medium text-gray-600">Your board has been assembled.</p></div>
                    <div className="flex gap-2">
                        <a href={stitchedImage} download="collage.png" className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none font-bold flex items-center gap-2"><Download size={20} /> Save</a>
                        <button onClick={() => setStitchedImage(null)} className="p-3 hover:bg-gray-100 rounded-xl transition-all"><X size={24} /></button>
                    </div>
                </div>
            )}
      </div>
    </div>
  );
};