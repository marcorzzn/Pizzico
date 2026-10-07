import { useState, useEffect, useRef } from 'react';
import { UnifiedDocument } from '../types/creativeSuite';
import { saveActiveDocument, loadActiveDocument } from '../services/storage';

export function usePersistedState(initialDoc: UnifiedDocument) {
  const [doc, setDoc] = useState<UnifiedDocument>(initialDoc);
  const [isLoaded, setIsLoaded] = useState(false);
  const saveTimeoutRef = useRef<any>(null);

  // Load from IndexedDB on initial mount
  useEffect(() => {
    let mounted = true;
    loadActiveDocument().then((saved) => {
      if (mounted && saved && saved.vectorLayers) {
        setDoc(saved);
      }
      setIsLoaded(true);
    });
    return () => {
      mounted = false;
    };
  }, []);

  // Debounced save to IndexedDB on change
  useEffect(() => {
    if (!isLoaded) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      saveActiveDocument(doc);
    }, 600);

    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [doc, isLoaded]);

  return { doc, setDoc, isLoaded };
}
