chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({ url: chrome.runtime.getURL('index.html') })
})
chrome.runtime.onInstalled.addListener(() => {
  console.log('墨阅 Moreader installed')
})
