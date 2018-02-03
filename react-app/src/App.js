import React, { Component } from 'react';
import logo from './bit_coin_logo.png';
import './App.css';
import apiClient from 'superagent';

class App extends Component {

  constructor(props) {
    super(props);
    this.state ={
      host: window.location.hostname === 'localhost' ? 'http://localhost:7001' : '',
      currencyPairs: []
    };
  }

  componentDidMount() {
    apiClient.get(this.state.host + '/currencyPairs/list')
      .then(res => {
        this.setState({...this.state, currencyPairs: res.body});
      });
  }

  download(symbol) {
    window.location = this.state.host + '/download/binance?symbol=xrp_btc';
  }

  render() {
    const buttons = this.state.currencyPairs.map(pair => (
      <button key={pair.symbol} onClick={this.download.bind(this, pair.symbol)}>Download {pair.symbol}</button>
    ));

    return (
      <div className="App">
        <header className="App-header">
          <img src={logo} className="App-logo" alt="logo" />
          <h1 className="App-title">Crypto 99</h1>
        </header>

        {buttons}
      </div>
    );
  }
}

export default App;
