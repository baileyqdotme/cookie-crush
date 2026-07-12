var totalCookiesAccepted = 0;
var totalCookiesRejected = 0;
var sessionCookiesAccepted = 0;
var sessionCookiesRejected = 0;

var isEnabled = true;
var isRejecting = true;

var darkMode = true;

function onLoad() {
  console.log("Worker script loaded");
  loadPersistentData();
}

chrome.runtime.onInstalled.addListener(() => onLoad());
chrome.runtime.onStartup.addListener(() => onLoad());

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  let response = {};
  switch (message.type) {
    case "isEnabled":
      response = {enabled: isEnabled};
      break;
    case "isRejecting":
      response = {reject: isRejecting};
      break;
    case "getPersistentData":
      loadPersistentData();
      response = {
        totalCookiesAccepted: totalCookiesAccepted,
        totalCookiesRejected: totalCookiesRejected,
        sessionCookiesAccepted: sessionCookiesAccepted,
        sessionCookiesRejected: sessionCookiesRejected,
        isEnabled: isEnabled,
        isRejecting: isRejecting,
        darkMode: darkMode
      }
      break;
    case "incrementPersistentData":
      if (message.reject) {
        sessionCookiesRejected++;
        totalCookiesRejected++;
      } else {
        sessionCookiesAccepted++;
        totalCookiesAccepted++;
      }
      storePersistentData();
      break;
    case "setPersistentData":
      if (message.hasOwnProperty("totalCookiesAccepted")) {
        totalCookiesAccepted = message.totalCookiesAccepted;
      }
      if (message.hasOwnProperty("totalCookiesRejected")) {
        totalCookiesRejected = message.totalCookiesRejected;
      }
      if (message.hasOwnProperty("sessionCookiesAccepted")) {
        sessionCookiesAccepted = message.sessionCookiesAccepted;
      }
      if (message.hasOwnProperty("sessionCookiesRejected")) {
        sessionCookiesRejected = message.sessionCookiesRejected;
      }
      if (message.hasOwnProperty("isEnabled")) {
        isEnabled = message.isEnabled;
      }
      if (message.hasOwnProperty("isRejecting")) {
        isRejecting = message.isRejecting;
      }
      if (message.hasOwnProperty("darkMode")) {
        darkMode = message.darkMode;
      }
      storePersistentData();
      break;
    case "ping":
      console.log("Recieved a ping")
      response = {message: "Pong!"};
      break;
    default:
      break;
  }
  console.log("Response from background: "+JSON.stringify(response));
  sendResponse(response);
});

async function loadPersistentData() {
  let result = await chrome.storage.local.get(["totalCookiesAccepted", "totalCookiesRejected", "isEnabled", "isRejecting", "darkMode"]);
  if (Object.hasOwn(result, "totalCookiesAccepted") && Object.hasOwn(result, "totalCookiesRejected")) {
    console.log("Loaded persistent data");
    totalCookiesAccepted = result.totalCookiesAccepted;
    totalCookiesRejected = result.totalCookiesRejected;
    isEnabled = result.isEnabled ?? true;
    isRejecting = result.isRejecting ?? true;
    darkMode = result.darkMode ?? true;
  } else {
    console.log("No persistent data found, creating it instead")
    storePersistentData();
  }
  updateBadgeText();
}

function storePersistentData() {
  chrome.storage.local.set(
    {
      totalCookiesAccepted: totalCookiesAccepted,
      totalCookiesRejected: totalCookiesRejected,

      isEnabled: isEnabled,
      isRejecting: isRejecting,
      
      darkMode: darkMode
    }
  );
  updateBadgeText();
}

function updateBadgeText() {
  if (isEnabled) {
    chrome.action.setBadgeText({
      text: null,
    });
  } else {
    chrome.action.setBadgeText({
      text: "OFF",
    });
  }
}