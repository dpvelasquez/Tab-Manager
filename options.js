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
        // Get saved settings
        chrome.storage.get(["inactiveTime", "closeTabsNum", "sortTabs", "notifications"], function (items) {
            document.getElementById("closeTime").value = items.inactiveTime;
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

        // Remove previously added event listeners to prevent memory leak
        var reloadButtons = document.getElementById("closedTabs").getElementsByTagName("input");
        for (var i=0, rLen=reloadButtons.length; i < rLen; i++) {
            reloadButtons[i].removeEventListener('click', reloadPage);
        }

        // Get closed tabs
        chrome.runtime.sendMessage({type:"closed", value:true}, function (closed) {
            for (var i=0, cLen=closed.length; i < cLen; i++) {
                (function () {
                    var row = document.getElementById("closedTabs").insertRow(0);
                    var imageCell = row.insertCell(0);
                    imageCell.innerHTML="<img src='" + closed[i].tabIcon + "'/>";
                    var titleCell = row.insertCell(1);
                    titleCell.innerHTML = closed[i].tabTitle;
                    var reloadButton = document.createElement('input');
                    reloadButton.type = "button";
                    reloadButton.innerHTML = "Reload";
                    row.appendChild(reloadButton);
                    reloadButton.addEventListener('click', reloadPage);
                    reloadButton.closed = closed;
                    reloadButton.title = closed[i].tabTitle;
                    reloadButton.row = row;
                })();
            }
        });

        function reloadPage(evt) {
            var index = evt.target.closed.map(function(e) {
                return e.tabTitle 
            }).indexOf(evt.target.title);
            chrome.runtime.sendMessage({type:"reload", value:index});
            document.getElementById("closedTabs").removeChild(evt.target.row);
            evt.target.removeEventListener('click', reloadPage);
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

        var removeButtons = document.getElementById("domainList").getElementsByTagName("input");
        for (var i=0, rLen=removeButtons.length; i < rLen; i++) {
            removeButtons[i].removeEventListener('click', removeDomain);
        }

        //Get domains
        chrome.storage.sync.get("domains", function (items) {
            var domains = items["domains"];
            for (var i=0, dLen=domains.length; i < dLen; i++) {
                (function () {
                    var row = document.getElementById("domainList").insertRow(0);
                    var domainCell = row.insertCell(0);
                    domainCell.innerHTML = domains[i];
                    var removeButton = document.createElement('input');
                    removeButton.type = "button";
                    removeButton.innerHTML = "Remove";
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
            chrome.runtime.sendMessage({type:"update", value:true});
            document.getElementById("domainList").removeChild(evt.target.row);
            evt.target.removeEventListener('click', removeDomain);
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

        var removeButtons = document.getElementById("pinnedTabs").getElementsByTagName("input");
        for (var i=0, rLen=removeButtons.length; i < rLen; i++) {
            removeButtons[i].removeEventListener('click', removePinned);
        }

        
        // Get pinned tabs
        function removePinned(evt) {

        }
    });
    
    // Default options tab
    settingsBtn.click();

    //Settings tab events
    document.getElementById("saveBtn").addEventListener('click', function () {
        var closeTime = document.getElementById("closeTime").value;
        var autoCloseNum = document.getElementById("autoCloseNum").value;
        var sortTabs = document.getElementById("sortTabs").checked;
        var notifications = document.getElementById("notifications").checked;
        chrome.storage.sync.set({"inactiveTime":closeTime, "closeTabsNum":autoCloseNum,
                                "sortTabs":sortTabs, "notifications":notifications});
        chrome.runtime.sendMessage({type:"update", value:true});
    });

    document.getElementById("cancelBtn").addEventListener('click', function() {
        chrome.storage.get(["inactiveTime", "closeTabsNum", "sortTabs", "notifications"], function (items) {
            document.getElementById("closeTime").value = items.inactiveTime;
            document.getElementById("autoCloseNum").value = items.closeTabsNum;
            document.getElementById("sortTabs").checked = items.sortTabs;
            document.getElementById("notifications").checked = items.notifications;
        });
    });

    //Closed tab events
    
});