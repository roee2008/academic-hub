import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  CheckSquare,
  FolderOpen,
  Calendar,
  BookOpen,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { Assignment, Course, CourseFile } from '../../types';

interface OmniboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: Assignment[];
  courses: Course[];
  files: CourseFile[];
  onSelectTask: (task: Assignment) => void;
  onSelectCourse: (courseId: string) => void;
  onPreviewFile: (file: CourseFile) => void;
  onNavigateTab: (tab: string) => void;
}

export const OmniboxModal: React.FC<OmniboxModalProps> = ({
  isOpen,
  onClose,
  tasks,
  courses,
  files,
  onSelectTask,
  onSelectCourse,
  onPreviewFile,
  onNavigateTab,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Global shortcut Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const q = query.toLowerCase().trim();

  const matchingTasks = tasks
    .filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        (t.course_name && t.course_name.toLowerCase().includes(q))
    )
    .slice(0, 4);

  const matchingCourses = courses
    .filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.code && c.code.toLowerCase().includes(q))
    )
    .slice(0, 3);

  const matchingFiles = files
    .filter((f) => f.title.toLowerCase().includes(q))
    .slice(0, 4);

  const allResults = [
    ...matchingTasks.map((t) => ({ type: 'task' as const, data: t })),
    ...matchingCourses.map((c) => ({ type: 'course' as const, data: c })),
    ...matchingFiles.map((f) => ({ type: 'file' as const, data: f })),
  ];

  const handleSelect = (item: (typeof allResults)[0]) => {
    if (item.type === 'task') {
      onSelectTask(item.data as Assignment);
      onNavigateTab('tasks');
    } else if (item.type === 'course') {
      onSelectCourse((item.data as Course).id);
      onNavigateTab('tasks');
    } else if (item.type === 'file') {
      onPreviewFile(item.data as CourseFile);
    }
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, allResults.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + allResults.length) % Math.max(1, allResults.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (allResults[selectedIndex]) {
        handleSelect(allResults[selectedIndex]);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-xl bg-surface-1 border border-stroke rounded-lg shadow-modal overflow-hidden flex flex-col">
        {/* Search Input Bar */}
        <div className="px-4 py-3.5 border-b border-stroke flex items-center space-x-3 bg-surface-2/40">
          <Search className="w-4 h-4 text-accent-indigo flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search tasks, courses, documents, or jump to view..."
            className="w-full bg-transparent border-0 text-sm text-content-primary placeholder-content-dim focus:outline-none"
          />
          <kbd className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-canvas border border-stroke text-content-dim">
            ESC
          </kbd>
        </div>

        {/* Results Feed */}
        <div className="max-h-96 overflow-y-auto p-2 space-y-1">
          {allResults.length === 0 ? (
            <div className="p-8 text-center text-xs text-content-dim">
              No matching tasks, courses, or files found.
            </div>
          ) : (
            allResults.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              if (item.type === 'task') {
                const task = item.data as Assignment;
                return (
                  <div
                    key={`task_${task.id}`}
                    onClick={() => handleSelect(item)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`flex items-center justify-between px-3 py-2 rounded-md text-xs transition-all cursor-pointer ${
                      isSelected ? 'bg-accent-indigo text-white' : 'text-content-primary hover:bg-surface-2'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5 truncate">
                      <CheckSquare className="w-3.5 h-3.5 flex-shrink-0 text-accent-indigo" />
                      <span className="truncate font-medium">{task.title}</span>
                      <span className={`text-[10px] font-mono px-1 rounded ${isSelected ? 'bg-white/20' : 'bg-surface-2 text-content-dim'}`}>
                        {task.course_name}
                      </span>
                    </div>
                    <span className="text-[10px] uppercase font-mono tracking-wider opacity-70">
                      Task
                    </span>
                  </div>
                );
              }
              if (item.type === 'course') {
                const course = item.data as Course;
                return (
                  <div
                    key={`course_${course.id}`}
                    onClick={() => handleSelect(item)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`flex items-center justify-between px-3 py-2 rounded-md text-xs transition-all cursor-pointer ${
                      isSelected ? 'bg-accent-indigo text-white' : 'text-content-primary hover:bg-surface-2'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5 truncate">
                      <BookOpen className="w-3.5 h-3.5 flex-shrink-0" style={{ color: course.color_tag }} />
                      <span className="truncate font-medium">{course.name}</span>
                      <span className={`text-[10px] font-mono px-1 rounded ${isSelected ? 'bg-white/20' : 'bg-surface-2 text-content-dim'}`}>
                        {course.code || 'Course'}
                      </span>
                    </div>
                    <span className="text-[10px] uppercase font-mono tracking-wider opacity-70">
                      Course
                    </span>
                  </div>
                );
              }
              if (item.type === 'file') {
                const file = item.data as CourseFile;
                return (
                  <div
                    key={`file_${file.id}`}
                    onClick={() => handleSelect(item)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`flex items-center justify-between px-3 py-2 rounded-md text-xs transition-all cursor-pointer ${
                      isSelected ? 'bg-accent-indigo text-white' : 'text-content-primary hover:bg-surface-2'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5 truncate">
                      <FolderOpen className="w-3.5 h-3.5 flex-shrink-0 text-accent-cyan" />
                      <span className="truncate font-medium">{file.title}</span>
                      <span className={`text-[10px] font-mono px-1 rounded ${isSelected ? 'bg-white/20' : 'bg-surface-2 text-content-dim'}`}>
                        {file.course_name}
                      </span>
                    </div>
                    <span className="text-[10px] uppercase font-mono tracking-wider opacity-70">
                      Document
                    </span>
                  </div>
                );
              }
              return null;
            })
          )}
        </div>

        {/* Footer Navigation Hints */}
        <div className="px-4 py-2 bg-surface-2/60 border-t border-stroke flex items-center justify-between text-[11px] font-mono text-content-dim select-none">
          <div className="flex items-center space-x-3">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <span>ESC Close</span>
          </div>
          <span className="text-accent-indigo">Unified Search</span>
        </div>
      </div>
    </div>
  );
};
