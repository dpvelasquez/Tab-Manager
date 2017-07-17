document.addEventListener('DOMContentLoaded', function () {

    //Tab Events
    var settingsBtn = document.getElementById("settingsBtn");
    var closedBtn = document.getElementById("closedBtn");
    var domainsBtn = document.getElementById("domainsBtn");
    var pinnedBtn = document.getElementById("pinnedBtn");

    settingsBtn.addEventListener('click', function () {
        var tabContent = document.getElementsByClassName("tabContent");
        for (i = 0; i < tabContent.length; i++) {
            tabContent[i].style.display = "none";
        }
        tabLinks = document.getElementsByClassName("tabLinks");
        for (i = 0; i < tabLinks.length; i++) {
            tabLinks[i].className = tabLinks[i].className.replace(" active", "");
        }
        document.getElementById("settingsPage").style.display = "block";
        settingsBtn.className += " active";

        chrome.storage.sync.get(["inactiveTime", "closeTabsNum", "sortTabs", "notifications"], function (items) {
            document.getElementById("closeTime").value = items.inactiveTime / 60000; // Convert to minutes
            document.getElementById("autoCloseNum").value = items.closeTabsNum;
            document.getElementById("sortTabs").checked = items.sortTabs;
            document.getElementById("notifications").checked = items.notifications;
        });
    });

    closedBtn.addEventListener('click', function () {
        var tabContent = document.getElementsByClassName("tabContent");
        for (i = 0; i < tabContent.length; i++) {
            tabContent[i].style.display = "none";
        }
        tabLinks = document.getElementsByClassName("tabLinks");
        for (i = 0; i < tabLinks.length; i++) {
            tabLinks[i].className = tabLinks[i].className.replace(" active", "");
        }
        document.getElementById("closedPage").style.display = "block";
        closedBtn.className += " active";

        var closedTabs = document.getElementById("closedTabs");
        var reloadButtons = closedTabs.getElementsByTagName("input");
        for (var i=0, rLen=reloadButtons.length; i < rLen; i++) {
            reloadButtons[i].removeEventListener('click', reloadPage);
        }
        closedTabs.innerHTML = "";


        chrome.runtime.sendMessage({type:"closed"}, function (closed) {
            for (var i=0, cLen=closed.length; i < cLen; i++) {
                (function () {
                    var row = document.getElementById("closedTabs").insertRow(0);
                    var imageCell = row.insertCell(0);
                    imageCell.innerHTML="<img src='" + closed[i].tabIcon + "'/>";
                    var titleCell = row.insertCell(1);
                    titleCell.innerHTML = closed[i].tabTitle;
                    var reloadButton = document.createElement('input');
                    reloadButton.type = "button";
                    reloadButton.value = "Reload";
                    row.appendChild(reloadButton);
                    reloadButton.addEventListener('click', reloadPage);
                    reloadButton.Url = closed[i].tabUrl;
                    reloadButton.row = row;
                })();
            }
        });

        function reloadPage(evt) {
            chrome.runtime.sendMessage({type:"reload", value:evt.target.Url});
            evt.target.removeEventListener('click', reloadPage);
            evt.target.row.parentNode.removeChild(evt.target.row);
        }
    });

    domainsBtn.addEventListener('click', function () {
        var tabContent = document.getElementsByClassName("tabContent");
        for (i = 0; i < tabContent.length; i++) {
            tabContent[i].style.display = "none";
        }
        tabLinks = document.getElementsByClassName("tabLinks");
        for (i = 0; i < tabLinks.length; i++) {
            tabLinks[i].className = tabLinks[i].className.replace(" active", "");
        }
        document.getElementById("domainsPage").style.display = "block";
        domainsBtn.className += " active";

        var domainList = document.getElementById("domainList");
        var removeButtons = domainList.getElementsByTagName("input");
        for (var i=0, rLen=removeButtons.length; i < rLen; i++) {
            removeButtons[i].removeEventListener('click', removeDomain);
        }
        domainList.innerHTML = "";

        chrome.storage.sync.get("domains", function (items) {
            var domains = items.domains;
            for (var i=0, dLen=domains.length; i < dLen; i++) {
                (function () {
                    var row = document.getElementById("domainList").insertRow(0);
                    var domainCell = row.insertCell(0);
                    domainCell.innerHTML = domains[i];
                    var removeButton = document.createElement('input');
                    removeButton.type = "button";
                    removeButton.value = "Remove";
                    row.appendChild(removeButton);
                    removeButton.addEventListener('click', removeDomain);
                    removeButton.domains = domains;
                    removeButton.domainUrl = domains[i];
                    removeButton.row = row;
                })();
            }
        });

        function removeDomain(evt) {
            var index = evt.target.domains.indexOf(evt.target.domainUrl);
            evt.target.domains.splice(index, 1);
            chrome.storage.sync.set({"domains":evt.target.domains});
            chrome.runtime.sendMessage({type:"update"});
            evt.target.removeEventListener('click', removeDomain);
            evt.target.row.parentNode.removeChild(evt.target.row);
        }
    });

    pinnedBtn.addEventListener('click', function () {
        var tabContent = document.getElementsByClassName("tabContent");
        for (i = 0; i < tabContent.length; i++) {
            tabContent[i].style.display = "none";
        }
        tabLinks = document.getElementsByClassName("tabLinks");
        for (i = 0; i < tabLinks.length; i++) {
            tabLinks[i].className = tabLinks[i].className.replace(" active", "");
        }
        document.getElementById("pinnedPage").style.display = "block";
        pinnedBtn.className += " active";

        var pinnedTabs = document.getElementById("pinnedTabs");
        var removeButtons = pinnedTabs.getElementsByTagName("input");
        for (var i=0, rLen=removeButtons.length; i < rLen; i++) {
            removeButtons[i].removeEventListener('click', removePinned);
        }
        pinnedTabs.innerHTML = "";

        chrome.runtime.sendMessage({type:"tabs"}, function (openedTabs) {
            for (var i=0, oTLen=openedTabs.length; i < oTLen; i++) {
                if (openedTabs[i].pinned) {
                    (function () {
                        var row = document.getElementById("pinnedTabs").insertRow(0);
                        var pinnedCell = row.insertCell(0);
                        pinnedCell.innerHTML = openedTabs[i].url;
                        var removeButton = document.createElement('input');
                        removeButton.type = "button";
                        removeButton.value = "Remove";
                        row.appendChild(removeButton);
                        removeButton.addEventListener('click', removePinned);
                        removeButton.tabId = openedTabs[i].tabId;
                        removeButton.row = row;
                    })();
                }
            }
        });
        
        function removePinned(evt) {
            chrome.runtime.sendMessage({type:"unpin", value:evt.target.tabId});
            evt.target.removeEventListener('click', removePinned);
            evt.target.row.parentNode.removeChild(evt.target.row);
        }
    });
    
    settingsBtn.click();

    document.getElementById("saveBtn").addEventListener('click', function () {
        var closeTime = Number(document.getElementById("closeTime").value) * 60000; // Convert to ms
        var autoCloseNum = Number(document.getElementById("autoCloseNum").value);
        var sortTabs = document.getElementById("sortTabs").checked;
        var notifications = document.getElementById("notifications").checked;
        chrome.storage.sync.set({"inactiveTime":closeTime, "closeTabsNum":autoCloseNum,
                                "sortTabs":sortTabs, "notifications":notifications});
        chrome.runtime.sendMessage({type:"update"});
    });

    document.getElementById("cancelBtn").addEventListener('click', function() {
        chrome.storage.sync.get(["inactiveTime", "closeTabsNum", "sortTabs", "notifications"], function (items) {
            document.getElementById("closeTime").value = items.inactiveTime / 60000; // Convert to minutes
            document.getElementById("autoCloseNum").value = items.closeTabsNum;
            document.getElementById("sortTabs").checked = items.sortTabs;
            document.getElementById("notifications").checked = items.notifications;
        });
    });

    document.getElementById("addDomainBtn").addEventListener('click', function() {
        var domainPrompt = prompt("Enter a valid url:" );
        if (domainPrompt != null) {
            var domainFormatted = domainPrompt.replace("www.", "").replace(/^https?:\/\//,"");
            var domainUrl = new URL("http://" + domainFormatted).hostname;
            chrome.storage.sync.get("domains", function (items) {
                domains = items.domains;
                if (domains.indexOf(domainUrl) == -1) {
                    domains.push(domainUrl);
                    chrome.storage.sync.set({"domains":domains}, function() {
                        chrome.runtime.sendMessage({type:"update"});
                        domainsBtn.click();
                    });
                } else {
                    alert (domainUrl + "has already been whitelisted");
                }
            });
        }
    });
});