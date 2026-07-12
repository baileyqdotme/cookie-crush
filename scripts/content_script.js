console.log("Loaded content script (Cookie Crusher)");

var rules;

// weakset better than set for garbage collection
// and also a weakset and set is O(1) and arrays are O(n) 
var already_handled = new WeakSet();
var trackedModals = new Set();

var enabled;

var reject;

var provider;

let has_incremented = false;

const ignored_elements = [
    "style",
    "script",
    "link", 
    "meta",
    "head",
]

async function getRules() {
    const request = await fetch(
        chrome.runtime.getURL("rules.json")
    );
    await request.json().then((json) => {
        rules = json;
    });
}

function deepQuerySelectorAll(root, selector = "*") {
    let results = [];
    if (root.shadowRoot) {
        results = results.concat(deepQuerySelectorAll(root.shadowRoot, selector));
    }
    results = results.concat(
        [...root.querySelectorAll(selector)].filter(elem => !ignored_elements.includes(elem.tagName.toLowerCase()))
    );
    for (const elem of root.querySelectorAll("*")) {
        if (elem.shadowRoot) {
            results = results.concat(deepQuerySelectorAll(elem.shadowRoot, selector));
        }
    }
    return results;
}

function simulateClick(element) {
    const rect = element.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;

    for (const type of ["pointerdown", "mousedown", "pointerup", "mouseup", "click"]) {
        element.dispatchEvent(new MouseEvent(type, {
            bubbles: true,
            cancelable: true,
            view: window,
            clientX: x,
            clientY: y
        }));
    }
}

//is it clickable? i guess we'll never know
function isClickable(element) {
    // button element, a element
    // role of "button", "submit", etc.
    // onclick attribute
    // cursor style of "pointer"

    if (element.tagName === "BUTTON" || element.tagName === "A") {
        return true;
    }

    if (["button", "submit"].includes(element.getAttribute("role"))) {
        return true;
    }

    if (element.getAttribute("onclick") !== null) {
        return true;
    }

    if (window.getComputedStyle(element).cursor === "pointer") {
        return true;
    }
}

function checkForProviderDialogue(element) {
    if (!rules) { getRules(); }

    for (const prov of rules.providers) {

        if (!(element.id == "" || element.id == null)) {
            if (element.id === prov.modal.id) { 
                provider = prov; 
                return true;
            }
        }

        if (!(element.className == "" || element.className == null)) {
            if (prov.modal.class.includes(" ")) {
                let prov_classes = prov.modal.class.split(" ");
                let element_classes = [...element.classList];
                if (prov_classes.every(cls => element_classes.includes(cls))) {
                    provider = prov;
                    return true;
                }
            } else {
                if (element.className === prov.modal.class) {
                        provider = prov;
                        return true;
                }
            }
        }
        

        if (element.hasAttribute("aria-label") && !(element.getAttribute("aria-label") == "" || element.getAttribute("aria-label") == null || prov.modal["aria-label"] == "" || prov.modal["aria-label"] == null)) {
            if (element.getAttribute("aria-label") == prov.modal["aria-label"]) {
                provider = prov;
                return true;
            }
        }

    }

    return null;

}

function checkElementForProviderClick(element) {
    let text_finding = reject ? rules.rejectText : rules.acceptText;

    for (const child of deepQuerySelectorAll(element)) {
        if (child.nodeType !== Node.ELEMENT_NODE) { continue; }
        if (child.innerText == null || child.innerText == "") { continue; }

        childText = child.innerText.toLowerCase();
        if (childText == null || childText == "") { 
            if (child.value == null || child.value == "") { continue; }
            childText = child.value.toLowerCase();
        }

        if (text_finding.some(text => childText.includes(text))) {

            if (ignored_elements.includes(child.tagName.toLowerCase())) {
                continue;
            }

            if (child.parentElement && child.parentElement.tagName === "BUTTON") {
                child = child.parentElement;
            }
            if (child.parentElement && isClickable(child.parentElement)) {
                child = child.parentElement;
            }

            if (!isClickable(child)) { continue; }

            setTimeout(() => {
                child.click();
                simulateClick(child);
            }, 250);

            // incrementPersistentData
            if (has_incremented) { return; }
            chrome.runtime.sendMessage({
                type: "incrementPersistentData",
                reject: reject
            })
            has_incremented = true;

            return true;
        }
    }
    return false;
}

//gives the element a door handle
function handleElement(element, do_more_options = true) {

    if (!enabled) { return; }

    if (already_handled.has(element)) { 

        if (trackedModals.has(element)) {
            checkElementForProviderClick(element);
        }
        return;

    }
    already_handled.add(element);

    provcheck = checkForProviderDialogue(element);
    if (provcheck == null) { return; }

    console.log("Deteced provider: " + provider.name);
    trackedModals.add(element);

    if (checkElementForProviderClick(element)) { return; }

    if (!do_more_options) { return; }


    // checking for a "MORE OPTIONS"

    let text_finding = rules.moreOptions;
    let found_flag = false;
    
    for (const child of deepQuerySelectorAll(element)) {
        if (child.nodeType !== Node.ELEMENT_NODE) { continue; }
    
        if (child.id && child.id === provider.modal["more-options-id"]) {
            found_flag = true;

            setTimeout(() => {
                child.click();
                simulateClick(child);
            }, 100);
        }
    
        if (child.directText == null || child.directText == "") { continue; }
        if (text_finding.some(text => child.directText.toLowerCase().includes(text))) {
            
            setTimeout(() => {
                child.click();
                simulateClick(child);
            }, 100);

            found_flag = true;
            break;
        }
    }

    if (found_flag) {
        setTimeout(() => {
            handleElement(element, false);
        }, 300);
    }


}

//observes shadow roots
function observeShadowRoots(root) {
    for (const elem of root.querySelectorAll("*")) {
        if (elem.shadowRoot) {
            observer.observe(elem.shadowRoot, { childList: true, subtree: true });
            observeShadowRoots(elem.shadowRoot); // in case of nested shadow roots
        }
    }
}

const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
        for (const addedNode of mutation.addedNodes) {
            if (addedNode.nodeType !== Node.ELEMENT_NODE) { continue; }
            for (const childNode of addedNode.querySelectorAll("*")) {
                if (childNode.nodeType !== Node.ELEMENT_NODE) { continue; }
                handleElement(childNode);
            }
            handleElement(addedNode);

            // observe shadown roots as some providers
            // have modals in shadow roots (like drata)
            if (addedNode.shadowRoot) {
                observer.observe(addedNode.shadowRoot, { childList: true, subtree: true });
                observeShadowRoots(addedNode.shadowRoot);
            }
            observeShadowRoots(addedNode);

        }
    }

    // retry modals in-case they have been populated
    // after the initial check (like with the shadow doms on drata)
    if (!has_incremented) {
        for (const modal of trackedModals) {
            if (checkElementForProviderClick(modal)) { break; }
        }
    }
});


function getEnabled() {
    return new Promise((resolve) => {
        chrome.runtime.sendMessage({ type: "isEnabled" }, (response) => resolve(response?.enabled));
    });
}

function getRejecting() {
    return new Promise((resolve) => {
        chrome.runtime.sendMessage({ type: "isRejecting" }, (response) => resolve(response?.reject));
    });
}

Promise.all([getRules(), getEnabled(), getRejecting()]).then(([, enabledResult, rejectResult]) => {
    enabled = enabledResult;
    reject = rejectResult;

    observer.observe(document.documentElement, { childList: true, subtree: true });
    for (const el of document.querySelectorAll("*")) {
        handleElement(el);
    }
    observeShadowRoots(document.documentElement);
});