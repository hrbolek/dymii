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
var default_1 = require("./layouts/default");
var HelloMessage = (function (_super) {
    __extends(HelloMessage, _super);
    function HelloMessage() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    HelloMessage.prototype.render = function () {
        return (React.createElement(default_1.DefaultLayout, { title: 'title', name: 'name' },
            React.createElement("div", { className: "well" },
                "Hello ",
                this.props.name)));
    };
    return HelloMessage;
}(React.Component));
exports["default"] = HelloMessage;
//# sourceMappingURL=index.js.map