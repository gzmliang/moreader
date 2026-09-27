chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({ url: chrome.runtime.getURL('index.html') })
})
chrome.runtime.onInstalled.addListener(() => {
  console.log('MoReader installed')
})
