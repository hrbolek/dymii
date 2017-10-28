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
var default_menu_1 = require("./default_menu");
var menuItems = [
    { href: '/FilledForms/20', text: 'FilledForms' },
    { href: '/FilledForms/20', text: 'FilledForms' },
    { href: '/FilledForms/20', text: 'FilledForms' }
];
var DefaultLayout = (function (_super) {
    __extends(DefaultLayout, _super);
    function DefaultLayout() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    DefaultLayout.prototype.render = function () {
        return (React.createElement("html", null,
            React.createElement("head", null,
                React.createElement("link", { rel: "stylesheet", href: "/css/main.css" }),
                React.createElement("title", null, this.props.title),
                React.createElement("link", { href: "/css/bootstrap.min.css", rel: "stylesheet" }),
                React.createElement("script", { src: "https://oss.maxcdn.com/html5shiv/3.7.3/html5shiv.min.js" }),
                React.createElement("script", { src: "https://oss.maxcdn.com/respond/1.4.2/respond.min.js" })),
            React.createElement("body", null,
                React.createElement(default_menu_1.DefaultMenu, { home: '/', menuItems: menuItems }),
                React.createElement("br", null),
                React.createElement("br", null),
                React.createElement("br", null),
                React.createElement("div", { className: 'container-fluid' },
                    this.props.children,
                    React.createElement("div", { id: 'reactroot' }, "Empty 'reactroot'"),
                    React.createElement("div", { id: '666' }, "Empty '666'"))),
            React.createElement("script", { src: "/scripts/lib/jquery-2.2.3.min.js" }),
            React.createElement("script", { src: "/scripts/lib/bootstrap.min.js" }),
            React.createElement("script", { src: '/script/react.js' }),
            React.createElement("script", { src: '/script/react-dom.js' }),
            React.createElement("script", { src: '/script/prg.js' }),
            React.createElement("script", null, "var Element = App2; var id = (666).toString(); ReactDOM.render( Element, document.getElementById(id) );")));
    };
    return DefaultLayout;
}(React.Component));
exports.DefaultLayout = DefaultLayout;
//# sourceMappingURL=default.js.map