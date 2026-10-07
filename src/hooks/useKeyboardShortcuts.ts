import { useEffect } from 'react';

export interface ShortcutHandlers {
  onUndo?: () => void;
  onRedo?: () => void;
  onSave?: () => void;
  onSelectTool?: (tool: string) => void;
}

export function useKeyboardShortcuts(handlers: ShortcutHandlers) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is currently typing in an input or textarea
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

      if (cmdOrCtrl && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handlers.onRedo?.();
        } else {
          handlers.onUndo?.();
        }
      } else if (cmdOrCtrl && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handlers.onRedo?.();
      } else if (cmdOrCtrl && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handlers.onSave?.();
      } else if (!cmdOrCtrl && !e.altKey) {
        if (e.key.toLowerCase() === 'v') handlers.onSelectTool?.('select');
        if (e.key.toLowerCase() === 'p') handlers.onSelectTool?.('pen');
        if (e.key.toLowerCase() === 'm') handlers.onSelectTool?.('rect');
        if (e.key.toLowerCase() === 'l') handlers.onSelectTool?.('circle');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlers]);
}
