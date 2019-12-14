/*
 ============================================================================
 Name        : Coinbase Pro Trading Bot
 Author      : ZachHoskins
 Version     : 4.0
 Copyright   : GNU General Public License (GPLv3)
 Description : Trading bot for the Coinbase Pro exchange
 ============================================================================
 */

//Constants
const fs = require('fs');
const CBPTT = require('coinbase-pro');
const CBPTT_URI = 'https://api.pro.coinbase.com';
const WEBSOCKET_URI = 'wss://ws-feed.pro.coinbase.com'
const APP_VERSION = "v4.0";

  // Profit percentage for buying/selling
  const PROFIT_PERCENTAGE = 1; // DO NOT PUT LESS THAN 1. OTHERWISE YOU WILL LOSE MONEY. (Maker Fee is usually .5% and Taker fee is usually .5%)
      
  // Start Time & Time Between Each Cycle
  const INTERVAL_TIME = 5000; // In Milliseconds 30,000ms = 30s

  // Lowest Investment Amount
  const BASE_INVESTMENT_PERCENTAGE = 0.05; // 1.0 = 100%

  // #region Console Text Formatting
  // 
  Reset = "\x1b[0m"
  Bright = "\x1b[1m"
  Dim = "\x1b[2m"
  Underscore = "\x1b[4m"
  Blink = "\x1b[5m"
  Reverse = "\x1b[7m"
  Hidden = "\x1b[8m"

  // Foreground Colors
  FgBlack = "\x1b[30m"
  FgRed = "\x1b[31m"
  FgGreen = "\x1b[32m"
  FgYellow = "\x1b[33m"
  FgBlue = "\x1b[34m"
  FgMagenta = "\x1b[35m"
  FgCyan = "\x1b[36m"
  FgWhite = "\x1b[37m"
  FgBrightBlack = "\x1b[90m"
  FgBrightRed = "\x1b[91m"
  FgBrightGreen = "\x1b[92m"
  FgBrightYellow = "\x1b[93m"
  FgBrightBlue = "\x1b[94m"
  FgBrightMagenta = "\x1b[95m"
  FgBrightCyan = "\x1b[96m"
  FgBrightWhite = "\x1b[97m"

  // Background Colors
  BgBlack = "\x1b[40m"
  BgRed = "\x1b[41m"
  BgGreen = "\x1b[42m"
  BgYellow = "\x1b[43m"
  BgBlue = "\x1b[44m"
  BgMagenta = "\x1b[45m"
  BgCyan = "\x1b[46m"
  BgWhite = "\x1b[47m"
  BgBrightBlack = "\x1b[100m"
  BgBrightRed = "\x1b[101m"
  BgBrightGreen = "\x1b[102m"
  BgBrightYellow = "\x1b[103m"
  BgBrightBlue = "\x1b[104m"
  BgBrightMagenta = "\x1b[105m"
  BgBrightCyan = "\x1b[106m"
  BgBrightWhite = "\x1b[107m"
// #endregion


// Reading JSON Data
let rawcrypto = fs.readFileSync('./settings.json');
let settings = JSON.parse(rawcrypto);
var cryptoArray = [];
let jsonData = [];
let lastSellPriceData = [];

let usdAvailable = null;
let usdBalance = null;

for (let i = 0; i < settings.crypto.length; i++) {
  if(settings.crypto[i].enabled){
    cryptoArray.push(settings.crypto[i].usdPair);
  }
}

// API Authentications
const PASSPHRASE = process.env.TRADING_BOT_PASSPHRASE || settings.API.PASSPHRASE;
const KEY = process.env.TRADING_BOT_KEY || settings.API.KEY;
const SECRET = process.env.TRADING_BOT_SECRET || settings.API.SECRET;
let authenticatedClient = null;
let publicClient = null;


const websocket = new CBPTT.WebsocketClient(
  cryptoArray,
  WEBSOCKET_URI,
  {
    key: KEY,
    secret: SECRET,
    passphrase: PASSPHRASE,
  },
  { channels: ['ticker'] }
);

