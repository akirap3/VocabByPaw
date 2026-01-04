
import React, { useState } from 'react';
import { VocabItem } from '../types';
import { Eraser, X, Download, FileText, FileJson, ChevronDown, Edit2 } from 'lucide-react';
import { jsPDF } from 'jspdf';

interface VocabListProps {
  items: VocabItem[];
  themeSentence: string;
  onThemeChange: (theme: string) => void;
  onSelect: (item: VocabItem) => void;
  selectedId: number | null;
  layoutId?: number;
  gridAssignments?: number[];
  activeCellIndex?: number;
  onUnselectAll?: () => void;
  onClose?: () => void;
  imageCache: Record<number, string>;
  stitchedImage: string | null;
}

export const VocabList: React.FC<VocabListProps> = ({ 
  items, 
  themeSentence,
  onThemeChange,
  onSelect, 
  selectedId, 
  layoutId = 0, 
  gridAssignments = [],
  activeCellIndex = 0,
  onUnselectAll,
  onClose,
  imageCache,
  stitchedImage
}) => {
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Helper to render text to an image to bypass jsPDF encoding issues with CJK and IPA
  const textToImage = (text: string, fontSize: number, color: string, isBold: boolean = false, maxWidth: number = 800): { dataUrl: string, width: number, height: number } => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return { dataUrl: '', width: 0, height: 0 };

    const scale = 3;
    const fontStr = `${isBold ? 'bold' : 'normal'} ${fontSize * scale}px "Noto Sans TC", "Comic Neue", sans-serif`;
    ctx.font = fontStr;
    
    // Measure for wrapping
    const words = text.split('');
    let lines = [];
    let currentLine = '';
    
    for (let n = 0; n < words.length; n++) {
      let testLine = currentLine + words[n];
      let metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth * scale && n > 0) {
        lines.push(currentLine);
        currentLine = words[n];
      } else {
        currentLine = testLine;
      }
    }
    lines.push(currentLine);

    canvas.width = (maxWidth + 40) * scale;
    canvas.height = (lines.length * fontSize * 1.5 + 20) * scale;
    
    // Redraw
    ctx.font = fontStr;
    ctx.fillStyle = color;
    ctx.textBaseline = 'top';
    
    lines.forEach((line, i) => {
        ctx.fillText(line, 0, (i * fontSize * 1.5) * scale);
    });

    return {
        dataUrl: canvas.toDataURL('image/png'),
        width: canvas.width / scale,
        height: canvas.height / scale
    };
  };

  // Helper to get image dimensions and apply rounded corners via canvas
  const prepareImage = async (base64: string, radius: number = 20): Promise<{ dataUrl: string, ratio: number }> => {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                resolve({ dataUrl: base64, ratio: img.width / img.height });
                return;
            }
            canvas.width = img.width;
            canvas.height = img.height;
            
            // Draw rounded corners clip
            const r = Math.min(radius, img.width / 4, img.height / 4);
            ctx.beginPath();
            ctx.moveTo(r, 0);
            ctx.lineTo(img.width - r, 0);
            ctx.quadraticCurveTo(img.width, 0, img.width, r);
            ctx.lineTo(img.width, img.height - r);
            ctx.quadraticCurveTo(img.width, img.height, img.width - r, img.height);
            ctx.lineTo(r, img.height);
            ctx.quadraticCurveTo(0, img.height, 0, img.height - r);
            ctx.lineTo(0, r);
            ctx.quadraticCurveTo(0, 0, r, 0);
            ctx.closePath();
            ctx.clip();
            
            ctx.drawImage(img, 0, 0);
            resolve({ 
                dataUrl: canvas.toDataURL('image/png'), 
                ratio: img.width / img.height 
            });
        };
        img.onerror = () => resolve({ dataUrl: base64, ratio: 1 });
        img.src = base64;
    });
  };

  const exportAsText = () => {
    let content = `${themeSentence}\n\n`;
    
    items.forEach((item, index) => {
        const cleanPhonetic = item.phonetic.replace(/[\[\]]/g, '');
        content += `${index + 1}. ${item.word} [${cleanPhonetic}] ${item.definition}\n`;
        content += `${item.englishSentence}\n`;
        content += `${item.targetSentence}\n\n`;
    });

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `vocab_notes_${Date.now()}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setShowExportMenu(false);
  };

  const exportAsPDF = async () => {
    const doc = new jsPDF();
    let currentY = 20;
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;

    // --- 1. Theme Section ---
    const themeContentImg = textToImage(themeSentence, 18, "#1e293b", true, (pageWidth - margin * 2) * 5);
    doc.addImage(themeContentImg.dataUrl, 'PNG', margin, currentY, themeContentImg.width / 5, themeContentImg.height / 5);
    currentY += (themeContentImg.height / 5) + 20;

    // --- 2. Vocab Items ---
    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const cleanPhonetic = item.phonetic.replace(/[\[\]]/g, '');
        const imgDataRaw = imageCache[item.id];
        
        let preparedImg = null;
        if (imgDataRaw) {
            preparedImg = await prepareImage(imgDataRaw, 40);
        }

        const hasImage = !!preparedImg;
        const textMaxWidth = hasImage ? (pageWidth - margin * 2 - 75) : (pageWidth - margin * 2);

        const rowText = `${i + 1}. ${item.word} [${cleanPhonetic}] ${item.definition}`;
        const rowImg = textToImage(rowText, 14, "#f97316", true, textMaxWidth * 5);
        const engImg = textToImage(item.englishSentence, 11, "#1f2937", false, textMaxWidth * 5);
        const targetImg = textToImage(item.targetSentence, 11, "#4b5563", false, textMaxWidth * 5);

        const textHeight = (rowImg.height + engImg.height + targetImg.height) / 5 + 10;
        const imgW = 65;
        const imgH = hasImage ? (imgW / preparedImg!.ratio) : 0;
        const totalBlockHeight = Math.max(textHeight, imgH);

        if (currentY + totalBlockHeight > 270) {
            doc.addPage();
            currentY = 20;
        }

        const startY = currentY;

        doc.addImage(rowImg.dataUrl, 'PNG', margin, currentY, rowImg.width / 5, rowImg.height / 5);
        currentY += (rowImg.height / 5) + 3;
        
        doc.addImage(engImg.dataUrl, 'PNG', margin, currentY, engImg.width / 5, engImg.height / 5);
        currentY += (engImg.height / 5) + 1;
        
        doc.addImage(targetImg.dataUrl, 'PNG', margin, currentY, targetImg.width / 5, targetImg.height / 5);
        currentY += (targetImg.height / 5) + 15;

        if (hasImage) {
            try {
                const imgX = pageWidth - margin - imgW;
                doc.addImage(preparedImg!.dataUrl, 'PNG', imgX, startY, imgW, imgH);
            } catch (e) {
                console.error("Image embed error", e);
            }
        }
        
        currentY = Math.max(currentY, startY + imgH + 10, startY + textHeight + 5);
    }

    if (stitchedImage) {
        doc.addPage();
        try {
            const collageW = 170;
            const collageH = 170;
            const collageX = (pageWidth - collageW) / 2;
            const collageY = 30;
            
            doc.setDrawColor(200, 200, 200);
            doc.setLineWidth(0.1);
            doc.roundedRect(collageX - 1, collageY - 1, collageW + 2, collageH + 2, 2, 2, 'S');
            doc.addImage(stitchedImage, 'PNG', collageX, collageY, collageW, collageH);
        } catch (e) {
             console.error("Collage embed error", e);
        }
    }

    doc.save(`Sir_Isaac_Vocab_Cards_${Date.now()}.pdf`);
    setShowExportMenu(false);
  };

  return (
    <div className="w-full bg-white border-r border-orange-200 h-full flex flex-col overflow-hidden relative">
      <div className="p-4 pb-2 shrink-0 border-b border-gray-100 bg-white z-10">
        <div className="flex justify-between items-center mb-2 md:mb-4 gap-2">
            <h2 className="text-lg md:text-xl font-bold text-orange-600 font-serif whitespace-nowrap">Results ({items.length})</h2>
            <div className="flex items-center gap-1">
                {items.length > 0 && (
                  <>
                    {layoutId > 0 && onUnselectAll && (
                        <button 
                            onClick={onUnselectAll}
                            className="text-[10px] md:text-xs flex items-center gap-1 bg-gray-100 hover:bg-gray-200 text-gray-600 px-2 py-1.5 rounded transition-colors shrink-0 font-bold"
                        >
                            <Eraser size={14} /> Unselect
                        </button>
                    )}
                    <div className="relative">
                        <button 
                            onClick={() => setShowExportMenu(!showExportMenu)}
                            className="text-[10px] md:text-xs flex items-center gap-1 bg-orange-500 hover:bg-orange-600 text-white px-2 py-1.5 rounded transition-colors shrink-0 font-bold shadow-sm"
                        >
                            <Download size={14} /> Export <ChevronDown size={12} />
                        </button>
                        {showExportMenu && (
                            <div className="absolute right-0 mt-2 w-36 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                <button onClick={exportAsPDF} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-orange-50 flex items-center gap-2 font-bold"><FileText size={16} className="text-red-500" /> PDF Document</button>
                                <button onClick={exportAsText} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-orange-50 flex items-center gap-2 font-bold border-t border-gray-100"><FileJson size={16} className="text-blue-500" /> Plain Text</button>
                            </div>
                        )}
                    </div>
                  </>
                )}
                {onClose && (
                    <button onClick={onClose} className="lg:hidden p-1.5 text-gray-500 hover:bg-gray-100 rounded-full transition-colors flex items-center justify-center"><X size={20} /></button>
                )}
            </div>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-2 no-scrollbar pb-32">
        {items.length === 0 ? (
            <p className="text-gray-400 text-center mt-10 italic">No words generated yet. Use the panel to start.</p>
        ) : (
            items.map((item, index) => {
                const assignedIndex = gridAssignments?.indexOf(item.id) ?? -1;
                const isInGrid = assignedIndex !== -1 && layoutId > 0;
                const isActiveTarget = isInGrid && assignedIndex === activeCellIndex;
                let borderClass = 'border-gray-100 hover:bg-orange-50 hover:border-orange-200';
                let bgClass = 'bg-gray-50 text-gray-700';
                if (isActiveTarget) {
                    borderClass = 'border-blue-500 ring-1 ring-blue-500';
                    bgClass = 'bg-blue-50 text-blue-900';
                } else if (selectedId === item.id && layoutId === 0) {
                    borderClass = 'border-orange-400';
                    bgClass = 'bg-orange-100 text-orange-800';
                } else if (isInGrid) {
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

      {items.length > 0 && (
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-orange-50 border-t-2 border-orange-200 shadow-[0_-4px_10px_rgba(0,0,0,0.05)] z-20">
            <div className="flex items-center gap-2 mb-2">
                <Edit2 size={14} className="text-orange-600" />
                <span className="text-xs font-black text-orange-800 uppercase tracking-widest">Theme Sentence</span>
            </div>
            <textarea 
                value={themeSentence}
                onChange={(e) => onThemeChange(e.target.value)}
                placeholder="Add a summary or title for this set..."
                className="w-full p-2 text-sm bg-white border-2 border-orange-200 rounded-xl focus:outline-none focus:border-orange-500 resize-none font-medium h-20 text-gray-700 leading-snug no-scrollbar"
            />
        </div>
      )}
    </div>
  );
};
