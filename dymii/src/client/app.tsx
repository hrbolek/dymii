// A '.tsx' file enables JSX support in the TypeScript compiler, 
// for more information see the following page on the TypeScript wiki:
// https://github.com/Microsoft/TypeScript/wiki/JSX

import * as React from 'react';
import * as ReactDOM from 'react-dom';

interface IProps {}
interface IState {}

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
    return (
            <div className="well">
                {"Hello from well"}
            </div>
        )
}

(function RenderApp(where: string = 'reactroot')
{
    
    const App2 = (<div className="well">{"Hello from well"}</div>);

    console.log('hello in console from app.tsx');
    ReactDOM.render(
      App2,
      document.getElementById(where)
    );
})();
