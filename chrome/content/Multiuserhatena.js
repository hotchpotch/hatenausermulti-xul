/**
 * Yuichi Tateno <hotchpotch@gmail.com>
 * 2008-12-10
 *
 * based on Multi login for Hatena
 * http://gist.github.com/5583
 * cho45 <cho45@lowreal.net>
 * 2007-10-15
 *
 * License:
 * Creative Commons by
 * http://creativecommons.org/licenses/by/3.0/
 *
 * Using information in your password manager,
 * you have to logged in hatena previously.
 *
 * This is now for Firefox3.
 * In Firefox2, use r494.
 */

// debug
//var p = function(str) {
//    Application.console.log(str);
//};


if (typeof MultiUserOnHatenaService != "function") {
    var MultiUserOnHatenaService = function () {
        if (arguments.callee.instance) {
            // some complex process for reloading
            for (let prop in arguments.callee.prototype) {
                if (arguments.callee.prototype.hasOwnProperty(prop)) {
                    arguments.callee.instance[prop] = arguments.callee.prototype[prop];
                }
            }
            return arguments.callee.instance;
        } else {
            this.initialize.apply(this, arguments);
            arguments.callee.instance = this;
        }
    };
    MultiUserOnHatenaService.XULNS = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";
}

MultiUserOnHatenaService.prototype = {
    ID : "status-bar-multi-user-hatena-uc",

    initialize : function () {
        this.checkPanel();
    },

    checkPanel: function() {
        var panel = document.getElementById('multi-user-hatena-panel');
        if (panel) {
            this.init();
        } else {
            var self = this;
            setTimeout( function() { self.checkPanel() }, 300 );
        }
    },
    init: function() {
        var self = this;
        self.manager    = Components.classes["@mozilla.org/login-manager;1"]
                                    .getService(Components.interfaces.nsILoginManager);
        self.IOService  = Components.classes["@mozilla.org/network/io-service;1"]
                                    .getService(Components.interfaces.nsIIOService);


        self.panel    = document.getElementById('multi-user-hatena-panel');
        while (self.panel.firstChild) self.panel.removeChild(self.panel.firstChild);

        self.img = document.createElementNS(MultiUserOnHatenaService.XULNS, "image");
        self.iconimg = <><![CDATA[
            data:image/png;base64,
            iVBORw0KGgoAAAANSUhEUgAAABAAAAAQBAMAAADt3eJSAAAACXBIWXMAAABI
            AAAASABGyWs+AAAACXZwQWcAAAAQAAAAEABcxq3DAAAAGFBMVEUAAAAqX8lS
            eeeMou7H0uTg6frr8Pn///+4PVzXAAAAAXRSTlMAQObYZgAAAAFiS0dEBxZh
            iOsAAABFSURBVAjXY0hLNTYyNmJgYEgNMVI0UkRmhLgoCioKAhlpqSAIVJUa
            AoJASTgjxAUEoaoImQSSBZnEABIEGYBggEwAmQQAzKgbQqenab4AAAAASUVO
            RK5CYII=
        ]]></>.replace(/\s+/g, "");
        self.img.setAttribute("src", self.iconimg);

        self.menu = document.createElementNS(MultiUserOnHatenaService.XULNS, "menupopup");

        self.panel.appendChild(self.menu);
        self.panel.addEventListener("click", function () {
            self.onPanelClick.apply(self, arguments);
        }, false);

        var t = document.getElementById(self.ID)
        if (t) t.parentNode.removeChild(t);
        self.panel.id = self.ID;

        var appcontent = document.getElementById("appcontent");
        if (appcontent) {
            // はてな上でのログイン/ログアウトを追跡してステータスに反映させる
//          appcontent.addEventListener("DOMContentLoaded", function (e) {
//              return self.onDOMContentLoad(e);
//          }, true);
            window.addEventListener("pagehide", function (e) {
                var loc = e.target.location.href;
                switch (true) {
                    case (loc.indexOf("://www.hatena.ne.jp/logout") != -1):
                    case (loc.indexOf("://www.hatena.ne.jp/login")  != -1):
                        self.checkLogin();
                }
            }, true);
        }

        self.setStatus('');
        setTimeout(function () { self.checkLogin() }, 1000);
    },

    getProfileImage : function (name) {
         var pre = name.substr(0, 2);
         return 'http://www.hatena.ne.jp/users/' + pre + '/' + name + '/profile_s.gif';
    },

    getProfileIcon : function (name) {
        var icon = document.createElementNS(MultiUserOnHatenaService.XULNS, "image");
        icon.setAttribute("src", this.getProfileImage(name));
        return icon;
    },

    onPanelClick : function (e) {
        if (this.menu.state != "closed") return;

        var matched = [];
//      var passwords = this.manager.enumerator;
//      var pass;
//      while (passwords.hasMoreElements()) {
//          var pass = passwords.getNext().QueryInterface(Components.interfaces.nsIPassword);
//          if (pass.host.match(/^https?:\/\/www\.hatena\.ne\.jp/)) matched.push(pass);
//      }
        var logins = this.manager.findLogins({}, "https://www.hatena.ne.jp", "", null);

        while (this.menu.firstChild) this.menu.removeChild(this.menu.firstChild);
        logins.forEach(function (l) {
            var self = this;
            var mi = document.createElementNS(MultiUserOnHatenaService.XULNS, "menuitem");
            var icon = self.getProfileIcon(l.username);
            mi.appendChild(icon);
            var label = document.createElementNS(MultiUserOnHatenaService.XULNS, "label");
            label.setAttribute('value', l.username);
            mi.appendChild(label);
            mi.addEventListener("command", function (e) {
                self.menu.hidePopup();
                self.switchUser(l);
            }, false);
            this.menu.appendChild(mi);
        }, this);

        //this.menu.showPopup(this.panel, -1, -1, "popup", "bottomleft", "topleft");
        this.menu.openPopup(this.panel, "after_start", 0, 0, false, true);
    },

    checkLogin : function () {
        var self = this;
        var req = new XMLHttpRequest;
        req.open("GET", "http://www.hatena.ne.jp/my", true);
        req.onload = function (e) { try {
            if (req.responseText.match(/<a href="\/my"><strong>([^<]+)<\/strong><\/a>/)) {
                self.setStatus(RegExp.$1);
            } else {
                self.setStatus("[not logged in]");
            }
        } catch (e) { alert(e) } };
        req.onerror = function (e) {
            self.setStatus(String(e));
        };
        req.send(null);
    },

    switchUser : function (logininfo) { try {
        var self = this;
        this.sessions = this.sessions || {};

        self.setStatus("Logging out...");
        var req = new XMLHttpRequest;
        req.open("GET", "http://www.hatena.ne.jp/logout", true);
        req.onload = function (e) { try {
            var req = this;

//          // debug
//          var uri = "data:text/plain," + encodeURI(req.responseText);
//          var newTab = gBrowser.addTab(uri);

            self.setStatus("Logging in...");
            var req = new XMLHttpRequest;
            req.open("POST", "https://www.hatena.ne.jp/login", true); // async load
            req.onload = function (e) { try {
                var req = this;

//              // debug
//              var uri = "data:text/plain," + encodeURI(req.responseText);
//              var newTab = gBrowser.addTab(uri);

                if (req.responseText.match(/でログイン中です/)) {
                    self.setStatus(logininfo.username);
                    content.location.reload();
                } else {
                    self.setStatus("Failed");
                }
            } catch (e) { alert(e) } };
            req.onerror = function (e) {
                alert(e);
            };
            req.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
            req.send([
                "name="     , encodeURIComponent(logininfo.username),
                "&password=", encodeURIComponent(logininfo.password),
            ].join(""));
        } catch (e) { alert(e) } };
        req.send(null);

        // this.currentUser = logininfo;
    } catch (e) { alert(e) } },

    setStatus : function (msg) {
        this.panel.setAttribute("label", msg);
        this.panel.setAttribute("tooltiptext", msg);
        this.panel.insertBefore(this.img, this.panel.firstChild);
    },
};

new MultiUserOnHatenaService();

