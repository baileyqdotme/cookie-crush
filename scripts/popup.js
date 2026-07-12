var darkMode;

function init() {
    chrome.runtime.sendMessage({type: "isRejecting"}, (rejectResponse) => {
        let sessionCountElement = document.getElementById("sessionCount");
        let totalCountElement = document.getElementById("totalCount");
        let reject = rejectResponse.reject;
        let keyword = reject ? "rejected" : "accepted";
        let allowRejectButton = document.getElementById("allow_reject");
        slide("slide2", reject);
        //allowRejectButton.innerText = reject ? "Reject all cookies" : "Allow all cookies";
        chrome.runtime.sendMessage({type: "getPersistentData"}, (dataResponse) => {
            let sessionCount = reject ? dataResponse.sessionCookiesRejected : dataResponse.sessionCookiesAccepted;
            let totalCount = reject ? dataResponse.totalCookiesRejected : dataResponse.totalCookiesAccepted;
            sessionCountElement.innerHTML = `Cookies automatically ${keyword} this session: ${sessionCount ?? 0}`;
            totalCountElement.innerHTML = `Total cookies automatically ${keyword}: ${totalCount ?? 0}`;
            darkMode = dataResponse.darkMode ?? true;
            setDarkMode(darkMode, false);
        })
    })

    chrome.runtime.sendMessage({type: "isEnabled"}, (enabledResponse) => {
        let enabled = enabledResponse.enabled;
        let enableDisableButton = document.getElementById("enable_disable");
        //enableDisableButton.innerText = enabled ? "Disable" : "Enable";
        slide("slide1", !enabled);   
    });
}


function toggleEnabled() {
    chrome.runtime.sendMessage({type: "isEnabled"}, (enabledResponse) => {
        let enabled = enabledResponse.enabled;
        chrome.runtime.sendMessage({type: "setPersistentData", isEnabled: !enabled}, () => {
            let enableDisableButton = document.getElementById("enable_disable");
            //enableDisableButton.innerText = !enabled ? "Disable" : "Enable";
            slide("slide1", enabled);
        })
    })
}



function toggleRejecting() {
    chrome.runtime.sendMessage({type: "isRejecting"}, (rejectResponse) => {
        let reject = rejectResponse.reject;
        chrome.runtime.sendMessage({type: "setPersistentData", isRejecting: !reject}, () => {
            let allowRejectButton = document.getElementById("allow_reject");
            //allowRejectButton.innerText = !reject ? "Reject all cookies" : "Allow all cookies";
            slide("slide2", !reject);
        })
    })
}



function slide(indicator, currentState){
    let dot = document.getElementById(indicator);
    console.log(document.getElementById(indicator))
    if (currentState == true){
        dot.style.animation="slideOut 0.5s forwards";
        currentState=false;
    }
    else if (currentState==false){
        dot.style.animation="slideIn 0.5s forwards";
        currentState=true;
    }
    console.log(currentState) 
}


function lightdarkToggle() {
    setDarkMode(!darkMode, true);
    chrome.runtime.sendMessage({type: "setPersistentData", darkMode:darkMode});
}


function setDarkMode(mode, animate) {
    darkMode = mode;
    let content = document.getElementById("content");
    let sliders = document.getElementsByClassName("sliderContainer");
    let indicator = document.getElementById("darklightImg");
    let elements = [content]
    for (let slider of sliders) {
        elements.push(slider); 
    }
    if (animate) {
        let animateMode = mode ? "darken" : "brighten";
        let oppositeMode = mode ? "brighten" : "darken";
        let animate = `${animateMode} .5s forwards`;
        for (let element of elements) {
            element.style.animation = animate; 
        }
    } else {
        let invert = `invert(${mode ? 0 : 1})`;
        let invertInvert = `invert(${mode ? 1 : 0}) !important`;
        for (let element of elements) {
            element.style.filter = invert; 
        }
    }
    
    indicator.src = mode ? "moon.png" : "sun.png"; 

    chrome.runtime.sendMessage({type: "setPersistentData", darkMode:mode});
}

function debugSettings() {
    chrome.runtime.sendMessage({type: "getPersistentData"}, (dataResponse) => {
        console.log("Persistent Data:");
        console.log(dataResponse);
    });
}

addEventListener("DOMContentLoaded", (event) => { 
    init();
    document.getElementById("enable_disable").addEventListener("click", () => {slide('slide1')});
    document.getElementById("allow_reject").addEventListener("click", () => {slide('slide2')});

    document.getElementById("enable_disable").addEventListener("click", toggleEnabled);
    document.getElementById("allow_reject").addEventListener("click", toggleRejecting);

    document.getElementById("darklight").addEventListener("click", lightdarkToggle);
})
