import localforage from 'localforage'

// Initialize localForage with IndexedDB as primary driver for large binary storage
export const db = localforage.createInstance({
  name: 'mobi-reader-db',
  storeName: 'books',
  driver: [
    localforage.INDEXEDDB,
    localforage.WEBSQL,
    localforage.LOCALSTORAGE
  ],
  version: 1.0,
})

// Separate store for metadata (lightweight, quick access)
export const metadataDb = localforage.createInstance({
  name: 'mobi-reader-db',
  storeName: 'metadata',
  driver: localforage.INDEXEDDB,
  version: 1.0,
})

// Helper to ensure DB is ready
export const initDb = async (): Promise<void> => {
  try {
    await db.ready()
    await metadataDb.ready()
    console.log('Database initialized successfully')
  } catch (error) {
    console.error('Database initialization failed:', error)
    throw error
  }
}

export default db
