"use strict";
// A '.tsx' file enables JSX support in the TypeScript compiler, 
// for more information see the following page on the TypeScript wiki:
// https://github.com/Microsoft/TypeScript/wiki/JSX
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
exports.__esModule = true;
var React = require("react");
var DefaultMenu = (function (_super) {
    __extends(DefaultMenu, _super);
    function DefaultMenu() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    DefaultMenu.prototype.renderMenuItems = function () {
        var result = [];
        console.log(JSON.stringify(this.props.menuItems));
        if (this.props.menuItems) {
            for (var i = 0; i < this.props.menuItems.length; i++) {
                var citem = this.props.menuItems[i];
                result.push(React.createElement("li", { key: i },
                    React.createElement("a", { href: citem.href }, citem.text)));
            }
        }
        return result;
    };
    DefaultMenu.prototype.render = function () {
        return (React.createElement("nav", { className: "navbar navbar-default navbar-fixed-top" },
            React.createElement("div", { className: "container-fluid" },
                React.createElement("div", { className: "navbar-header" },
                    React.createElement("a", { className: "navbar-brand", href: "#" },
                        React.createElement("i", { className: "glyphicon glyphicon-home" }),
                        React.createElement("span", { className: "sr-only" }, "Home"))),
                React.createElement("ul", { className: "nav navbar-nav" },
                    this.renderMenuItems(),
                    this.props.children))));
    };
    DefaultMenu.prototype.render2 = function () {
        return (React.createElement("nav", { className: "navbar navbar-dark navbar-fixed-top" },
            React.createElement("div", { className: "container-fluid" },
                React.createElement("div", { className: "navbar-header" },
                    React.createElement("a", { href: this.props.home, className: "navbar-brand" },
                        React.createElement("i", { className: "glyphicon glyphicon-home" }),
                        React.createElement("span", { className: "sr-only" }, "Home"))),
                React.createElement("button", { className: "navbar-toggler", type: "button", "data-toggle": "collapse", "data-target": "#navbarsExampleDefault", "aria-controls": "navbarsExampleDefault", "aria-expanded": "false", "aria-label": "Toggle navigation" },
                    React.createElement("span", { className: "navbar-toggler-icon" })),
                React.createElement("div", { className: "collapse navbar-collapse" },
                    React.createElement("ul", { className: "nav navbar-nav" },
                        this.renderMenuItems(),
                        this.props.children)))));
    };
    return DefaultMenu;
}(React.Component));
exports.DefaultMenu = DefaultMenu;
//# sourceMappingURL=default_menu.js.map