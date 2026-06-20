/**
 * @fileoverview Local-first storage management and PostgreSQL sync adapter.
 * Handles offline backups, cached history retrieval, and device ID management.
 *
 * @author MindFlow Team
 * @version 1.0.0
 */

/**
 * Generates a standard UUIDv4.
 *
 * @returns {string} A random UUIDv4 string
 */
export function generateUUID() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback for older browsers
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Retrieves the device ID from localStorage, creating one if not exists.
 *
 * @returns {string} The unique device UUID
 */
export function getOrCreateDeviceId() {
  let id = localStorage.getItem('mindflow_device_id');
  if (!id) {
    id = generateUUID();
    localStorage.setItem('mindflow_device_id', id);
  }
  return id;
}

/**
 * Saves a new journal entry to local history.
 *
 * @param {Object} journal - The journal entry object to add
 */
export function saveJournalLocally(journal) {
  const journals = getLocalJournals();
  journals.push(journal);
  localStorage.setItem('mindflow_journals', JSON.stringify(journals));
}

/**
 * Retrieves all locally cached journal entries.
 *
 * @returns {Array<Object>} List of journal entries
 */
export function getLocalJournals() {
  try {
    const data = localStorage.getItem('mindflow_journals');
    return data ? JSON.parse(data) : [];
  } catch (err) {
    console.error('Error reading local journals:', err);
    return [];
  }
}

/**
 * Saves a new chat message to local history.
 *
 * @param {Object} chat - Message containing role and content keys
 */
export function saveChatLocally(chat) {
  const chats = getLocalChats();
  chats.push(chat);
  localStorage.setItem('mindflow_chats', JSON.stringify(chats));
}

/**
 * Retrieves all locally cached chat history messages.
 *
 * @returns {Array<Object>} List of chats
 */
export function getLocalChats() {
  try {
    const data = localStorage.getItem('mindflow_chats');
    return data ? JSON.parse(data) : [];
  } catch (err) {
    console.error('Error reading local chats:', err);
    return [];
  }
}

/**
 * Performs a synchronization with the Neon Postgres database.
 * Sends local logs to PostgreSQL and reconciles any server records.
 *
 * @returns {Promise<{ dbSynced: boolean, journals: Array<Object>, chats: Array<Object> }>}
 */
export async function syncWithDatabase() {
  const deviceId = getOrCreateDeviceId();
  const localJournals = getLocalJournals();
  const localChats = getLocalChats();

  try {
    const response = await fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        device_id: deviceId,
        journals: localJournals,
        chats: localChats,
      }),
    });

    if (!response.ok) {
      throw new Error(`Sync API failed with status ${response.status}`);
    }

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.message || 'Sync failed');
    }

    // If successfully synced, fetch server-side full logs to reconcile
    if (result.dbSynced) {
      const fetchResponse = await fetch(`/api/sync?device_id=${deviceId}`);
      if (fetchResponse.ok) {
        const fetchResult = await fetchResponse.json();
        if (fetchResult.success) {
          // Reconcile and cache back to local
          localStorage.setItem('mindflow_journals', JSON.stringify(fetchResult.journals));
          localStorage.setItem('mindflow_chats', JSON.stringify(fetchResult.chats));
          return {
            dbSynced: true,
            journals: fetchResult.journals,
            chats: fetchResult.chats,
          };
        }
      }
    }

    return { dbSynced: false, journals: localJournals, chats: localChats };
  } catch (error) {
    console.warn('Sync failed, operating in offline/cached mode:', error.message);
    return { dbSynced: false, journals: localJournals, chats: localChats };
  }
}
