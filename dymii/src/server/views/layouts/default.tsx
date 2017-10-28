// A '.tsx' file enables JSX support in the TypeScript compiler, 
// for more information see the following page on the TypeScript wiki:
// https://github.com/Microsoft/TypeScript/wiki/JSX

import * as React from 'react';
import { DefaultMenu } from './default_menu';

interface IProps {
    title: string,
    name: string
}

interface IState { }

var menuItems = [
    { href: '/FilledForms/20', text: 'FilledForms' },
    { href: '/FilledForms/20', text: 'FilledForms' },
    { href: '/FilledForms/20', text: 'FilledForms' }
];

export class DefaultLayout extends React.Component<IProps, IState> {
    render() {
        return (
            <html>
                <head>

{/*
                    <meta charset="utf-8" />
                    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
//*/
}
                    <link rel="stylesheet" href="/css/main.css" />
                    <title>{this.props.title}</title>

                    {//<!-- Bootstrap -->
                    }
                    <link href="/css/bootstrap.min.css" rel="stylesheet" />

                    {//<!-- HTML5 shim and Respond.js for IE8 support of HTML5 elements and media queries -->
                    }
                    {//<!-- WARNING: Respond.js doesn\'t work if you view the page via file:// -->
                    }
                        {//<!--[if lt IE 9]>
                        }
                        <script src="https://oss.maxcdn.com/html5shiv/3.7.3/html5shiv.min.js"></script>
                        <script src="https://oss.maxcdn.com/respond/1.4.2/respond.min.js"></script>
                        {//<![endif]-->
                        }
                </head>
                <body>
                    

                    <DefaultMenu home={'/'} menuItems={menuItems}>
                    </DefaultMenu>
                    <br/>
                    <br/>
                    <br/>

                    <div className='container-fluid'>
                        {this.props.children}
                        {// <!-- jQuery (necessary for Bootstrap\'s JavaScript plugins) -->
                        }
                        {// <!-- Include all compiled plugins (below), or include individual files as needed -->
                        }

                        <div id={'reactroot'}>
                            Empty 'reactroot'
                        </div>
                        <div id={'666'}>
                            Empty '666'
                        </div>

                    </div>
                </body>

                <script src="/scripts/lib/jquery-2.2.3.min.js"></script>
                <script src="/scripts/lib/bootstrap.min.js"></script>
                <script src='/script/react.js' />
                <script src='/script/react-dom.js' />
                <script src='/script/prg.js' />
                <script>
var Element = App2;
var id = (666).toString();
ReactDOM.render(
  Element,
  document.getElementById(id)
);
                </script>
            </html>
        );
    }
}
