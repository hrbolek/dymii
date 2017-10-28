// A '.tsx' file enables JSX support in the TypeScript compiler, 
// for more information see the following page on the TypeScript wiki:
// https://github.com/Microsoft/TypeScript/wiki/JSX

import * as React from 'react';
import { DefaultLayout } from './layouts/default';

interface IProps {
    title: string,
    name: string
}

interface IState { }

export default class HelloMessage extends React.Component<IProps, IState> {
    render() {
        return (
            <DefaultLayout title='title' name='name'>
                <div className="well">Hello {this.props.name}</div>
            </DefaultLayout>
        );
    }
}
