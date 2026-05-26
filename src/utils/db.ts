import localforage from 'localforage'

export const db = localforage.createInstance({
  name: 'moreader-db',
  storeName: 'books',
  driver: [localforage.INDEXEDDB, localforage.WEBSQL, localforage.LOCALSTORAGE],
  version: 1.0,
})

export const metadataDb = localforage.createInstance({
  name: 'moreader-db',
  storeName: 'metadata',
  driver: localforage.INDEXEDDB,
  version: 1.0,
})

export const bookmarkDb = localforage.createInstance({
  name: 'moreader-db',
  storeName: 'bookmarks',
  driver: localforage.INDEXEDDB,
  version: 1.0,
})

export const highlightDb = localforage.createInstance({
  name: 'moreader-db',
  storeName: 'highlights',
  driver: localforage.INDEXEDDB,
  version: 1.0,
})

export const vocabDb = localforage.createInstance({
  name: 'moreader-db',
  storeName: 'vocab',
  driver: localforage.INDEXEDDB,
  version: 1.0,
})

export const initDb = async (): Promise<void> => {
  await db.ready()
  await metadataDb.ready()
}

export default db
