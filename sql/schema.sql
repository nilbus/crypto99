-- this is the same schema used for all currency pairs. Only xrp_btc is here for example. See currencyPairs/add
create table binance_trades_xrp_btc (
    binance_trade_id integer unique primary key,
    price numeric,
    quantity numeric,
    trade_time timestamp with time zone,
    buyer_was_maker boolean,
    was_best_match boolean
)

create table binance_trades_btc_usdt (
    binance_trade_id integer unique primary key,
    price numeric,
    quantity numeric,
    trade_time timestamp with time zone,
    buyer_was_maker boolean,
    was_best_match boolean
)

create table binance_trades_xlm_btc (
    binance_trade_id integer unique primary key,
    price numeric,
    quantity numeric,
    trade_time timestamp with time zone,
    buyer_was_maker boolean,
    was_best_match boolean
)

create table binance_trades_trx_btc (
    binance_trade_id integer unique primary key,
    price numeric,
    quantity numeric,
    trade_time timestamp with time zone,
    buyer_was_maker boolean,
    was_best_match boolean
)

create table binance_trades_adx_btc (
     binance_trade_id integer unique primary key,
     price numeric,
     quantity numeric,
     trade_time timestamp with time zone,
     buyer_was_maker boolean,
     was_best_match boolean
)

create table currency_pairs (
    currency_pair_id serial primary key,
    symbol text not null unique,
    trade_table text not null unique,
    exchange text not null unique
)