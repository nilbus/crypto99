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