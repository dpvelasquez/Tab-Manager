(function() {
    localStorage.removeItem("tabIds");

    var tab = function (tabId, tabUrl, tabIcon, tabTitle, pin) {
        this.tabId = tabId;
        this.tabUrl = tabUrl;
        this.tabIcon = tabIcon;
        this.tabTitle = tabTitle;
        this.pin = pin;
        this.timeout = function () {
            var domain = (new URL(this.tabUrl)).hostname.replace("www.","");
            if (!this.pin && (tabs.length >= closeTabsNum) && (domains.indexOf(domain) == -1)) {
                this.timeoutId = setTimeout(function () {
                    chrome.tabs.remove(tabId);
                    closed.push({tabUrl:this.tabUrl, tabIcon:this.tabIcon, tabTitle:this.tabTitle});
                    if (notifications) {
                        chrome.notifications.create("", {
                            type:"basic",
                            iconUrl:this.tabIcon,
                            title:"Tab closed:",
                            message:(this.tabTitle + "\n(" + this.tabUrl + ")"),
                            eventTime:(Date.now() + 5000),
                            buttons:[{title:"Reload"}]
                        });
                    }
                }, timeout);
            }
        };
        this.timeout();
    };
    tab.prototype.haltTimeout = function () {
        if (this.timeoutId != undefined) {
            clearTimeout(this.timeoutId);
        }
    };

    var currentTab = new tab(0,"https://www.google.com","","",true);
    var tabs = [];
    var closed = [];
    var thresholdReached = false;

    // User settings
    var timeout;
    var closeTabsNum;
    var sortTabs;
    var notifications;
    var domians;

    chrome.storage.sync.get(["inactiveTime", "closeTabsNum", "sortTabs", "notifications", "domains"], function (items) {
        // Get saved settings
        timeout = items["inactiveTime"];
        closeTabsNum = items["closedTabsNum"];
        sortTabs = items["sortTabs"];
        notifications = items["notifications"];
        domains = items["domains"];
        if (timeout == undefined) {
            timeout = 1800000;
            chrome.storage.sync.set({"inactiveTime":timeout});
        }
        if (closeTabsNum == undefined) {
            closeTabsNum = 0;
            chrome.storage.sync.set({"closeTabsNum":closeTabsNum});
        }
        if (sortTabs == undefined) {
            sortTabs = false;
            chrome.storage.sync.set({"sortTabs":sortTabs});
        }
        if (notifications == undefined) {
            notifications = false;
            chrome.storage.sync.set({"notifications":notifications});
        }
        if (domains == undefined) {
            domains = [];
            chrome.storage.sync.set({"domains":domains});
        }

        // Get current tabs
        chrome.tabs.query({}, function (openedTabs) {
            chrome.windows.getLastFocused(function(focusedWindow) {
                for (var i=0, oTLen=openedTabs.length; i < oTLen; i++) {
                    foundTab = new tab(openedTabs[i].id, openedTabs[i].url, openedTabs[i].favIconUrl,
                                        openedTabs[i].title, openedTabs[i].pinned);
                    tabs.push(foundTab);
                    if (openedTabs[i].active && (openedTabs[i].windowId == focusedWindow.id)) {
                        foundTab.haltTimeout();
                        currentTab = foundTab;
                    }
                }
                sortTabsAlpha();
            });
        });
    });

    // Change timers upon activation
    chrome.tabs.onActivated.addListener(function (activeInfo) {
        var tabFound = false;
        for (var i=0, tLen=tabs.length; i < tLen; i++) {
            if (tabs[i].tabId == activeInfo.tabId) {
                currentTab.timeout();
                currentTab = tabs[i];
                tabs[i].haltTimeout();
                tabFound = true;
                break;
            }
        }
        if (!tabFound) {
            chrome.tabs.get(activeInfo.tabId, function (activeTab) {
                currentTab = new tab(activeTab.id, activeTab.url, activeTab.favIconUrl,
                                        activeTab.title, false);
                tabs.push(currentTab);
                sortTabsAlpha();
            });
        }
    });

    // Update tabs by removing removed tab
    chrome.tabs.onRemoved.addListener(function (tabId, removeInfo) {
        for (var i=0, tLen=tabs.length; i < tLen; i++) {
            if (tabId == tabs[i].tabId) {
                tabs[i].haltTimeout();
                // In case onRemoved fires first to prevent memory leak
                if(tabs[i].id == currentTab.id) {
                    currentTab.pin = true;
                }
                tabs.splice(i,1);
                break;
            }
        }
    });

    // Update current tab when user changes window
    chrome.windows.onFocusChanged.addListener(function (winId) {
        chrome.tabs.query({active:true, windowId:winId}, function (activeTab) {
            for (var i=0, tLen=tabs.length; i < tLen; i++) {
                if (activeTab[0].id == tabs[i].tabId) {
                    currentTab.timeout();
                    currentTab = tabs[i];
                    tabs[i].haltTimeout();
                    break;
                }
            }
        });
    });

    // Update url and pin status when user changes tab state
    chrome.tabs.onUpdated.addListener(function (tabId, info, tab) {
        if (info.status == "complete" || info.pinned != undefined) {
            for (var i=0, tLen=tabs.length; i < tLen; i++) {
                if (tabs[i].tabId == tabId) {
                    if (info.status == "complete" && tab.url != undefined) {
                        var prevDomain = (new URL(tabs[i].tabUrl)).hostname;
                        var currentDomain = (new URL(tab.url)).hostname;
                        if (domains.indexOf(currentDomain) > -1) {
                            tabs[i].haltTimeout();
                        } else if (domains.indexOf(prevDomain) > -1) {
                            tabs[i].timeout();
                        }
                        tabs[i].tabUrl = tab.url;
                        tabs[i].tabIcon = tab.favIconUrl;
                        tabs[i].tabTitle = tab.title;
                        sortTabsAlpha();
                    }
                    if (info.pinned==true) {
                        tabs[i].pin = true;
                        tabs[i].haltTimeout();
                    } else if (info.pinned==false) {
                        tabIds = JSON.parse(localStorage.getItem("tabIds"));
                        if (tabIds.indexOf(tabId) == -1) {
                            tabs[i].pin = false;
                            tabs[i].timeout();
                        }
                    }
                    break;
                }
            }
        }
    });

    // Fired when number of tabs goes over threshold
    function OnTabsThresholdReached(state) {
        var evt = new CustomEvent('TabsThresholdReached', {detail:state});
        if((tabs.length > closeTabsNum) && !thresholdReached) {
            thresholdReached = true;
            window.dispatchEvent(evt);
        }
    }

    window.addEventListener('TabsThresholdReached', function (e) {
        for (var i=0, tLen=tabs.length; i < tLen; i++) {
            tabs[i].timeout();
        }
        currentTab.haltTimeout();
    });

    // Fired when number of tabs goes below threshold
    function OnTabsThresholdLowered(state) {
        var evt = new CustomEvent('TabsThresholdLowered', {detail:state});
        if((tabs.length <= closeTabsNum) && thresholdReached) {
            thresholdReached = false;
            window.dispatchEvent(evt);
        }
    }

    window.addEventListener('TabsThresholdLowered', function (e) {
        for (var i=0, tLen=tabs.length; i < tLen; i++) {
            tabs[i].haltTimeout();
        }
    });

    /*
    Receive messages from options and popup page:
    Supports types:
        - {type:"pin", value:boolean}: Sets the current tab to value changing the tabs timeout ability.
        - {type:"update"}: Retrieves updated chrome storage settings.
        - {type:"closed"}: Sends the sender list of closed tabs.
        - {type:"reload", value:tabUrl}: Creates tab with url tabUrl.
        - {type: "unpin", value:tabId}: unpins a tab with value tabId.
        - {type:"tabs"}: Sends the sender list of opened tabs.
    */
    chrome.runtime.onMessage.addListener(function (request, sender, respond) {
        if (request.type == "pin") {
            currentTab.pin = request.value;
        } else if (request.type == "update") {
            chrome.storage.sync.get(["inactiveTime", "closeTabsNum", "sortTabs", "notifications", "domains"], function (items) {
                // Get updated saved settings
                var prevTimeout = timeout;
                timeout = items["inactiveTime"];
                closeTabsNum = items["closedTabsNum"];
                sortTabs = items["sortTabs"];
                notifications = items["notifications"];
                var prevDomains = domains;
                domains = items["domains"];

                // Reflect changes
                // timeout update
                if (prevTimeout != timeout) {
                    for (var i=0, tLen=tabs.length; i < tLen; i++) {
                        tabs[i].haltTimeout();
                        tabs[i].timeout();
                    }
                }
                // sort update
                sortTabsAlpha();
                // domains update
                for (var i=0, tLen=tabs.length; i < tLen; i++) {
                    var domain = (new URL(tabs[i].tabUrl)).hostname;
                    if (domains.indexOf(domain) > -1) {
                        tabs[i].haltTimeout();
                    } else if (prevDomains.indexOf(domain) > -1) {
                        tabs[i].timeout();
                    }
                }
            });
        } else if (request.type == "closed") {
            respond(closed);
        } else if (request.type == "reload") {

        } else if (request.type == "unpin") {

        } else if (request.type == "tabs") {
            respond(tabs);
        }
    });

    // Helper function to sort tabs alphabetically 
    function sortTabsAlpha() {
        if (sortTabs) {
            tabs.sort(function (tab_1, tab_2) {
                tab_1Url = tab_1.tabUrl.replace(/^https?:\/\//,"").replace("www.","");
                tab_2Url = tab_2.tabUrl.replace(/^https?:\/\//,"").replace("www.","");
                if (tab_1Url < tab_2Url) {
                    return -1;
                } 
                if (tab_1Url> tab_2Url) {
                    return 1;
                }
                return 0;
            });
            for (var i=0, tLen=tabs.length; i < tLen; i++) {
                chrome.tabs.move(tabs[i].tabId, {index:i});
            }
        }
    }
})();