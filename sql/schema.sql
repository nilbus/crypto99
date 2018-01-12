create table binance_trades_xrp_btc (
     binance_trade_id integer unique primary key,
     price numeric,
     quantity numeric,
     trade_time timestamp with time zone,
     buyer_was_maker boolean,
     was_best_match boolean
 )