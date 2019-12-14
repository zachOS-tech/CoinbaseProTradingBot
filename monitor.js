const fs = require('fs');
const CBPTT = require('coinbase-pro');
const CBPTT_URI = 'https://api.pro.coinbase.com';
const WEBSOCKET_URI = 'wss://ws-feed.pro.coinbase.com'

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

for (let i = 0; i < settings.crypto.length; i++) {
  if(settings.crypto[i].enabled){
    cryptoArray.push(settings.crypto[i].usdPair);
  }
}

// API Authentications
const PASSPHRASE = process.env.TRADING_BOT_PASSPHRASE || settings.API.PASSPHRASE;
const KEY = process.env.TRADING_BOT_KEY || settings.API.KEY;
const SECRET = process.env.TRADING_BOT_SECRET || settings.API.SECRET;

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

// Websocket
websocket.on('message', data => {

  if(data.type==='ticker'){
    // console.log(data);
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
      };
    };

    console.clear();

    console.log(Underscore, `                 CURRENT PRICES FROM COINBASE PRO:                  `, Reset);
    console.log("");
    settings.crypto.forEach(coin => {
      if(coin.enabled){
        if(coin.percentChange_average_24h>0){
          console.log(FgGreen, `${coin.name}`, Reset);
          console.log(FgBrightGreen, `  [${coin.ticker}]  Current: ${coin.bestAsk}  Average 24h: ${coin.average_24h}  Percent Change: ${coin.percentChange_average_24h}%`, Reset);
        } else{
          console.log(FgRed, `${coin.name}`, Reset);
          console.log(FgBrightRed, `  [${coin.ticker}]  Current: ${coin.bestAsk}  Average 24h: ${coin.average_24h}  Percent Change: ${coin.percentChange_average_24h}%`, Reset);
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

