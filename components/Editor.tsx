
import React, { useState, useEffect, useRef } from 'react';
import { VocabItem, AppMode, Character, CHARACTERS } from '../types';
import { generateImageContent } from '../services/geminiService';
import { deleteImage } from '../services/imageCacheDB';
import { RefreshCw, Wand2, Download, Layers, X, Image as ImageIcon, Upload, Check, MessageSquare, Type, Trash2, Settings2, Minus, MoreHorizontal, GripHorizontal, Copy, RotateCcw, ChevronLeft, ChevronRight } from 'lucide-react';

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
    initialImageCache?: Record<string, string>;
    onImageCacheChange?: (cache: Record<string, string>) => void;
  onStitchedImageChange?: (img: string | null) => void;
  selectedCharacter?: Character;
  onCharacterChange?: (char: Character) => void;
}

interface GridCellData {
  id: string;
  imageSrc: string | null;
  isLoading: boolean;
  prompt: string; 
  wordId: number; 
  showWordInfo: boolean;
  showSentences: boolean;
}

interface DividerConfig {
    show: boolean;
    color: string;
    style: 'solid' | 'dashed' | 'dotted';
    thickness: number;
}

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

const drawRoundedRect = (ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number, fillStyle: string) => {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(radius, y + height);
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
        let sx = 0, sy = 0, sw = img.width, sw_h = img.height;
        if (ratio > targetRatio) {
            sw = img.height * targetRatio;
            sx = (img.width - sw) / 2;
        } else {
            sw_h = img.width / targetRatio;
            sy = (img.height - sw_h) / 2;
        }
        ctx.drawImage(img, sx, sy, sw, sw_h, x, y, w, h);
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
    onActiveCellChange = (_index: number) => {},
    appMode = 'vocab',
    initialImageCache = {},
    onImageCacheChange,
    onStitchedImageChange,
    selectedCharacter,
    onCharacterChange
}) => {
    // Separate cells state for each mode
    const [vocabCells, setVocabCells] = useState<GridCellData[]>([]);
    const [collageCells, setCollageCells] = useState<GridCellData[]>([]);

    // Get/set cells based on current mode
    const cells = appMode === 'vocab' ? vocabCells : collageCells;
    const setCells = appMode === 'vocab' ? setVocabCells : setCollageCells;

  const cellsRef = useRef<GridCellData[]>([]);
  useEffect(() => { cellsRef.current = cells; }, [cells]);

    // Separate layout persistence for each mode
    const vocabLayoutPersistence = useRef<Record<number, GridCellData[]>>({});
    const collageLayoutPersistence = useRef<Record<number, GridCellData[]>>({});
    const layoutPersistence = appMode === 'vocab' ? vocabLayoutPersistence : collageLayoutPersistence;

  const prevLayoutId = useRef<number>(layoutId);
    const prevAppMode = useRef<AppMode>(appMode);
  const [starsFar] = useState(() => generateStars(40));
  
    // Separate image caches for each mode - now using string keys
    // vocab: "vocab_123", collage: "collage_0"
    const imageCacheRef = useRef<Map<string, string>>(new Map());

    // Update cache ref when initialImageCache changes (after async IndexedDB load)
    // Also restore images to cells that are already rendered
    useEffect(() => {
        if (Object.keys(initialImageCache).length > 0) {
            // Update the ref
            Object.entries(initialImageCache).forEach(([key, value]) => {
                imageCacheRef.current.set(key, value as string);
            });

            // Restore vocab images to cells
            setVocabCells(prevCells => {
                if (prevCells.length === 0) return prevCells;
                let hasChanges = false;
                const newCells = prevCells.map(cell => {
                    if (cell.wordId && !cell.imageSrc) {
                        const cacheKey = `vocab_${cell.wordId}`;
                        const cachedImage = imageCacheRef.current.get(cacheKey);
                        if (cachedImage) {
                            hasChanges = true;
                            return { ...cell, imageSrc: cachedImage };
                        }
                    }
                    return cell;
                });
                return hasChanges ? newCells : prevCells;
            });

            // Restore collage images to cells
            setCollageCells(prevCells => {
                if (prevCells.length === 0) return prevCells;
                let hasChanges = false;
                const newCells = prevCells.map((cell, idx) => {
                    if (!cell.imageSrc) {
                        const cacheKey = `collage_${layoutId}_${idx}`;
                        const cachedImage = imageCacheRef.current.get(cacheKey);
                        if (cachedImage) {
                            hasChanges = true;
                            return { ...cell, imageSrc: cachedImage };
                        }
                    }
                    return cell;
                });
                return hasChanges ? newCells : prevCells;
            });
        }
    }, [initialImageCache, layoutId]);
  const [magicPrompt, setMagicPrompt] = useState("");
  const [applyToAll, setApplyToAll] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stitchedImage, setStitchedImage] = useState<string | null>(null);
  const [isStitching, setIsStitching] = useState(false);
  const [dividerConfig, setDividerConfig] = useState<DividerConfig>({
      show: false, color: '#ffffff', style: 'solid', thickness: 20
  });
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

    const [carouselRotation, setCarouselRotation] = useState(() => {
        const idx = Math.max(0, CHARACTERS.findIndex(c => c.id === selectedCharacter?.id));
        return idx * -120;
    });

    const characterIndex = Math.max(0, CHARACTERS.findIndex(c => c.id === selectedCharacter?.id));
  const dragStartPos = useRef<number | null>(null);

    useEffect(() => {
        const currentTargetIndex = Math.max(0, CHARACTERS.findIndex(c => c.id === selectedCharacter?.id));
        const currentAngleNormalized = ((-carouselRotation / 120) % CHARACTERS.length + CHARACTERS.length) % CHARACTERS.length;
        if (Math.abs(currentAngleNormalized - currentTargetIndex) > 0.1) {
            setCarouselRotation(currentTargetIndex * -120);
        }
    }, [selectedCharacter?.id]);

  useEffect(() => {
    if (appMode === 'vocab' && vocabItems.length === 0) return;

      // Save cells when MODE changes (switching between vocab and collage)
      if (prevAppMode.current !== appMode) {
          // Save the PREVIOUS mode's cells before switching
          if (prevAppMode.current === 'collage') {
              collageLayoutPersistence.current[prevLayoutId.current] = [...collageCells];
          }
          // Note: vocab cells are already persisted via imageCacheRef, no need to save here
      }

      // Save previous layout cells when layout changes (only for current mode, same mode)
      if (prevLayoutId.current !== undefined && prevLayoutId.current !== layoutId && prevAppMode.current === appMode) {
          if (appMode === 'collage') {
              collageLayoutPersistence.current[prevLayoutId.current] = [...collageCells];
        }
      }

      if (appMode === 'collage') {
          const savedLayoutData = collageLayoutPersistence.current[layoutId];
        let newCells: GridCellData[] = [];
        if (savedLayoutData && savedLayoutData.length === gridAssignments.length) {
            newCells = [...savedLayoutData];
        } else {
             for (let i = 0; i < gridAssignments.length; i++) {
                 // Try to restore cached image for collage
                 const cacheKey = `collage_${layoutId}_${i}`;
                 const cachedImage = imageCacheRef.current.get(cacheKey) || null;
                newCells.push({
                    id: `cell-collage-${i}-${layoutId}-${Date.now()}`,
                    imageSrc: cachedImage, isLoading: false, prompt: "", wordId: 0, showWordInfo: false, showSentences: false
                });
            }
        }
          setCollageCells(newCells);
    } else {
          setVocabCells(prevCells => {
            const newCells: GridCellData[] = [];
            for (let i = 0; i < gridAssignments.length; i++) {
                const wordId = gridAssignments[i];
                let existingCell: GridCellData | undefined;
                const existingIndex = prevCells.findIndex(c => c.wordId === wordId && wordId !== 0);
                if (existingIndex !== -1) existingCell = prevCells[existingIndex];
                let cachedImage = null;
                const cacheKey = `vocab_${wordId}`;
                if (wordId !== 0 && imageCacheRef.current.has(cacheKey)) {
                    cachedImage = imageCacheRef.current.get(cacheKey)!;
                }
                if (existingCell) {
                     newCells.push({ ...existingCell, id: `cell-${wordId}-${i}` });
                } else {
                     newCells.push({
                        id: `cell-${wordId}-${i}`,
                        imageSrc: cachedImage, isLoading: false, prompt: "", wordId: wordId, showWordInfo: false, showSentences: false 
                     });
                }
            }
            return newCells;
        });
      }

      prevLayoutId.current = layoutId;
      prevAppMode.current = appMode;
    setStitchedImage(null); 
    onStitchedImageChange?.(null);
  }, [gridAssignments, vocabItems, appMode, layoutId]); 

  useEffect(() => {
      // Export all images (both vocab and collage) to parent
      if (onImageCacheChange) {
          const cache: Record<string, string> = {};
          imageCacheRef.current.forEach((val, key) => { cache[key] = val; });
          onImageCacheChange(cache);
      }
  }, [vocabCells, collageCells, appMode]);

  const rotateCarousel = (direction: 'left' | 'right') => {
      const totalChars = CHARACTERS.length;
      const step = 120;

      if (direction === 'left') {
          setCarouselRotation(prev => prev + step);
          const nextIndex = (characterIndex - 1 + totalChars) % totalChars;
          if (onCharacterChange) onCharacterChange(CHARACTERS[nextIndex]);
      } else {
          setCarouselRotation(prev => prev - step);
          const nextIndex = (characterIndex + 1) % totalChars;
          if (onCharacterChange) onCharacterChange(CHARACTERS[nextIndex]);
      }
  };

  const handleCharClick = (idx: number) => {
      if (idx === characterIndex) return;
      const totalChars = CHARACTERS.length;
      let diff = idx - characterIndex;
      if (diff > totalChars / 2) diff -= totalChars;
      if (diff < -totalChars / 2) diff += totalChars;
      setCarouselRotation(prev => prev - (diff * 120));
      if (onCharacterChange) onCharacterChange(CHARACTERS[idx]);
  };

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
      const canvas = await renderCellToCanvas(cell, item!, layoutId, index);
      const downloadUrl = canvas ? canvas.toDataURL('image/png') : cell.imageSrc;
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
      } catch (err) { console.error("Copy failed", err); }
  };

  const handleGenerateCell = async (index: number, mode: 'create' | 'edit') => {
    const cell = cells[index];
    if (!cell) return;
    const targetWordItem = vocabItems.find(v => v.id === cell.wordId);

      // Dynamic Identity Injection
      const mascotSignature = selectedCharacter?.promptSignature || "the character";
      let promptToUse = "";

      if (mode === 'create') {
          if (!targetWordItem && appMode === 'vocab') {
              setError("Please select a word first.");
              return;
          }

          // Base dynamic prompt generated by the AI includes instructions for context-specific clothing
          const dynamicScene = targetWordItem?.imagePrompt || "[MASCOT] in a relevant setting";

          // Strategy: Embed the mascot's physical traits into the context-aware scene
          promptToUse = dynamicScene.replace(/\[MASCOT\]/gi, mascotSignature);

          // Ensure consistent art style
          if (!promptToUse.toLowerCase().includes("watercolor")) {
              promptToUse = `Soft watercolor and ink illustration of ${promptToUse}`;
          }
      } else {
          // For Magic Edit, we combine current character identity with the user's specific tweak
          promptToUse = `Update this watercolor scene featuring ${mascotSignature}: ${magicPrompt}. Keep the character's clothing and actions consistent with the word context.`;
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
      if (cell) {
          const cacheKey = appMode === 'vocab'
              ? `vocab_${cell.wordId}`
              : `collage_${layoutId}_${index}`;
          imageCacheRef.current.delete(cacheKey);
          // Immediately delete from IndexedDB
          deleteImage(cacheKey);
      }
      updateCell(index, { imageSrc: null });
  };

  const handleClearAllImages = (e: React.MouseEvent) => {
      e.stopPropagation(); 
      if (window.confirm("確定要清空畫布上的所有內容嗎？")) {
          if (appMode === 'vocab') {
              // Clear vocab-related cache
              cells.forEach(cell => {
                  if (cell.wordId) {
                      const cacheKey = `vocab_${cell.wordId}`;
                      imageCacheRef.current.delete(cacheKey);
                      deleteImage(cacheKey); // Immediately delete from IndexedDB
                  }
              });
              // Reset grid assignments to empty
              const emptyAssignments = new Array(gridAssignments.length).fill(0);
              onGridUpdate([...emptyAssignments]);
          } else {
              // Collage mode: clear collage images from cache
              cells.forEach((_, idx) => {
                  const cacheKey = `collage_${layoutId}_${idx}`;
                  imageCacheRef.current.delete(cacheKey);
                  deleteImage(cacheKey); // Immediately delete from IndexedDB
              });
              delete collageLayoutPersistence.current[layoutId];
          }

          // Reset cells for current view
          const forceResetToken = Date.now();
          const clearCellsFn = appMode === 'vocab' ? setVocabCells : setCollageCells;
          clearCellsFn(prev => prev.map((cell, i) => ({
              id: `cell-cleared-${i}-${layoutId}-${forceResetToken}`,
              imageSrc: null,
              wordId: appMode === 'vocab' ? 0 : cell.wordId,
              isLoading: false,
              prompt: "",
              showWordInfo: false,
              showSentences: false
          })));

          setStitchedImage(null); 
          onStitchedImageChange?.(null);
          setError(null);
          setMagicPrompt("");
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

  const updateCell = (index: number, updates: Partial<GridCellData>) => {
      const setterFn = appMode === 'vocab' ? setVocabCells : setCollageCells;
      setterFn(prev => {
        const newCells = [...prev];
        if (!newCells[index]) return prev;
        newCells[index] = { ...newCells[index], ...updates };
          // Cache images with appropriate key prefix
          if (updates.imageSrc !== undefined) {
              const cacheKey = appMode === 'vocab'
                  ? `vocab_${newCells[index].wordId}`
                  : `collage_${layoutId}_${index}`;
              if (updates.imageSrc) {
                  imageCacheRef.current.set(cacheKey, updates.imageSrc);
              } else {
                  imageCacheRef.current.delete(cacheKey);
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
      newAssignments.splice(draggedIndex as number, 1);
      newAssignments.splice(targetIndex, 0, draggedWordId);
      onGridUpdate(newAssignments);
      if (appMode === 'collage') {
          setCells(prev => {
              const newCells = [...prev];
              if (draggedIndex === null) return prev;
              const draggedCell = newCells[draggedIndex];
              newCells.splice(draggedIndex as number, 1);
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
            case 4: if (cells[0]) drawCell(0, 0, 0, w / 2, h); if (cells[1]) drawCell(1, w / 2, 0, w / 2, h / 2); if (cells[2]) drawCell(2, w / 2, h / 2, w / 2, h / 2); break;
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
        const result = canvas.toDataURL('image/png');
        setStitchedImage(result);
        onStitchedImageChange?.(result);
    } catch (e) { setError("Failed to create stitched layout."); }
    finally { setIsStitching(false); }
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
        <div className="flex-1 h-full flex flex-col items-center justify-start p-4 md:p-8 text-center relative overflow-hidden bg-gray-50 select-none">
            <div className="absolute inset-0 bg-[#f9fafb]">
                <div className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] bg-slate-200/50 rounded-full blur-[100px] mix-blend-multiply opacity-60"></div>
                <div className="absolute top-[40%] -right-[10%] w-[60%] h-[60%] bg-orange-100/80 rounded-full blur-[100px] mix-blend-multiply opacity-80"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[40%] h-[40%] bg-white/60 blur-[80px] rounded-full"></div>
            </div>
            <style>{`
                @keyframes space-float { 
                    0%, 100% { transform: translateY(12px); } 
                    50% { transform: translateY(-12px); } 
                }
                @keyframes star-slide { from { transform: translateX(0); } to { transform: translateX(100vw); } }
                .animate-space-float { animation: space-float 6s ease-in-out infinite; }
                .animate-drift-far { animation: star-slide 120s linear infinite; }
                
                .perspective-container {
                    perspective: 2500px;
                    width: 100%;
                    max-width: 1200px;
                    height: 400px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    position: relative;
                    margin-top: 2rem;
                    z-index: 20;
                }
                @media (min-width: 768px) {
                    .perspective-container {
                        height: 900px;
                        margin-top: -5rem; /* Overall Shift Up for Tablet */
                    }
                }
                @media (min-width: 1024px) {
                    .perspective-container {
                        height: 550px;
                        margin-top: -6rem; /* Overall Shift Up for Web */
                    }
                }
                
                .carousel-3d {
                    width: 100%;
                    height: 100%;
                    position: absolute;
                    transform-style: preserve-3d;
                    transition: transform 1.2s cubic-bezier(0.34, 1.56, 0.64, 1);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                
                .character-slot {
                    position: absolute;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    transform-style: preserve-3d;
                    transition: all 1s cubic-bezier(0.23, 1, 0.32, 1);
                    width: 100%;
                    left: 0;
                    right: 0;
                    margin: auto;
                }

                .nav-btn {
                    position: absolute;
                    z-index: 100;
                    padding: 1.25rem;
                    background: rgba(255, 255, 255, 0.2);
                    backdrop-filter: blur(10px);
                    border: 2px solid rgba(255, 255, 255, 0.3);
                    box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.1);
                    border-radius: 9999px;
                    color: #ea580c;
                    transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                }
                .nav-btn:hover {
                    transform: scale(1.15) translateY(-50%);
                    background: rgba(255, 255, 255, 0.9);
                    border-color: #ea580c;
                }
                .nav-btn:active {
                    transform: scale(0.9) translateY(-50%);
                }
                @media (max-width: 767px) {
                    .nav-btn {
                        padding: 0.8rem;
                        bottom: 80px;
                    }
                }
                /* Tablet & Web: Vertical Center alignment with info card */
                @media (min-width: 768px) {
                    .nav-btn {
                        top: 77%; 
                        transform: translateY(-50%);
                    }
                    /* Align button center with card edges */
                    .nav-btn.left-2 { 
                        left: 50%; 
                        margin-left: -290px; /* Card is roughly 520px wide in row mode */
                    }
                    .nav-btn.right-2 { 
                        right: 50%; 
                        margin-right: -290px;
                    }
                }
                @media (min-width: 1024px) {
                    .nav-btn {
                        top: 77%;
                        transform: translateY(-50%);
                    }
                    .nav-btn.left-2 { 
                        left: 50%; 
                        margin-left: -320px; 
                    }
                    .nav-btn.right-2 { 
                        right: 50%; 
                        margin-right: -320px;
                    }
                }
                
                .cyber-card {
                    background: rgba(255, 255, 255, 0.15);
                    backdrop-filter: blur(16px) saturate(180%);
                    -webkit-backdrop-filter: blur(16px) saturate(180%);
                    border-radius: 2rem;
                    border: 2px solid rgba(255, 255, 255, 0.4);
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
                    padding: 1.5rem 3rem;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    transform: translateZ(100px);
                    transition: all 0.5s ease;
                }
                
                /* Horizontal Layout for Tablet/Web */
                @media (min-width: 768px) {
                    .cyber-card {
                        flex-direction: row;
                        gap: 1.5rem;
                        padding: 0.75rem 1.75rem;
                        max-width: 90%;
                    }
                }
                
                .character-glow {
                    position: absolute;
                    width: 150%;
                    height: 150%;
                    background: radial-gradient(circle, rgba(251,146,60,0.4) 0%, rgba(251,146,60,0) 70%);
                    z-index: -1;
                    filter: blur(40px);
                }
            `}</style>
            
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute inset-0 animate-drift-far opacity-30">
                    {starsFar.map((star) => <div key={`far-${star.id}`} className="absolute rounded-full bg-slate-400 w-[2px] h-[2px]" style={{ left: star.left, top: star.top }}></div>)}
                    {starsFar.map((star) => <div key={`far-dup-${star.id}`} className="absolute rounded-full bg-slate-400 w-[2px] h-[2px]" style={{ left: `calc(${star.left} - 100vw)`, top: star.top }}></div>)}
                </div>
            </div>

            <div className="relative z-10 w-full h-full flex flex-col items-center pt-8 md:pt-4">
                <div className="shrink-0 flex flex-col items-center z-50">
                    <h2 className="text-4xl md:text-6xl lg:text-5xl font-black text-slate-800 mb-1 md:mb-2 tracking-tight drop-shadow-sm">Choose Your Pilot</h2>
                    <p className="text-sm md:text-2xl lg:text-lg text-slate-500 mb-2 md:mb-4 font-bold opacity-80 uppercase tracking-widest">Master of the Watercolor Realm</p>
                </div>
                
                <div className="perspective-container flex-1 min-h-0">
                    {/* Navigation buttons moved into shared alignment context */}
                    <button onClick={() => rotateCarousel('left')} className="nav-btn left-2" aria-label="Previous Pilot"><ChevronLeft className="w-6 h-6 md:w-8 md:h-8" /></button>
                    <button onClick={() => rotateCarousel('right')} className="nav-btn right-2" aria-label="Next Pilot"><ChevronRight className="w-6 h-6 md:w-8 md:h-8" /></button>

                    <div 
                        className="carousel-3d"
                        style={{ transform: `rotateY(${carouselRotation}deg)` }}
                        onMouseDown={(e) => dragStartPos.current = e.clientX}
                        onMouseUp={(e) => {
                            if (dragStartPos.current !== null) {
                                const diff = e.clientX - dragStartPos.current;
                                if (Math.abs(diff) > 70) rotateCarousel(diff > 0 ? 'left' : 'right');
                                dragStartPos.current = null;
                            }
                        }}
                    >
                        {CHARACTERS.map((char, idx) => {
                            const angle = idx * 120;
                            const isSelected = selectedCharacter?.id === char.id;
                            const isMobile = window.innerWidth < 768;
                            const isTablet = window.innerWidth >= 768 && window.innerWidth < 1024;
                            const translateZ = isMobile ? '160px' : (isTablet ? '450px' : '380px');

                            return (
                                <div key={char.id} className="character-slot" style={{ transform: `rotateY(${angle}deg) translateZ(${translateZ})` }} onClick={() => handleCharClick(idx)}>
                                    <div className={`relative transition-all duration-1000 transform flex flex-col items-center ${isSelected ? 'scale-[1.1] md:scale-[1.15] lg:scale-[1.25] opacity-100' : 'scale-[0.6] md:scale-[0.7] lg:scale-[0.8] opacity-70 blur-[1px]'}`}>
                                        {isSelected && <div className="character-glow animate-pulse"></div>}
                                        <div className={`absolute -bottom-10 left-1/2 -translate-x-1/2 w-[60%] h-12 bg-black/10 blur-3xl rounded-[100%] transition-all duration-1000 pointer-events-none ${isSelected ? 'opacity-100 scale-125' : 'opacity-0 scale-50'}`}></div>
                                        <img src={char.imageUrl} alt={char.name} className={`h-56 md:h-[32rem] lg:h-[28rem] w-auto object-contain drop-shadow-[0_40px_100px_rgba(0,0,0,0.2)] transition-all duration-700 cursor-pointer ${isSelected ? 'animate-space-float' : ''}`} style={{ backfaceVisibility: 'hidden', transform: 'translateZ(50px)' }} />

                                        {/* Nameplate Card: Optimized for Tablet/Web to be horizontally aligned */}
                                        <div className={`cyber-card lg:flex -mt-16 md:-mt-20 lg:-mt-16 z-50 transition-all duration-700 md:px-5 md:py-2.5 ${isSelected ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0 scale-90'}`}>
                                            <span className="bg-gradient-to-br from-orange-400 to-orange-600 text-white px-5 md:px-5 py-2 md:py-1.5 rounded-2xl font-black text-xl md:text-xl lg:text-xl shadow-xl border-4 border-white/50 tracking-tighter uppercase whitespace-nowrap">{char.name}</span>
                                            <div className="hidden md:block h-6 w-px bg-white/30"></div>
                                            <div className="h-px w-full bg-white/30 my-2 md:hidden"></div>
                                            <p className="text-[10px] md:text-xs font-black text-orange-950 uppercase tracking-[0.2em] opacity-90 text-center md:text-left">{char.description}</p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Mobile Welcome Text (Hidden on Tablet/Web) */}
                <div className="shrink-0 mb-8 px-6 z-50 md:hidden">
                    <div className="bg-white/40 backdrop-blur-3xl border-2 border-white/60 p-4 rounded-[2.5rem] shadow-2xl max-w-[90vw] text-center group hover:bg-white/60 transition-colors duration-500">
                        <p className="text-sm text-slate-700 leading-relaxed font-bold">
                            Welcome to <span className="text-orange-600 font-black px-1">Sir Isaac's Vocab Studio</span>.
                            Your selected pilot will appear in every watercolor masterpiece you generate!
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
  }

  return (
    <div className="flex-1 h-full overflow-y-auto p-4 md:p-8 flex flex-col items-center bg-gray-50/50">
       <div className="flex flex-col items-center gap-4 mb-8 sticky top-0 z-40 w-fit max-w-[95vw]">
            <div className="flex flex-nowrap items-center gap-1 md:gap-2 p-1.5 md:p-2 bg-white/90 backdrop-blur rounded-full border-2 border-gray-800 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] no-scrollbar overflow-x-auto">
                {LAYOUTS.map((l) => (
                    <button key={l.id} onClick={() => onLayoutChange(l.id, l.count)} className={`p-1.5 md:p-3 rounded-full border-2 transition-all shrink-0 ${layoutId === l.id ? 'bg-orange-500 text-white border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transform -translate-y-0.5' : 'border-transparent text-gray-400 hover:bg-gray-100'}`} title={l.name}>
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
                    <div key={cell.id} className={`flex flex-col gap-3 ${getCellSpanClasses(index)} ${draggedIndex === index ? 'opacity-50' : 'opacity-100'}`} onClick={() => onActiveCellChange(index)} draggable onDragStart={(e) => handleDragStart(e, index)} onDragEnd={() => setDraggedIndex(null)} onDragOver={(e) => handleDragOver(e, index)} onDrop={(e) => handleDrop(e, index)}>
                        <div className={`bg-white rounded-xl border-2 overflow-hidden transition-all duration-300 group cursor-grab active:cursor-grabbing h-full flex flex-col ${isSelected ? 'border-blue-500 shadow-[6px_6px_0px_0px_#3b82f6] -translate-y-1 ring-2 ring-blue-100' : 'border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] hover:border-gray-600 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]'}`}>
                            <div className={`p-3 border-b-2 flex flex-col gap-2 shrink-0 ${isSelected ? 'bg-blue-50 border-blue-500' : 'bg-gray-50 border-gray-900'}`}>
                                <div className="flex items-center gap-2 justify-between">
                                    <div className="flex items-center gap-2 flex-1 overflow-hidden">
                                        <div className={`w-6 h-6 shrink-0 rounded-full flex items-center justify-center text-xs text-white font-bold ${isSelected ? 'bg-blue-500' : 'bg-gray-500'}`}>{index + 1}</div>
                                        {appMode === 'vocab' ? (
                                            <select className="bg-transparent w-full outline-none cursor-pointer truncate font-bold text-sm" value={cell.wordId || 0} onChange={(e) => {
                                                    const newWordId = Number(e.target.value);
                                                    const newAssignments = [...gridAssignments];
                                                    if (newWordId !== 0) {
                                                        const existingIndex = newAssignments.indexOf(newWordId);
                                                        if (existingIndex !== -1 && existingIndex !== index) newAssignments[existingIndex] = 0;
                                                    }
                                                    newAssignments[index] = newWordId;
                                                    onGridUpdate(newAssignments);
                                            }}>
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
                          <input className="w-full h-12 px-4 border-2 border-gray-900 rounded-xl focus:outline-none focus:border-purple-600 focus:ring-4 focus:ring-purple-100 font-medium bg-gray-50" placeholder="Describe changes... e.g., 'Make it watercolor style'" value={magicPrompt} onChange={(e) => setMagicPrompt(e.target.value)} />
                    {layoutId > 0 && !applyToAll && <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold bg-orange-100 text-orange-800 px-2 py-1 rounded border border-orange-300 pointer-events-none">Editing #{activeCellIndex + 1}</div>}
                </div>
                <button onClick={handleMagicApply} disabled={!magicPrompt.trim()} className="h-12 px-6 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 text-white font-bold rounded-xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2">Apply Magic</button>
             </div>
        </div>
      </div>

      <div className="w-full max-w-4xl pb-10">
           {error && <div className="bg-red-100 border-2 border-red-500 text-red-700 px-4 py-3 rounded-xl shadow-[4px_4px_0px_0px_#ef4444] mb-4 font-bold">{error}</div>}
            
            {(layoutId > 0 || appMode === 'collage') && (
                  <div className="bg-gray-100 p-4 rounded-xl border-2 border-gray-200 mb-4 transition-all duration-300">
                      {/* Top Row: Title, Toggle, Clear Button - Always Visible & Aligned */}
                      <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-6">
                              <div className="flex items-center gap-2 font-bold text-gray-700">
                                  <Settings2 size={20} />
                                  <span>Collage Settings</span>
                              </div>

                              <label className="flex items-center gap-2 cursor-pointer select-none bg-white px-3 py-1.5 rounded-lg border border-gray-200 hover:border-indigo-300 transition-colors">
                                  <div
                                      className={`w-9 h-5 rounded-full p-1 transition-colors ${dividerConfig.show ? 'bg-indigo-500' : 'bg-gray-300'}`}
                                      onClick={() => setDividerConfig(prev => ({ ...prev, show: !prev.show }))}
                                  >
                                      <div className={`w-3 h-3 rounded-full bg-white shadow-sm transition-transform ${dividerConfig.show ? 'translate-x-4' : 'translate-x-0'}`} />
                                  </div>
                                  <span className={`text-xs font-bold uppercase tracking-wider ${dividerConfig.show ? 'text-indigo-600' : 'text-gray-500'}`}>Divider Lines</span>
                              </label>
                          </div>

                          <button
                              onClick={handleClearAllImages}
                              className="flex items-center gap-2 px-4 py-2 bg-white border-2 border-gray-900 rounded-xl font-bold text-red-500 hover:bg-red-50 active:scale-95 transition-all shadow-sm group"
                              title="Reset Canvas"
                          >
                              <RotateCcw size={16} className="group-hover:-rotate-180 transition-transform duration-500" />
                              <span className="text-xs tracking-wider uppercase font-black">Clear Canvas</span>
                          </button>
                      </div>

                      {/* Controls Row: Animate height/opacity when expanded */}
                      <div
                          className={`grid transition-all duration-300 ease-in-out overflow-hidden ${dividerConfig.show ? 'grid-rows-[1fr] opacity-100 mt-4 pt-4 border-t-2 border-gray-200 border-dashed' : 'grid-rows-[0fr] opacity-0 mt-0 pt-0 border-none'}`}
                      >
                          <div className="min-h-0 flex items-center justify-between gap-4 flex-wrap">
                              <div className="flex items-center gap-4 flex-wrap">
                                  {/* Color Picker */}
                                  <div className="flex items-center gap-3 bg-white px-3 py-2 rounded-xl border border-gray-200 shadow-sm">
                                      <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Color</span>
                                      <div className="flex items-center gap-1.5">
                                          {['#ffffff', '#000000', '#f97316', '#3b82f6', '#22c55e', '#ef4444', '#a855f7'].map(color => (
                                              <button
                                                  key={color}
                                                  onClick={() => setDividerConfig(prev => ({ ...prev, color }))}
                                                  className={`w-5 h-5 rounded-full border shadow-sm transition-all hover:scale-125 ${dividerConfig.color === color ? 'ring-2 ring-offset-1 ring-indigo-500 border-white scale-110' : 'border-gray-200'}`}
                                                  style={{ backgroundColor: color }}
                                              />
                                          ))}
                                          <div className="w-px h-4 bg-gray-200 mx-1" />
                                          <div className="relative group">
                                              <input
                                                  type="color"
                                                  value={dividerConfig.color}
                                                  onChange={(e) => setDividerConfig(prev => ({ ...prev, color: e.target.value }))}
                                                  className="w-6 h-6 rounded-full cursor-pointer opacity-0 absolute inset-0 z-10"
                                              />
                                              <div
                                                  className="w-6 h-6 rounded-full border-2 border-white shadow-sm ring-1 ring-gray-200 group-hover:ring-indigo-400 transition-all flex items-center justify-center overflow-hidden"
                                                  style={{ background: 'conic-gradient(from 0deg, red, yellow, lime, aqua, blue, magenta, red)' }}
                                              />
                                          </div>
                                      </div>
                                  </div>

                                  {/* Thickness & Style Group */}
                                  <div className="flex items-center gap-4">
                                      {/* Thickness */}
                                      <div className="flex items-center gap-3 bg-white px-3 py-2 rounded-xl border border-gray-200 shadow-sm">
                                          <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Width</span>
                                          <div className="flex items-center gap-2">
                                              <input
                                                  type="range"
                                                  min="2"
                                                  max="50"
                                                  value={dividerConfig.thickness}
                                                  onChange={(e) => setDividerConfig(prev => ({ ...prev, thickness: Number(e.target.value) }))}
                                                  className="w-24 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-500 hover:accent-indigo-600"
                                              />
                                              <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded min-w-[40px] text-center font-mono">{dividerConfig.thickness}px</span>
                                          </div>
                                      </div>

                                      {/* Line Styles */}
                                      <div className="flex items-center gap-3 bg-white px-3 py-2 rounded-xl border border-gray-200 shadow-sm">
                                          <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Style</span>
                                          <div className="flex p-0.5 bg-gray-100 rounded-lg">
                                              {[
                                                  { id: 'solid', label: 'Solid', icon: '━━' },
                                                  { id: 'dashed', label: 'Dashed', icon: '╌╌' },
                                                  { id: 'dotted', label: 'Dotted', icon: '••••' },
                                                  { id: 'double', label: 'Double', icon: '══' },
                                                  { id: 'groove', label: 'Groove', icon: '▓▓' }
                                              ].map(style => (
                                                <button 
                                                    key={style.id}
                                                    onClick={() => setDividerConfig(prev => ({ ...prev, style: style.id as any }))}
                                                    className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${dividerConfig.style === style.id ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                                                    title={style.label}
                                                >
                                                    {style.icon}
                                                </button>
                                            ))}
                                          </div>
                                      </div>
                                  </div>
                              </div>
                          </div>
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
