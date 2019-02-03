let config = require('../config');

const sleepPause = config.exchanges.coinfalcon.sleepPause;

const crypto = require('crypto');
const tools = require('../src/tools');
var request = require('request');

let sign = function(method, request_path, body = undefined) {
    let timestamp = Date.now().toString();
    timestamp = parseInt(timestamp.substring(0, timestamp.length - 3), 10);
    let payload = timestamp+"|"+method+"|"+request_path;
    if (body) {
        payload += '|' + JSON.stringify(body);
    }
    //config.debug && console.log(payload);
    const hmac = crypto.createHmac('sha256', config.exchanges.coinfalcon.CD_API_SECRET_KEY);
    hmac.update(payload);
    let signature = hmac.digest('hex');
    return {"CF-API-KEY": config.exchanges.coinfalcon.CF_API_KEY, "CF-API-TIMESTAMP": timestamp, "CF-API-SIGNATURE": signature};
};

let getAccountsBalance = function(){
    return new Promise(async function (resolve) {
        //Waiting function to prevent reach api limit
        await tools.sleep(sleepPause);
        let request_path = "/api/v1/user/accounts";
        let url = config.exchanges.coinfalcon.url + request_path;
        request.get({url: url, headers : sign("GET", request_path)}, async function (error, response, body) {
            try {
                const result = JSON.parse(body);
                if (!error && response.statusCode === 200) {
                    resolve({s:1, data: result});
                } else {
                    console.error(body);
                    resolve({s:0, data: result});
                }
            } catch (e) {
                console.error(body);
                console.error(e);
                resolve({s:0});
            }
        });
    });
};

let getTicker = function(pair, level) {
    return new Promise(async function (resolve) {
        /*
            Response schema type: object

            [Object]	bids
            Aggregated bids.

            String	bids[].price
            String	bids[].size
            [Object]	asks
            Aggregated asks.

            String	asks[].price
            String	asks[].size
        */
        request.get({url: "https://coinfalcon.com/api/v1/markets/"+pair+"/orders", qs: { level: level.toString() }}, function(error, response, body) {
            try {
                const result = JSON.parse(body);
                if (!error && response.statusCode === 200) {
                    resolve({s:1, data: result});
                } else {
                    console.error(body);
                    resolve({s:0, data: result});
                }
            } catch (e) {
                console.error(body);
                console.error(e);
                resolve({s:0});
            }
        });
    });
};

let getOrders = function(pair, status){
    return new Promise(async function (resolve) {
        let request_path = "/api/v1/user/orders?market="+pair+"&status="+status;
        let url = config.exchanges.coinfalcon.url + request_path;
        request.get({url: url, headers : sign("GET", request_path)}, async function (error, response, body) {
            try {
                const result = JSON.parse(body);
                if (!error && response.statusCode === 200) {
                    resolve({s:1, data: result.data});
                } else {
                    console.error(body);
                    resolve({s:0, data: result});
                }
            } catch (e) {
                console.error(body);
                console.error(e);
                resolve({s:0});
            }
        });
    });
};

let getOrder = function(id){
    return new Promise(async function (resolve) {
        let request_path = "/api/v1/user/orders/"+id;
        let url = config.exchanges.coinfalcon.url + request_path;
        request.get({url: url, headers : sign("GET", request_path)}, async function (error, response, body) {
                    try {
                        const result = JSON.parse(body);
                        if (!error && response.statusCode === 200) {
                            resolve({s:1, data: result.data});
                        } else {
                            console.error(body);
                            resolve({s:0, data: result});
                        }
                    } catch (e) {
                        console.error(body);
                        console.error(e);
                        resolve({s:0});
                    }
        });
    });
};

let cancelOrder = function(id){
    return new Promise(async function (resolve) {
        let request_path = "/api/v1/user/orders/"+id;
        let url = config.exchanges.coinfalcon.url + request_path;
        request.delete({url: url, headers : sign("DELETE", request_path, {})}, async function (error, response, body) {
            try {
                const result = JSON.parse(body);
                if (!error && response.statusCode === 200) {
                    resolve({s:1, data: result.data});
                } else {
                    console.error(body);
                    resolve({s:0, data: result});
                }
            } catch (e) {
                console.error(body);
                console.error(e);
                resolve({s:0});
            }
        });

    });
};

