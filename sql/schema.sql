-- this is the same schema used for all currency pairs. Only xrp_btc is here for example. See currencyPairs/add
create table binance_trades_xrp_btc (
    binance_trade_id integer unique primary key,
    price numeric,
    quantity numeric,
    trade_time timestamp with time zone,
    buyer_was_maker boolean,
    was_best_match boolean,
    btc_usd numeric
)

create table currency_pairs (
    currency_pair_id serial primary key,
    symbol text not null unique,
    trade_table text not null unique,
    exchange text not null,
    last_sequential_trade_id integer default 1
)