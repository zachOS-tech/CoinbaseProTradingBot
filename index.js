/*
 ============================================================================
 Name        : Coinbase Pro Trading Bot
 Author      : ZachHoskins
 Version     : 3.0
 Copyright   : GNU General Public License (GPLv3)
 Description : Trading bot for the Coinbase Pro exchange
 ============================================================================
 */

const CBPTT = require('coinbase-pro');
const CBPTT_URI = 'https://api.pro.coinbase.com';
const APP_VERSION = "v3.0";

// API Authentications
const PASSPHRASE = process.env.TRADING_BOT_PASSPHRASE || '';
const KEY = process.env.TRADING_BOT_KEY || '';
const SECRET = process.env.TRADING_BOT_SECRET || '';
let authenticatedClient = null;
let publicClient = null;

// CONSTANTS
    // Tickers
    const Ripple_TICKER = "XRP";
    const USD_TICKER = "USD";
    const XRP_BTC_CURRENCY_PAIR = "XRP-BTC";
    const XRP_USD_CURRENCY_PAIR = "XRP-USD";

    // Profit percentage for buying/selling
    const PROFIT_PERCENTAGE = 1; // Taker Fees are 0.5% (PROFIT_PERCENTAGE-(0.5*2) = ACTUAL_PROFIT) Fee for both buy/sell
    
    // Start Time & Time Between Each Cycle
    const INTERVAL_TIME = 30000; // In Milliseconds 30,000ms = 30s

    // Lowest Investment Amount
    const BASE_INVESTMENT_PERCENTAGE = 0.2; // 1.0 = 100%

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

// Data 
let lastPriceRipple = null;
let percentChangeRipple = null;

let askPriceRipple = null;
let averagePriceRipple = null;
let sellBackPrice = null;
let buyPercentageRipple = null;
let lastBuyOrderIdRipple = null;
let lastBuyOrderPriceRipple = null;
let lastBuyOrderSizeRipple = null;
let buyingThrottle = null;
let sellingThrottle = null;

let buyCount = 0;
let sellPlacedCount = 0;

let usdAvailable = null;
let usdBalance = null;

let rippleAvailable = null;
let rippleBalance = null;

let numberOfCyclesCompleted = 0;

// Callbacks
// 1
const getAccounts_Callback = (error, response, data) => {
    if (error) {
        console.log(error);
    } 

    if ((data!=null) && (Symbol.iterator in Object(data))){
        for(var item of data){
            if (item.currency===Ripple_TICKER) {
                rippleAvailable = parseFloat(item.available);
                rippleBalance = parseFloat(item.balance);
            } else if (item.currency===USD_TICKER) {
                usdAvailable = parseFloat(item.available).toFixed(2);
                usdBalance = parseFloat(item.balance).toFixed(2);
            } 
        }

        console.log(FgBrightYellow, `USD: Available - ${usdAvailable}, Balance - ${usdBalance}`, Reset);
        console.log(FgBrightYellow, `XRP: Available - ${rippleAvailable}, Balance - ${rippleBalance}`, Reset);
        console.log(FgBrightCyan, `Cycles Completed: ${numberOfCyclesCompleted}`, Reset);

        publicClient.getProductTicker(XRP_USD_CURRENCY_PAIR,getProductTickerRipple_Callback);
    }
}

// 2
const getProductTickerRipple_Callback = (error, response, data) => {
    if (error) {
        console.log(error);
    } else {
        lastPriceRipple = Number(data.price);
        askPriceRipple = Number(data.ask);
    }

    if (averagePriceRipple===null) {
        averagePriceRipple = askPriceRipple;
    } else {
        averagePriceRipple = (((averagePriceRipple*(numberOfCyclesCompleted-1)) + askPriceRipple)/numberOfCyclesCompleted);
    }
    
    percentChangeRipple = (((askPriceRipple/averagePriceRipple)-1)*100);

    console.log(FgCyan, `  Average Price XRP: ${averagePriceRipple.toFixed(4)}`);
    console.log(`     Current Ask XRP: ${askPriceRipple.toFixed(4)}`);
    console.log(`        % Change XRP: ${percentChangeRipple.toFixed(2)}%`);
    console.log(`           Buy Count: ${buyCount}`, Reset);

    // BUY LOGIC

    if (percentChangeRipple <= 0 && percentChangeRipple >= (buyingThrottle+PROFIT_PERCENTAGE)) {
        buyingThrottle = askPriceRipple;
    }

    sellBackPrice = lastBuyOrderPriceRipple*((100+(PROFIT_PERCENTAGE*2))/100);
    
    if (percentChangeRipple <= (buyingThrottle-PROFIT_PERCENTAGE) && usdAvailable > 10) {
        // console.log("BUY ORDER TRIGGERED");
        placeBuyOrderRipple();
    }
}

