// A '.tsx' file enables JSX support in the TypeScript compiler, 
// for more information see the following page on the TypeScript wiki:
// https://github.com/Microsoft/TypeScript/wiki/JSX

import * as React from 'react';

interface IProps {
    home: string,
    menuItems: any[]
}
interface IState {}

export class DefaultMenu extends React.Component<IProps, IState> {

    renderMenuItems() {
        var result = [];
        console.log(JSON.stringify(this.props.menuItems));
        if (this.props.menuItems) {
            for (var i = 0; i < this.props.menuItems.length; i++) {
                var citem = this.props.menuItems[i];
                result.push(
                    <li key={i}>
                        <a href={citem.href}>{citem.text}</a>
                    </li>
                )
            }
        }
        return result;
    }

    render() {
        return (
            <nav className="navbar navbar-default navbar-fixed-top">
                <div className="container-fluid">
                    <div className="navbar-header">
                        <a className="navbar-brand" href="#">
                            <i className="glyphicon glyphicon-home"></i>
                            <span className="sr-only">Home</span>
                        </a>
                    </div>
                    <ul className="nav navbar-nav">
                        {this.renderMenuItems()}
                        {this.props.children}
                    </ul>
                </div>
            </nav>
            )
    }

    render2() {
        return (
            <nav className="navbar navbar-dark navbar-fixed-top">
                <div className="container-fluid">
                    <div className="navbar-header">
                        <a href={this.props.home} className="navbar-brand">
                            <i className="glyphicon glyphicon-home"></i>
                            <span className="sr-only">Home</span>
                        </a>
                    </div>
                    <button className="navbar-toggler" type="button" data-toggle="collapse" data-target="#navbarsExampleDefault" aria-controls="navbarsExampleDefault" aria-expanded="false" aria-label="Toggle navigation">
                        <span className="navbar-toggler-icon"></span>
                    </button>
                    <div className="collapse navbar-collapse">
                        <ul className="nav navbar-nav">
                            {this.renderMenuItems()}
                            {this.props.children}
                        </ul>
                    </div>
                </div>
            </nav>
        )
    }
}
