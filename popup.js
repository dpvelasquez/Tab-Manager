document.addEventListener('DOMContentLoaded', function () {
    chrome.windows.getLastFocused(function (focusedWindow) {
        chrome.tabs.query({active:true, windowId:focusedWindow.id}, function (activeTab) {
            var pinButton = document.getElementById("pin");

            tabIds = JSON.parse(localStorage.getItem("tabIds"));
            if (tabIds == null) {
                localStorage.setItem("tabIds", JSON.stringify([]));
            } else {
                pinButton.checked = (tabIds.indexOf(activeTab[0].id) > -1);
            }
            
            pinButton.addEventListener('click', function () {
                tabIds = JSON.parse(localStorage.getItem("tabIds"));
                tabIndex = tabIds.indexOf(activeTab[0].id);
                if (tabIndex > -1) {
                    tabIds.splice(tabIndex, 1);
                    localStorage.setItem("tabIds", JSON.stringify(tabIds));
                    chrome.runtime.sendMessage({type:"pin", value:false});
                } else {
                    tabIds.push(activeTab[0].id);
                    localStorage.setItem("tabIds", JSON.stringify(tabIds));
                    chrome.runtime.sendMessage({type:"pin", value:true});
                }
            });
        });
    });
});