//WebSocket
websocket.on('message', data => {
  if(data.type==='ticker'){
    
    for (let i = 0; i < settings.crypto.length; i++) {
      if(data.product_id===settings.crypto[i].usdPair){
        settings.crypto[i].bestAsk = data.best_ask;
        settings.crypto[i].bestBid = data.best_bid;
        settings.crypto[i].open_24h = data.open_24h;
        settings.crypto[i].low_24h = data.low_24h;
        settings.crypto[i].high_24h = data.high_24h;
        settings.crypto[i].average_24h = ((Number(data.high_24h)+Number(data.low_24h))/2).toFixed(4);
        settings.crypto[i].percentChange_open_24h = (((data.best_ask/data.open_24h)-1)*100).toFixed(2);
        settings.crypto[i].percentChange_average_24h = (((data.best_ask/settings.crypto[i].average_24h)-1)*100).toFixed(2);
        
        // settings.crypto[i].available = null;
        // settings.crypto[i].balance = null;
        // settings.crypto[i].sellBackPrice = null;
        // settings.crypto[i].buyPercentage = null;
        // settings.crypto[i].lastBuyOrderId = null;
        // settings.crypto[i].lastBuyOrderPrice = null;
        // settings.crypto[i].lastBuyOrderSize = null;
        settings.crypto[i].buyCount = 0;
      };

      for(var item of jsonData){
        for (let i = 0; i < settings.crypto.length; i++) {
          if(item.currency==="USD"){
            usdAvailable = parseFloat(item.available);
            usdBalance = parseFloat(item.balance);
          }
          if(item.currency===settings.crypto[i].ticker){
            settings.crypto[i].available = parseFloat(item.available).toFixed(8);
            settings.crypto[i].balance = parseFloat(item.balance).toFixed(8);
          }
        }
      }

      for(var sale of lastSellPriceData){
        for (let j = 0; j < settings.crypto.length; j++) {
          if(settings.crypto[j].usdPair===sale.product_id){
            if (settings.crypto[j].lastSellOrderPrice===undefined){
              settings.crypto[j].lastSellOrderPrice = parseFloat(sale.price).toFixed(4);
              settings.crypto[j].lastSellOrderSize = sale.size;
            } else if (settings.crypto[j].lastSellOrderPrice>sale.price){
              settings.crypto[j].lastSellOrderPrice = parseFloat(sale.price).toFixed(4);
              settings.crypto[j].lastSellOrderSize = sale.size;
            }
            
          }
        }
      }
      
      // CALLBACKS
      const buyOrder_Callback = (error, response, data) => {
        if (error) {
            console.log(error);
        } 
        
        settings.crypto[i].lastBuyOrderId = null;
        settings.crypto[i].lastBuyOrderPrice = null;
        settings.crypto[i].lastBuyOrderSize = null;

        // setTimeout(function(){return true;},3000);
    
        if (data!=null){
          settings.crypto[i].lastBuyOrderId = data.id;
          settings.crypto[i].lastBuyOrderPrice = parseFloat(data.price);
          settings.crypto[i].lastBuyOrderSize = parseFloat(data.size);
        }
   
        placeSellOrder();
      }

      const getFilledPrice_Callback = (error, response, data) => {
        if (error){
          var dateTime = new Date();
          let FILE_NAME = `${dateTime.getFullYear()}${dateTime.getMonth()+1}${dateTime.getDate()}-${dateTime.getHours()}${dateTime.getMinutes()}`;
          
          fs.writeFile(`debug/${FILE_NAME}-getFilledPrice.log`, `${dateTime.toDateString()}\n getFilledPrice_Callback:\n\n ${data}`, (err) => { 
                          
              // In case of a error throw err. 
              if (err) throw err; 
            }) 
        }
        if ((Array.isArray(data)) && (data.length >= 1))
        {
          settings.crypto[i].lastBuyOrderPrice = parseFloat(data[0].price);
          settings.crypto[i].lastBuyOrderSize = parseFloat(data[0].size).toFixed(settings.crypto[i].significantValues);
          settings.crypto[i].sellBackPrice = settings.crypto[i].lastBuyOrderPrice*((100+PROFIT_PERCENTAGE*2)/100);
  
          // Sell Parameters
          const sellParams = 
          {
              type: 'limit',
              side: 'sell',
              price: settings.crypto[i].sellBackPrice,
              size: settings.crypto[i].available,
              product_id: settings.crypto[i].usdPair,
              post_only: true
          };
          authenticatedClient.placeOrder(sellParams, sellOrder_Callback);
          // setTimeout(()=>authenticatedClient.placeOrder(sellParams, sellOrder_Callback), 3000);
        }
    
        // return console.log(data);
      }

      const sellOrder_Callback = (error, reponse, data) => {
        if (error) {
          var dateTime = new Date();
          let FILE_NAME = `${dateTime.getFullYear()}${dateTime.getMonth()+1}${dateTime.getDate()}-${dateTime.getHours()}${dateTime.getMinutes()}`;
          
          fs.writeFile(`debug/${FILE_NAME}-sellOrder.log`, `${dateTime.toDateString()}\n sellOrder_Callback:\n\n ${data}`, (err) => { 
                          
              // In case of a error throw err. 
              if (err) throw err; 
            }) 
        }
        if ((data!=null) && (data.status==='pending')) {
          settings.crypto[i].sellPlacedCount++;
        }
        
        // return console.log(data);
        if(settings.crypto[i].available>0){
          placeSellOrder();
        }
      }


      // BUY LOGIC
      if (settings.crypto[i].buyingThrottle===undefined){
        settings.crypto[i].buyingThrottle = 0;
      }

      if (settings.crypto[i].percentChange_average_24h <= 0 && settings.crypto[i].percentChange_average_24h >= (settings.crypto[i].buyingThrottle+PROFIT_PERCENTAGE)) {
        settings.crypto[i].buyingThrottle = settings.crypto[i].bestAsk;
      }

      // settings.crypto[i].sellBackPrice = settings.crypto[i].lastBuyOrderPrice*((100+PROFIT_PERCENTAGE*2)/100);
      
      if (settings.crypto[i].percentChange_average_24h <= (settings.crypto[i].buyingThrottle-PROFIT_PERCENTAGE) && usdAvailable > settings.crypto[i].minPurchase) {
          placeBuyOrder();
          usdAvailable = usdAvailable - (settings.crypto[i].lastBuyOrderPrice*settings.crypto[i].lastBuyOrderSize);
      }

      function placeBuyOrder(){
        settings.crypto[i].buyCount++
        settings.crypto[i].buyPercentage = Math.floor(Math.abs(settings.crypto[i].percentChange_average_24h))*(BASE_INVESTMENT_PERCENTAGE);
    
        while (settings.crypto[i].buyPercentage*usdAvailable<settings.crypto[i].minPurchase && settings.crypto[i].buyPercentage<=1){
          settings.crypto[i].buyPercentage = settings.crypto[i].buyPercentage + .1;
        }
    
        // If a Buy order will make the USD Available less than $10, 
        // the order will be executed with 100% of the USD Balance
        if (settings.crypto[i].buyPercentage>1 || ((usdAvailable-(settings.crypto[i].buyPercentage*usdAvailable))<settings.crypto[i].minPurchase)){
          settings.crypto[i].buyPercentage = 1;
        }

        settings.crypto[i].buyingThrottle = settings.crypto[i].percentChange_average_24h;
    
        const buyParams = {
            price: settings.crypto[i].bestAsk,
            size: ((settings.crypto[i].buyPercentage*usdAvailable)/settings.crypto[i].bestAsk).toFixed(settings.crypto[i].significantValues),
            product_id: settings.crypto[i].usdPair
        }
        authenticatedClient.buy(buyParams, buyOrder_Callback);
      }

      function placeSellOrder(){
        const params = 
      {
            order_id: settings.crypto[i].lastBuyOrderId,
      };
    
      authenticatedClient.getFills(params, getFilledPrice_Callback);
      }

    };

    // console.clear();

    // console.log(`CURRENT PRICES FROM COINBASE PRO:\n`);

    console.log("A: = Available");
    console.log("B: = Balance");
    console.log("C: = Current Price\n");

    console.log(`[USD] - Available: $${usdAvailable}\n`);

    settings.crypto.forEach(coin => {
      if(coin.enabled){
        if(coin.percentChange_average_24h>=0){
          if (coin.lastSellOrderPrice!=null && coin.lastSellOrderPrice!=0){
            console.log(FgGreen, `${coin.name} - Next Sell: ${coin.lastSellOrderPrice} Amount Needed: ${(coin.lastSellOrderPrice - coin.bestAsk).toFixed(4)} Percent: ${(((coin.lastSellOrderPrice/coin.bestAsk)-1)*100).toFixed(2)}`, Reset);
          } else{
          console.log(FgGreen, `${coin.name}`, Reset);
          }

          if (coin.lastBuyOrderPrice!=null){
            console.log(FgBrightGreen, ` [${coin.ticker}]  A: ${coin.available}  B: ${coin.balance}  C: ${coin.bestAsk}  24h Avg: ${coin.average_24h}  %: ${coin.percentChange_average_24h}%  Throttle: ${coin.buyingThrottle} Buy Count: ${coin.buyCount}  Last Buy: ${coin.lastBuyOrderSize} @ $${coin.lastBuyOrderPrice}`, Reset);
          }  else{
            console.log(FgBrightGreen, ` [${coin.ticker}]  A: ${coin.available}  B: ${coin.balance}  C: ${coin.bestAsk}  24h Avg: ${coin.average_24h}  %: ${coin.percentChange_average_24h}%  Throttle: ${coin.buyingThrottle} Buy Count: ${coin.buyCount}`, Reset);
          }

        } else if (coin.percentChange_average_24h<0){
          if (coin.lastSellOrderPrice!=null && coin.lastSellOrderPrice!=0){
            console.log(FgRed, `${coin.name} - Next Sell: ${coin.lastSellOrderPrice} Amount Needed: ${(coin.lastSellOrderPrice - coin.bestAsk).toFixed(4)} Percent: ${(((coin.lastSellOrderPrice/coin.bestAsk)-1)*100).toFixed(2)}`, Reset);
          } else{
          console.log(FgRed, `${coin.name}`, Reset);
          }
          
          if (coin.lastBuyOrderPrice!=null){
            console.log(FgBrightRed, ` [${coin.ticker}]  A: ${coin.available}  B: ${coin.balance}  C: ${coin.bestAsk}  24h Avg: ${coin.average_24h}  %: ${coin.percentChange_average_24h}%  Throttle: ${coin.buyingThrottle} Buy Count: ${coin.buyCount}  Last Buy: ${coin.lastBuyOrderSize} @ $${coin.lastBuyOrderPrice}`, Reset);
          } else{
            console.log(FgBrightRed, ` [${coin.ticker}]  A: ${coin.available}  B: ${coin.balance}  C: ${coin.bestAsk}  24h Avg: ${coin.average_24h}  %: ${coin.percentChange_average_24h}%  Throttle: ${coin.buyingThrottle} Buy Count: ${coin.buyCount}`, Reset);
          }

        }
      }
    });
  };
});
websocket.on('error', err => {
  console.log(err);
});
websocket.on('close', () => {
  /* ... */
});


// Callbacks
const getAccounts_Callback = (error, response, data) => {
  if(error){
    console.log(error);
  }

  if((data!=null) && (Symbol.iterator in Object(data))){
    jsonData = data;
  }

}
const getOrders_Callback = (error, response, data) => {
  if (error){
    return console.log(error);
  }
  if((data!=null) && (Symbol.iterator in Object(data))){
    lastSellPriceData = data;
  }
}

authenticatedClient = new CBPTT.AuthenticatedClient(KEY, SECRET, PASSPHRASE, CBPTT_URI);
var trading = setInterval(() => {
    // const publicClient = new CBPTT.PublicClient(CBPTT_URI);
    authenticatedClient = new CBPTT.AuthenticatedClient(KEY, SECRET, PASSPHRASE, CBPTT_URI);
    publicClient = new CBPTT.PublicClient(CBPTT_URI);

    // Saves account balances and order history in arrays to not exceed the API call limit 
    authenticatedClient.getAccounts(getAccounts_Callback);
    authenticatedClient.getOrders(getOrders_Callback);
    // numberOfCyclesCompleted++;

}, 1000);