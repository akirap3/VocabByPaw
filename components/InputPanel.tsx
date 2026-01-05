import React, { useState } from 'react';
import { Settings, Sparkles, BookOpen, AlertCircle, Globe, MessageSquare, GraduationCap } from 'lucide-react';
import { TOP_50_LANGUAGES, PROFICIENCY_LEVELS } from '../constants';
import { InputMode, VocabGenerationParams } from '../types';

interface InputPanelProps {
  onGenerate: (params: VocabGenerationParams) => void;
  isLoading: boolean;
}

export const InputPanel: React.FC<InputPanelProps> = ({ onGenerate, isLoading }) => {
  const [mode, setMode] = useState<InputMode>('topic');
  const [targetLanguage, setTargetLanguage] = useState(TOP_50_LANGUAGES[0]);
  const [manualInput, setManualInput] = useState("");
  const [topicInput, setTopicInput] = useState("");
  // Default to C1 and C2 as requested
  const [selectedLevels, setSelectedLevels] = useState<string[]>(["C1", "C2"]);
  const [languageSearch, setLanguageSearch] = useState("");
  const [showLangDropdown, setShowLangDropdown] = useState(false);

  const filteredLanguages = TOP_50_LANGUAGES.filter(lang => 
    lang.toLowerCase().includes(languageSearch.toLowerCase())
  );

  const toggleLevel = (level: string) => {
    if (isLoading) return;
    if (selectedLevels.includes(level)) {
      setSelectedLevels(selectedLevels.filter(l => l !== level));
    } else {
      setSelectedLevels([...selectedLevels, level]);
    }
  };

  const handleManualSubmit = () => {
    if (!manualInput.trim()) return;
    const wordCount = manualInput.split(',').filter(w => w.trim().length > 0).length;
    if (wordCount > 20) return;

    onGenerate({
      input: manualInput,
      mode: 'manual',
      targetLanguage,
      proficiencyLevels: []
    });
  };

  const handleTopicSubmit = () => {
    if (!topicInput.trim()) return;
    onGenerate({
      input: topicInput,
      mode: 'topic',
      targetLanguage,
      proficiencyLevels: selectedLevels
    });
  };

  return (
    <div className="bg-white p-4 h-full flex flex-col border-r border-orange-200 overflow-y-auto">
      <h2 className="text-xl font-bold mb-6 text-orange-600 font-serif flex items-center gap-2">
        <Settings size={24} />
        Setup Studio
      </h2>

      {/* Language Selector */}
      <div className="mb-6 relative">
        <label className="block text-sm font-bold text-gray-900 mb-2 flex items-center gap-1.5"><Globe size={14} className="text-orange-500" />Target Language</label>
        <div className="relative">
          <input
            type="text"
            disabled={isLoading}
            className={`w-full p-2 border border-gray-300 rounded-lg focus:border-orange-500 outline-none bg-white text-gray-900 placeholder-gray-500 ${isLoading ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : ''}`}
            placeholder="Search Language..."
            value={showLangDropdown ? languageSearch : targetLanguage}
            onChange={(e) => {
                setLanguageSearch(e.target.value);
                setShowLangDropdown(true);
            }}
            onFocus={() => {
                setLanguageSearch("");
                setShowLangDropdown(true);
            }}
            onBlur={() => setTimeout(() => setShowLangDropdown(false), 200)}
          />
          {showLangDropdown && !isLoading && (
            <div className="absolute z-50 w-full bg-white border border-gray-200 mt-1 rounded-lg shadow-lg max-h-60 overflow-y-auto">
              {filteredLanguages.map(lang => (
                <div
                  key={lang}
                  className="p-2 hover:bg-orange-100 cursor-pointer text-sm text-gray-900"
                  onMouseDown={() => {
                    setTargetLanguage(lang);
                    setLanguageSearch("");
                    setShowLangDropdown(false);
                  }}
                >
                  {lang}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Mode Tabs */}
      <div className="flex mb-6 bg-gray-100 p-1 rounded-lg">
        <button
          onClick={() => setMode('manual')}
          disabled={isLoading}
          className={`flex-1 py-2 rounded-md text-sm font-bold transition ${mode === 'manual' ? 'bg-white shadow text-orange-700 ring-1 ring-orange-200' : 'text-gray-700 hover:text-gray-900'} ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          Specific Words
        </button>
        <button
          onClick={() => setMode('topic')}
          disabled={isLoading}
          className={`flex-1 py-2 rounded-md text-sm font-bold transition ${mode === 'topic' ? 'bg-white shadow text-orange-700 ring-1 ring-orange-200' : 'text-gray-700 hover:text-gray-900'} ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          AI Generator
        </button>
      </div>

      {/* Manual Mode Input */}
      {mode === 'manual' && (
        <div className="flex-1 flex flex-col">
          <label className="block text-sm font-bold text-gray-900 mb-2">Enter Words (Max 20)</label>
          <div className="relative flex-1 mb-4">
            <textarea
              disabled={isLoading}
              className={`w-full h-40 p-3 border border-gray-300 rounded-lg focus:border-orange-500 outline-none resize-none bg-white text-gray-900 placeholder-gray-500 ${isLoading ? 'bg-gray-100 cursor-not-allowed' : ''}`}
              placeholder="dilatory, indolence, multifarious..."
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
            />
            <div className="text-right text-xs text-gray-700 mt-1">
              {manualInput.split(',').filter(w => w.trim().length > 0).length} / 20 words
            </div>
            {manualInput.split(',').filter(w => w.trim().length > 0).length > 20 && (
                 <p className="text-red-600 text-xs mt-1 flex items-center gap-1">
                    <AlertCircle size={12} /> Too many words!
                 </p>
            )}
          </div>
           <div className="bg-blue-50 p-3 rounded-lg text-xs text-blue-900 mb-4 flex gap-2 border border-blue-100">
             <AlertCircle size={16} className="shrink-0" />
             <p>Hint: Separate words with commas. I will generate definitions and sentences for you.</p>
           </div>
          <button
            onClick={handleManualSubmit}
            disabled={isLoading || !manualInput.trim() || manualInput.split(',').filter(w => w.trim().length > 0).length > 20}
            className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl shadow-md transition flex items-center justify-center gap-2"
          >
             {isLoading ? <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"/> : <BookOpen size={18} />}
             Analyze Words
          </button>
        </div>
      )}

      {/* Topic Mode Input */}
      {mode === 'topic' && (
        <div className="flex-1 flex flex-col">
          <label className="block text-sm font-bold text-gray-900 mb-2 flex items-center gap-1.5"><MessageSquare size={14} className="text-orange-500" />Topic or Theme</label>
          <textarea
             disabled={isLoading}
            rows={10}
             className={`w-full p-3 border border-gray-300 rounded-lg focus:border-orange-500 outline-none resize-y mb-4 bg-white text-gray-900 placeholder-gray-500 ${isLoading ? 'bg-gray-100 cursor-not-allowed' : ''}`}
            style={{ minHeight: '72px' }}
             placeholder="e.g. Cooking at home, Space exploration, Office politics..."
             value={topicInput}
             onChange={(e) => setTopicInput(e.target.value)}
          />

          <label className="block text-sm font-bold text-gray-900 mb-2 flex items-center gap-1.5"><GraduationCap size={14} className="text-orange-500" />Proficiency Level</label>
          <div className="flex flex-wrap gap-2 mb-6">
            {PROFICIENCY_LEVELS.map(level => (
                <button
                    key={level}
                    onClick={() => toggleLevel(level)}
                    disabled={isLoading}
                    className={`px-3 py-1 rounded-full text-xs font-bold border transition ${
                        selectedLevels.includes(level) 
                        ? 'bg-orange-600 text-white border-orange-600' 
                        : 'bg-white text-gray-900 border-gray-300 hover:border-orange-500 hover:bg-orange-50'
                    } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                    {level}
                </button>
            ))}
          </div>

          <button
            onClick={handleTopicSubmit}
            disabled={isLoading || !topicInput.trim()}
            className="mt-auto w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl shadow-md transition flex items-center justify-center gap-2"
          >
             {isLoading ? <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"/> : <Sparkles size={18} />}
             Generate Vocabulary
          </button>
        </div>
      )}
    </div>
  );
};