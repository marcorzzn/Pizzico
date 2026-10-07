import { get, set, del, keys } from 'idb-keyval';
import { UnifiedDocument } from '../types/creativeSuite';

const ACTIVE_DOC_KEY = 'creative_suite_active_doc';
const PROJECTS_PREFIX = 'cs_proj_';

export async function saveActiveDocument(doc: UnifiedDocument): Promise<void> {
  try {
    await set(ACTIVE_DOC_KEY, doc);
    // Also save in projects collection
    await set(`${PROJECTS_PREFIX}${doc.id}`, {
      id: doc.id,
      name: doc.name,
      updatedAt: new Date().toISOString(),
      doc,
    });
  } catch (err) {
    console.warn('IndexedDB save failed:', err);
  }
}

export async function loadActiveDocument(): Promise<UnifiedDocument | null> {
  try {
    const doc = await get<UnifiedDocument>(ACTIVE_DOC_KEY);
    return doc || null;
  } catch (err) {
    console.warn('IndexedDB load failed:', err);
    return null;
  }
}

export interface ProjectMetadata {
  id: string;
  name: string;
  updatedAt: string;
}

export async function listSavedProjects(): Promise<ProjectMetadata[]> {
  try {
    const allKeys = await keys();
    const projectKeys = allKeys.filter((k) => typeof k === 'string' && k.startsWith(PROJECTS_PREFIX));
    const projects: ProjectMetadata[] = [];
    for (const k of projectKeys) {
      const data = await get<{ id: string; name: string; updatedAt: string }>(k);
      if (data) {
        projects.push({ id: data.id, name: data.name, updatedAt: data.updatedAt });
      }
    }
    return projects.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  } catch (err) {
    console.warn('List projects failed:', err);
    return [];
  }
}

export async function loadProjectById(id: string): Promise<UnifiedDocument | null> {
  try {
    const data = await get<{ doc: UnifiedDocument }>(`${PROJECTS_PREFIX}${id}`);
    return data?.doc || null;
  } catch (err) {
    return null;
  }
}

export async function deleteProjectById(id: string): Promise<void> {
  try {
    await del(`${PROJECTS_PREFIX}${id}`);
  } catch (err) {
    console.warn('Delete project failed:', err);
  }
}
