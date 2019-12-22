/*
 ============================================================================
 Name        : Coinbase Pro Trading Bot
 Author      : ZachHoskins
 Version     : 5.0
 Copyright   : GNU General Public License (GPLv3)
 Description : Trading bot for the Coinbase Pro exchange
 ============================================================================
 */

//Constants
const fs = require('fs');
const CBPTT = require('coinbase-pro');
const CBPTT_URI = 'https://api.pro.coinbase.com';
const WEBSOCKET_URI = 'wss://ws-feed.pro.coinbase.com'
const APP_VERSION = "v5.0";

  // Profit percentage for buying/selling
  const PROFIT_PERCENTAGE = 1; // DO NOT PUT LESS THAN 1. OTHERWISE YOU WILL LOSE MONEY. (Maker Fee is usually .5% and Taker fee is usually .5%)
      
  // Start Time & Time Between Each Cycle
  const INTERVAL_TIME = 5000; // In Milliseconds 30,000ms = 30s

  // Lowest Investment Percentage
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

// #region Parameters
if(process.argv[2]==="-clear"){
  let rawTempData = fs.readFileSync('./settings.json');
  let tempSettings = JSON.parse(rawTempData);

  tempSettings.crypto.forEach(coin => {
      coin.sellingThrottle = 0;
      coin.buyingThrottle = 0;
  });

  fs.writeFile('settings.json', JSON.stringify(tempSettings), (err) => {
      if (err) throw err;
  });
  console.clear();
  return console.log(FgBrightGreen, "buyingThrottle and sellingThrottle values reset to 0\n", Reset);

} else if (process.argv[2]==="-enable"){
    if(process.argv[3]==="all" || !(process.argv[3])){
      let rawTempData = fs.readFileSync('./settings.json');
      let tempSettings = JSON.parse(rawTempData);

      tempSettings.crypto.forEach(coin => {
          coin.enabled = true;
      });

      fs.writeFileSync('settings.json', JSON.stringify(tempSettings), (err) => {
          if (err) throw err;
      });
      console.clear();
      tempSettings.crypto.forEach(coin => {
        if(coin.enabled===true){
          console.log(FgBrightGreen, `${coin.ticker} - enabled`, Reset);
        } else{
          console.log(FgBrightRed, `${coin.ticker} - disabled`, Reset);
        }
      });
      return;
    } else if (process.argv[3]){
        let rawTempData = fs.readFileSync('./settings.json');
        let tempSettings = JSON.parse(rawTempData);
      
        tempSettings.crypto.forEach(coin => {
            for (let i = 3; i < process.argv.length; i++) {
              if(coin.ticker===process.argv[i]){
                coin.enabled = true;
              }
            }
        });
      
        fs.writeFile('settings.json', JSON.stringify(tempSettings), (err) => {
            if (err) throw err;
        });
        console.clear();
        tempSettings.crypto.forEach(coin => {
          if(coin.enabled===true){
            console.log(FgBrightGreen, `${coin.ticker} - enabled`, Reset);
          } else{
            console.log(FgBrightRed, `${coin.ticker} - disabled`, Reset);
          }
        });
        return;
    }
} else if (process.argv[2]==="-disable"){
    if(process.argv[3]==="all" || !(process.argv[3])){
      let rawTempData = fs.readFileSync('./settings.json');
      let tempSettings = JSON.parse(rawTempData);

      tempSettings.crypto.forEach(coin => {
          coin.enabled = false;
      });

      fs.writeFileSync('settings.json', JSON.stringify(tempSettings), (err) => {
          if (err) throw err;
      });
      console.clear();
      tempSettings.crypto.forEach(coin => {
        if(coin.enabled===true){
          console.log(FgBrightGreen, `${coin.ticker} - enabled`, Reset);
        } else{
          console.log(FgBrightRed, `${coin.ticker} - disabled`, Reset);
        }
      });
      return;
    } else if (process.argv[3]){
        let rawTempData = fs.readFileSync('./settings.json');
        let tempSettings = JSON.parse(rawTempData);
      
        tempSettings.crypto.forEach(coin => {    
            for (let i = 3; i < process.argv.length; i++) {
              if(coin.ticker===process.argv[i]){
                coin.enabled = false;
              }
            }
        });
      
        fs.writeFile('settings.json', JSON.stringify(tempSettings), (err) => {
            if (err) throw err;
        });
        console.clear();
        tempSettings.crypto.forEach(coin => {
          if(coin.enabled===true){
            console.log(FgBrightGreen, `${coin.ticker} - enabled`, Reset);
          } else{
            console.log(FgBrightRed, `${coin.ticker} - disabled`, Reset);
          }
        });
        return;
    }
} else if(process.argv[2]==="-show") {
  let rawTempData = fs.readFileSync('./settings.json');
  let tempSettings = JSON.parse(rawTempData);

  console.clear();
  tempSettings.crypto.forEach(coin => {
    if(coin.enabled===true){
      console.log(FgBrightGreen, `${coin.ticker} - enabled`, Reset);
    } else{
      console.log(FgBrightRed, `${coin.ticker} - disabled`, Reset);
    }
  });
  return;
} else if(process.argv[2]==="-help"){
  return console.log(`
Automated Trading bot for use with the Coinbase Pro exchange.
    
SYNTAX
    NODE [filename] [[-enable] <string>] [[-disable] <string>] [-show] [-help]

PARAMETERS    
  NODE [filename]

  -enable       Enables all Cryptocurrency in settings.json and displays status of all currency
    all         Enables all Cryptocurrency in settings.json and displays status of all currency
    <ticker>    Enables all tickers matching the given value. Multiple tickers separated by a space
      (ex)        node index -enable BTC ETH LTC
  -disable      Disables all Cryptocurrency in settings.json and displays status of all currency
    all         Disables all Cryptocurrency in settings.json and displays status of all currency
    <ticker>    Disables all tickers matching the given value. Multiple tickers separated by a space
      (ex)        node index -disable BTC ETH LTC  
  -show         Displays status of all currency
  -help         Displays the help screen
  
EXAMPLES
  ENABLE
    node index -enable
    node index -enable all
    node index -enable BTC ETH

  DISABLE
    node index -disable
    node index -disable all
    node index -disable XRP ETH LTC EOS REP

  DISPLAY STATUS
    node index -show
`);
} else if(process.argv[2]) {
  return console.log(FgBrightRed, `${process.argv[2]} : The term '${process.argv[2]}' is not recognized as a valid parameter for the CoinbaseProTradingBot application.\n Check the spelling of the name and try again.\n\n For a list of commands, please type 'node ${process.argv[1].replace(/^.*[\\\/]/, '')} -help'`, Reset);
}
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
        settings.crypto[i].percentChangeAsk_average_24h = (((data.best_ask/settings.crypto[i].average_24h)-1)*100).toFixed(2);
        settings.crypto[i].percentChangeBid_average_24h = (((data.best_bid/settings.crypto[i].average_24h)-1)*100).toFixed(2);
        settings.crypto[i].status  = "";
        
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
        // for (let j = 0; j < settings.crypto.length; j++) {
          if(item.currency==="USD"){
            usdAvailable = parseFloat(item.available);
            usdBalance = parseFloat(item.balance);
          }
          if(item.currency===settings.crypto[i].ticker){
            settings.crypto[i].available = parseFloat(item.available).toFixed(8);
            settings.crypto[i].balance = parseFloat(item.balance).toFixed(8);
          }
        // }
      }

      // for(var sale of lastSellPriceData){
      //   // for (let j = 0; j < settings.crypto.length; j++) {
      //     if(settings.crypto[i].usdPair===sale.product_id){
      //       if (settings.crypto[i].lastSellOrderPrice===undefined){
      //         settings.crypto[i].lastSellOrderPrice = parseFloat(sale.price).toFixed(8);
      //         settings.crypto[i].lastSellOrderSize = sale.size;
      //       } else if (settings.crypto[i].lastSellOrderPrice>sale.price){
      //         settings.crypto[i].lastSellOrderPrice = parseFloat(sale.price).toFixed(8);
      //         settings.crypto[i].lastSellOrderSize = sale.size;
      //       }
            
      //     }
      //   // }
      // }
      
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
      }

      // const getFilledPrice_Callback = (error, response, data) => {
      //   if (error){
      //     var dateTime = new Date();
      //     let FILE_NAME = `${dateTime.getFullYear()}${dateTime.getMonth()+1}${dateTime.getDate()}-${dateTime.getHours()}${dateTime.getMinutes()}`;
          
      //     fs.writeFile(`debug/${FILE_NAME}-getFilledPrice.log`, `${dateTime.toDateString()}\n getFilledPrice_Callback:\n\n ${JSON.stringify(data)}`, (err) => { 
                          
      //         // In case of a error throw err. 
      //         if (err) throw err; 
      //       }) 
      //   }
      //   if ((Array.isArray(data)) && (data.length >= 1))
      //   {
      //     settings.crypto[i].lastBuyOrderPrice = parseFloat(data[0].price);
      //     settings.crypto[i].lastBuyOrderSize = parseFloat(data[0].size).toFixed(settings.crypto[i].significantValues);
      //     settings.crypto[i].sellBackPrice = settings.crypto[i].lastBuyOrderPrice*((100+PROFIT_PERCENTAGE*2)/100);
  
      //     // Sell Parameters
      //     const sellParams = 
      //     {
      //         type: 'limit',
      //         side: 'sell',
      //         price: settings.crypto[i].sellBackPrice,
      //         size: settings.crypto[i].available,
      //         product_id: settings.crypto[i].usdPair,
      //         post_only: true
      //     };
      //     authenticatedClient.placeOrder(sellParams, sellOrder_Callback);
      //     // setTimeout(()=>authenticatedClient.placeOrder(sellParams, sellOrder_Callback), 3000);
      //   }
    
      //   // return console.log(data);
      // }

      const sellOrder_Callback = (error, reponse, data) => {
        if (error) {
          var dateTime = new Date();
          let FILE_NAME = `${dateTime.getFullYear()}${dateTime.getMonth()+1}${dateTime.getDate()}-${dateTime.getHours()}${dateTime.getMinutes()}`;
          
          fs.writeFile(`debug/${FILE_NAME}-sellOrder.log`, `${dateTime.toDateString()}\n sellOrder_Callback:\n\n ${JSON.stringify(data)}`, (err) => { 
                          
              // In case of a error throw err. 
              if (err) throw err; 
            }) 
        }
        if ((data!=null) && (data.status==='pending')) {
          settings.crypto[i].sellPlacedCount++;
        }
      }


      // BUY LOGIC
      if (settings.crypto[i].buyingThrottle===undefined){
        settings.crypto[i].buyingThrottle = 0;
      }

      if (settings.crypto[i].percentChangeAsk_average_24h <= 0 && settings.crypto[i].percentChangeAsk_average_24h >= (settings.crypto[i].buyingThrottle+PROFIT_PERCENTAGE)) {
        settings.crypto[i].buyingThrottle = settings.crypto[i].bestAsk;
        
        // Write to settings.json
        let rawTempData = fs.readFileSync('./settings.json');
        let tempSettings = JSON.parse(rawTempData);
      
        tempSettings.crypto.forEach(coin => {
          if (coin.ticker === settings.crypto[i].ticker){
            coin.buyingThrottle = settings.crypto[i].bestAsk;
          }  
        });
      
        fs.writeFile('settings.json', JSON.stringify(tempSettings), (err) => {
            if (err) throw err;
        });
      }

      // settings.crypto[i].sellBackPrice = settings.crypto[i].lastBuyOrderPrice*((100+PROFIT_PERCENTAGE*2)/100);
      
      if (settings.crypto[i].percentChangeAsk_average_24h <= (settings.crypto[i].buyingThrottle-PROFIT_PERCENTAGE) && usdAvailable > settings.crypto[i].minPurchase) {
        // console.log("Placing BUY Order");
        setTimeout(() => {
          placeBuyOrder();
        }, i * 500);        
      }

      // SELL LOGIC
      if (settings.crypto[i].sellingThrottle===undefined){
        settings.crypto[i].sellingThrottle = 0;
      }

      if (settings.crypto[i].percentChangeBid_average_24h > 0 && settings.crypto[i].percentChangeBid_average_24h <= (settings.crypto[i].sellingThrottle-PROFIT_PERCENTAGE)) {
        settings.crypto[i].sellingThrottle = settings.crypto[i].bestBid;

        // Write to settings.json
        let rawTempData = fs.readFileSync('./settings.json');
        let tempSettings = JSON.parse(rawTempData);
      
        tempSettings.crypto.forEach(coin => {
          if (coin.ticker === settings.crypto[i].ticker){
            coin.sellingThrottle = settings.crypto[i].bestBid;
          }  
        });
      
        fs.writeFile('settings.json', JSON.stringify(tempSettings), (err) => {
            if (err) throw err;
        });
      }

      if (settings.crypto[i].percentChangeBid_average_24h > (settings.crypto[i].sellingThrottle+PROFIT_PERCENTAGE) && settings.crypto[i].available > settings.crypto[i].minSellAmount) {
        setTimeout(() => {
          placeSellOrder();
        }, i * 500);
      }

      // FUNCTIONS
      function placeBuyOrder(){
        settings.crypto[i].buyCount++
        settings.crypto[i].buyPercentage = Math.floor(Math.abs(settings.crypto[i].percentChangeAsk_average_24h))*(BASE_INVESTMENT_PERCENTAGE);
    
        while (settings.crypto[i].buyPercentage*usdAvailable<settings.crypto[i].minPurchase && settings.crypto[i].buyPercentage<=1){
          settings.crypto[i].buyPercentage = settings.crypto[i].buyPercentage + BASE_INVESTMENT_PERCENTAGE;
        }
    
        // If a Buy order will make the USD Available less than $10, 
        // the order will be executed with 100% of the USD Balance
        if (settings.crypto[i].buyPercentage>1 || ((usdAvailable-(settings.crypto[i].buyPercentage*usdAvailable))<settings.crypto[i].minPurchase)){
          settings.crypto[i].buyPercentage = 1;
        }

        settings.crypto[i].buyingThrottle = settings.crypto[i].percentChangeAsk_average_24h;
        settings.crypto[i].currentBuyOrderPrice = settings.crypto[i].bestAsk;
        settings.crypto[i].currentBuyOrderSize = ((settings.crypto[i].buyPercentage*usdAvailable)/settings.crypto[i].bestAsk).toFixed(settings.crypto[i].significantValues);

        const buyParams = {
            price: settings.crypto[i].currentBuyOrderPrice,
            size: settings.crypto[i].currentBuyOrderSize,
            side: "buy",
            // funds: settings.crypto[i].buyPercentage*(usdAvailable.toFixed(2)-.01),
            // funds: buyOrderFunds,
            product_id: settings.crypto[i].usdPair
        }
        // usdAvailable = usdAvailable - buyOrderFunds;
        authenticatedClient.placeOrder(buyParams, buyOrder_Callback);
      }

      function placeSellOrder(){
        settings.crypto[i].sellPlacedCount++;
        settings.crypto[i].sellPercentage = Math.floor(Math.abs(settings.crypto[i].percentChangeBid_average_24h))*(BASE_INVESTMENT_PERCENTAGE*2);

        while (settings.crypto[i].sellPercentage*settings.crypto[i].available<settings.crypto[i].minSellAmount && settings.crypto[i].sellPercentage<=1){
          settings.crypto[i].sellPercentage = settings.crypto[i].sellPercentage + BASE_INVESTMENT_PERCENTAGE;
        }

        // If a Sell order will make the cryptocurrency Available less than the minPurchase amount,
        // the sell order will be executed with 100% of the coin's balance.
        if(settings.crypto[i].sellPercentage>1 || ((settings.crypto[i].available-(settings.crypto[i].sellPercentage*settings.crypto[i].available))<settings.crypto[i].minSellAmount)){
          settings.crypto[i].sellPercentage = 1;
        }

        settings.crypto[i].sellThrottle = settings.crypto[i].percentChangeBid_average_24h;
        settings.crypto[i].currentSellOrderPrice = settings.crypto[i].bestBid;
        settings.crypto[i].currentSellOrderSize = ((settings.crypto[i].sellPercentage*settings.crypto[i].available)/settings.crypto[i].bestBid).toFixed(settings.crypto[i].significantValues);
        
        const sellParams =
        {
          price: settings.crypto[i].currentSellOrderPrice,
          size: settings.crypto[i].currentSellOrderSize,
          side: "sell",
          product_id: settings.crypto[i].usdPair
        }

        authenticatedClient.placeOrder(sellParams, sellOrder_Callback);

      //   const params = 
      // {
      //       order_id: settings.crypto[i].lastBuyOrderId,
      // };
    
      // authenticatedClient.getFills(params, getFilledPrice_Callback);
      }

    };

    // Keeps everything on one Command Prompt window
    console.clear();

    // console.log(`CURRENT PRICES FROM COINBASE PRO:\n`);

    console.log("A: = Available");
    console.log("B: = Balance");
    console.log("C: = Current Price\n");

    console.log(`[USD] - Available: $${usdAvailable}\n`);

    settings.crypto.forEach(coin => {
      if(coin.enabled){
        if(coin.percentChangeAsk_average_24h>=0){
          if (coin.lastSellOrderPrice!=null && coin.lastSellOrderPrice!=0){
            console.log(FgGreen, `${coin.name} - Next Sell: ${coin.lastSellOrderPrice} Amount Needed: ${(coin.lastSellOrderPrice - coin.bestAsk).toFixed(4)} Percent: ${(((coin.lastSellOrderPrice/coin.bestAsk)-1)*100).toFixed(2)}`, Reset);
          } else{
          console.log(FgGreen, `${coin.name}`, Reset);
          }

          if (coin.lastBuyOrderPrice!=null){
            console.log(FgBrightGreen, ` [${coin.ticker}]  A: ${coin.available}  B: ${coin.balance}  C: ${coin.bestAsk}  24h Avg: ${coin.average_24h}  %: ${coin.percentChangeAsk_average_24h}%  Throttle: ${coin.buyingThrottle} Buy Count: ${coin.buyCount}  Last Buy: ${coin.lastBuyOrderSize} @ $${coin.lastBuyOrderPrice}    ${coin.status}`, Reset);
          }  else{
            console.log(FgBrightGreen, ` [${coin.ticker}]  A: ${coin.available}  B: ${coin.balance}  C: ${coin.bestAsk}  24h Avg: ${coin.average_24h}  %: ${coin.percentChangeAsk_average_24h}%  Throttle: ${coin.buyingThrottle} Buy Count: ${coin.buyCount}    ${coin.status}`, Reset);
          }

        } else if (coin.percentChangeAsk_average_24h<0){
          if (coin.lastSellOrderPrice!=null && coin.lastSellOrderPrice!=0){
            console.log(FgRed, `${coin.name} - Next Sell: ${coin.lastSellOrderPrice} Amount Needed: ${(coin.lastSellOrderPrice - coin.bestAsk).toFixed(4)} Percent: ${(((coin.lastSellOrderPrice/coin.bestAsk)-1)*100).toFixed(2)}`, Reset);
          } else{
          console.log(FgRed, `${coin.name}`, Reset);
          }
          
          if (coin.lastBuyOrderPrice!=null){
            console.log(FgBrightRed, ` [${coin.ticker}]  A: ${coin.available}  B: ${coin.balance}  C: ${coin.bestAsk}  24h Avg: ${coin.average_24h}  %: ${coin.percentChangeAsk_average_24h}%  Throttle: ${coin.buyingThrottle} Buy Count: ${coin.buyCount}  Last Buy: ${coin.lastBuyOrderSize} @ $${coin.lastBuyOrderPrice}    ${coin.status}`, Reset);
          } else{
            console.log(FgBrightRed, ` [${coin.ticker}]  A: ${coin.available}  B: ${coin.balance}  C: ${coin.bestAsk}  24h Avg: ${coin.average_24h}  %: ${coin.percentChangeAsk_average_24h}%  Throttle: ${coin.buyingThrottle} Buy Count: ${coin.buyCount}    ${coin.status}`, Reset);
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
// const getOrders_Callback = (error, response, data) => {
//   if (error){
//     console.log(error);
//   }
//   if((data!=null) && (Symbol.iterator in Object(data))){
//     lastSellPriceData = data;
//   }
// }

authenticatedClient = new CBPTT.AuthenticatedClient(KEY, SECRET, PASSPHRASE, CBPTT_URI);
var trading = setInterval(() => {
    // const publicClient = new CBPTT.PublicClient(CBPTT_URI);
    authenticatedClient = new CBPTT.AuthenticatedClient(KEY, SECRET, PASSPHRASE, CBPTT_URI);
    publicClient = new CBPTT.PublicClient(CBPTT_URI);

    // Saves account balances and order history in arrays to not exceed the API call limit 
    authenticatedClient.getAccounts(getAccounts_Callback);
    // authenticatedClient.getOrders(getOrders_Callback);
    // numberOfCyclesCompleted++;

}, 1000);