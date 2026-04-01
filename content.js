// injeta script real na página

const script = document.createElement("script");
script.src = chrome.runtime.getURL("inject.js");
script.onload = () => script.remove();

(document.head || document.documentElement).appendChild(script);

// escuta dados do inject
window.addEventListener("message", (event) => {

  if (event.data?.source === "vsl-extension") {

    chrome.runtime.sendMessage({
      type: "VIDEO_FOUND",
      video: {
        url: event.data.url
      }
    });

  }

});