let createOrder = function(pair, order_type, pendingSellOrder, price){
    return new Promise(async function (resolve) {
        let size = "";
        switch(order_type){
            case "buy":
                size = (Math.ceil((pair.buyForAmount/price)*Math.pow(10, pair.digitsSize))/Math.pow(10, pair.digitsSize)).toString();
                break;
            case "sell":
                size = tools.setPrecision(pendingSellOrder.sell_size, pair.digitsSize).toString();
                break;
        }
        let body = { market: pair.name, operation_type: 'limit_order', order_type: order_type, price: price.toString(), size: size, post_only: "false" };
        let request_path = "/api/v1/user/orders";
        let url = config.exchanges.coinfalcon.url + request_path;
        let o1 = { 'content-type': 'application/x-www-form-urlencoded',
            accept: 'application/json' };

        let headers = Object.assign(o1, sign("POST", request_path, body));
        request.post({url: url, headers: headers, form: body}, function(error, response, body) {
            try {
                const result = JSON.parse(body);
                if (!error && response.statusCode === 201) {
                    resolve({s:1, data: result.data});
                } else {
                    console.error(body);
                    resolve({s:0, data: result});
                }
            } catch (e) {
                console.error(body);
                console.error(e);
                resolve({s:0});
            }
        });
    });
};

let getOrderTrades = function(id){
    return new Promise(function (resolve) {
        let request_path = "/api/v1/user/orders/"+id+"/trades";
        let url = config.exchanges.coinfalcon.url + request_path;
        request.get({url: url, headers : sign("GET", request_path)}, async function (error, response, body) {
            try {
                const result = JSON.parse(body);
                if (!error && response.statusCode === 200) {
                    resolve({s:1, data: result});
                } else {
                    console.error(body);
                    resolve({s:0, data: result});
                }
            } catch (e) {
                console.error(body);
                console.error(e);
                resolve({s:0});
            }
        });
    });
};

let parseTicker = function(type, orders, pair, order){
    let ticks = {bid:[],bidBorder: 0, ask:[], askBorder:0};
    let ii=0;
    for(let i=0;i<orders.data.asks.length;i++){
        if(i===0){
            ticks.askBorder = parseFloat(orders.data.asks[i].price);
        }
        if(type === "ask"){
            if(typeof order !== 'undefined' && order.hasOwnProperty('sell_price') && parseFloat(orders.data.asks[i].price) === tools.setPrecision(order.sell_price, pair.digitsPrice)){
                const askSizeDiff = (parseFloat(orders.data.asks[i].size)-tools.setPrecision(order.sell_size, pair.digitsSize));
                if( askSizeDiff > pair.ignoreOrderSize){
                    ticks.ask.push({price: parseFloat(orders.data.asks[i].price), size: tools.setPrecision(askSizeDiff, pair.digitsSize)});
                    ii++;
                }
            } else if( parseFloat(orders.data.asks[i].size) > pair.ignoreOrderSize){
                ticks.ask.push({price: parseFloat(orders.data.asks[i].price), size: parseFloat(orders.data.asks[i].size)});
                ii++;
            }
        } else {
            break;
        }
    }
    ii=0;
    for(let i=0;i<orders.data.bids.length;i++){
        if(i === 0){
            ticks.bidBorder = parseFloat(orders.data.bids[i].price);
        }
        if(type === "bid"){
            if(typeof order !== 'undefined' && order.hasOwnProperty('buy_price') && parseFloat(orders.data.bids[i].price) === tools.setPrecision(order.buy_price, pair.digitsPrice)){
                const bidSizeDiff = (parseFloat(orders.data.bids[i].size)-tools.setPrecision(order.buy_size, pair.digitsSize));
                if( bidSizeDiff > pair.ignoreOrderSize){
                    ticks.bid.push({price: parseFloat(orders.data.bids[i].price), size: tools.setPrecision(bidSizeDiff, pair.digitsSize)});
                    ii++;
                } else {
                    console.log("My position "+orders.data.bids[i].price+" was alone (Lets process ask fornot counted ignored), removed from ticks.");
                }
            } else if(parseFloat(orders.data.bids[i].size) > pair.ignoreOrderSize){
                ticks.bid.push({price: parseFloat(orders.data.bids[i].price), size: parseFloat(orders.data.bids[i].size)});
                ii++;
            }
        } else {
            break;
        }
    }
    return ticks;
};

module.exports = {
    getAccountsBalance: getAccountsBalance,
    getTicker: getTicker,
    getOrders: getOrders,
    getOrder: getOrder,
    cancelOrder: cancelOrder,
    createOrder: createOrder,
    getOrderTrades: getOrderTrades,
    parseTicker: parseTicker
};

