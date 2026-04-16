// Background Service Worker for MoRead Chrome Extension
declare const chrome: any

chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({
    url: chrome.runtime.getURL('index.html')
  })
})

chrome.runtime.onInstalled.addListener(() => {
  console.log('MoRead Moreader extension installed')
})