// 3
function placeBuyOrderRipple(){
    buyCount++
    buyPercentageRipple = Math.floor(Math.abs(percentChangeRipple/PROFIT_PERCENTAGE))*(BASE_INVESTMENT_PERCENTAGE);

    while (buyPercentageRipple*usdAvailable<10 && buyPercentageRipple<=1){
        buyPercentageRipple = buyPercentageRipple + .1;
    }

    // If a Buy order will make the USD Available less than $10, 
    // the order will be executed with 100% of the USD Balance
    if (buyPercentageRipple>1 || ((usdAvailable-(buyPercentageRipple*usdAvailable))<10)){
        buyPercentageRipple = 1;
    }

    console.log(FgBrightGreen, `buyPercentageRipple = ${buyPercentageRipple}`);

    console.log(FgBrightGreen, `Buy Count: ${buyCount}`, Reset)
    buyingThrottle = percentChangeRipple;

    console.log(FgBrightGreen,`price: $${askPriceRipple}`);
    console.log(`funds: $${buyPercentageRipple*usdAvailable} worth of XRP`, Reset)

    // console.log(FgBrightGreen, `Buying Throttle: ${buyingThrottle}`);
    // console.log(`Next Acceptable Buy: ${buyingThrottle-PROFIT_PERCENTAGE}`, Reset);

    // console.log(FgBrightRed, "Buy Params");
    // console.log(`price: ${askPriceRipple}`);
    // console.log(`size: ${Math.floor((buyPercentageRipple*usdAvailable)/askPriceRipple)}`);
    // console.log(`product_id: ${XRP_USD_CURRENCY_PAIR}`, Reset)

    const buyParams = {
        price: askPriceRipple,
        size: Math.floor((buyPercentageRipple*usdAvailable)/askPriceRipple),
        product_id: 'XRP-USD'
    }
    authenticatedClient.buy(buyParams, buyOrderRipple_Callback);
}

// 4
const buyOrderRipple_Callback = (error, response, data) => {
    if (error) {
        console.log(error);
    } 
    
    setTimeout(function(){return true;},3000);

    if (data!=null){
        lastBuyOrderIdRipple = data.id;
        lastBuyOrderPriceRipple = parseFloat(data.price);
        lastBuyOrderSizeRipple = parseFloat(data.size);
    }

    console.log(FgBrightGreen, `\n\n[BUY ORDER PLACED] at $${lastBuyOrderPriceRipple.toFixed(4)}, Amount: ${lastBuyOrderSizeRipple.toFixed(4)} XRP`, Reset);

    placeSellOrderRipple();
}

// 5
function placeSellOrderRipple(){
    const params = 
	{
        order_id: lastBuyOrderIdRipple,
	};

	authenticatedClient.getFills(params, getFilledPriceRipple_Callback);

    // // Place a limit sell order PROFIT_PERCENTAGE above Buy Price
}

// 6
const getFilledPriceRipple_Callback = (error, response, data) => {
	if (error)
        return console.log(error);

	if ((Array.isArray(data)) && (data.length >= 1))
	{
        lastBuyOrderPriceRipple = parseFloat(data[0].price);
        lastBuyOrderSizeRipple = Math.floor(parseFloat(data[0].size));
        sellBackPrice = lastBuyOrderPriceRipple*((100+(PROFIT_PERCENTAGE*2))/100);

        // console.log(`\n\nLast Buy Order Price: ${lastBuyOrderPriceRipple}`);
        // console.log(`Last Buy Order Size: ${lastBuyOrderSizeRipple}`);
        // console.log(`Sell Back Price: ${sellBackPrice}\n\n`);

        // XRP Sell Parameters
        const sellParams = 
        {
            type: 'limit',
            side: 'sell',
            price: sellBackPrice.toFixed(4),
            size: lastBuyOrderSizeRipple,
            product_id: XRP_USD_CURRENCY_PAIR,
            post_only: true
        };

        setTimeout(()=>authenticatedClient.placeOrder(sellParams, sellOrderRipple_Callback), 3000);
	}

    // return console.log(data);
}

// 7
const sellOrderRipple_Callback = (error, reponse, data) => {
    if (error)
        return console.log(error);

    if ((data!=null) && (data.status==='pending'))
    {
		lastBuyOrderPriceRipple = null;
		lastBuyOrderIdRipple = null;
        sellPlacedCount++;
 	}

     console.log(FgBrightGreen, `\n\n[SELL ORDER PLACED] at $${sellBackPrice.toFixed(4)}, Amount: ${lastBuyOrderSizeRipple.toFixed(4)} XRP\n\n`, Reset); 

    // return console.log(data);
}


// Main Logic

console.log("\n");   
console.log(FgBrightCyan,"   ______      _       __                       ____            ");
console.log("   / ____/___  (_)___  / /_  ____ _________     / __ \\_________  ");
console.log("  / /   / __ \\/ / __ \\/ __ \\/ __ `/ ___/ _ \\   / /_/ / ___/ __ \\ ");
console.log(" / /___/ /_/ / / / / / /_/ / /_/ (__  )  __/  / ____/ /  / /_/ / ");
console.log(" \\____/\\____/_/_/ /_/_.___/\\__,_/____/\\___/  /_/   /_/   \\____/  ");
console.log("");
console.log("    ______               ___                ____        __      ");
console.log("   /_  __/________ _____/ (_)___  ____ _   / __ )____  / /_     ");
console.log("    / / / ___/ __ `/ __  / / __ \\/ __ `/  / __  / __ \\/ __/     ");
console.log("   / / / /  / /_/ / /_/ / / / / / /_/ /  / /_/ / /_/ / /_       ");
console.log("  /_/ /_/   \\__,_/\\__,_/_/_/ /_/\\__, /  /_____/\\____/\\__/  " + APP_VERSION);
console.log("                               /____/                           ", Reset);

console.log("\n\n\n\n            \Connecting to Coinbase. Please wait " + parseInt(INTERVAL_TIME/1000) + " seconds ..."); 


var trading = setInterval(() => 
{
    authenticatedClient = new CBPTT.AuthenticatedClient(KEY, SECRET, PASSPHRASE, CBPTT_URI);
    publicClient = new CBPTT.PublicClient(CBPTT_URI);

    rippleAvailable = 0;
    rippleBalance = 0;

    usdAvailable = 0;
    usdBalance = 0;

    // Get the balance of the wallets and execute the trading strategy
    authenticatedClient.getAccounts(getAccounts_Callback);

    numberOfCyclesCompleted++;

}, INTERVAL_TIME);