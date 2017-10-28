"use strict";
// A '.tsx' file enables JSX support in the TypeScript compiler, 
// for more information see the following page on the TypeScript wiki:
// https://github.com/Microsoft/TypeScript/wiki/JSX
exports.__esModule = true;
var React = require("react");
var ReactDOM = require("react-dom");
/*
export class App extends React.Component<IProps, IState>() {
    render() {
        return (
                <div className="well">
                    Hello from well
                </div>
            )
    }
}
*/
function App(props) {
    return (React.createElement("div", { className: "well" }, "Hello from well"));
}
(function RenderApp(where) {
    if (where === void 0) { where = 'reactroot'; }
    var App2 = (React.createElement("div", { className: "well" }, "Hello from well"));
    console.log('hello in console from app.tsx');
    ReactDOM.render(App2, document.getElementById(where));
})();
//# sourceMappingURL=app.js.map