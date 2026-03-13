export class Orderbook {
    constructor(baseAsset, bids, asks, lastTradeId, currentPrice) {
        this.bids = bids || [];
        this.asks = asks || [];
        this.baseAsset = baseAsset;
        this.quoteAsset = BASE_CURRENCY;
        this.lastTradeId = lastTradeId || 0;
        this.currentPrice = currentPrice || 0;
    }

    ticker() {
        return `${this.baseAsset}_${this.quoteAsset}`;
    }

    getSnapshot() {
        return {
            baseAsset: this.baseAsset,
            bids: this.bids,
            asks: this.asks,
            lastTradeId: this.lastTradeId,
            currentPrice: this.currentPrice
        }
    }

      getOpenOrders(userId){
        const asks = this.asks.filter(x => x.userId === userId);
        const bids = this.bids.filter(x => x.userId === userId);
        return [...asks, ...bids];
    }

    addorder(order) {
        if (order.side === "buy") {
            const { executedQty, fills } = this.matchBid(order);
            return { executedQty, fills };
        } else {
            const { executedQty, fills } = this.matchask(order);
            return { executedQty, fills };
        }
    }

    matchask(order) {
        const fills = [];
        let executedQty = 0;

        for (let i = 0; i < this.bids.length; i++) {

            if (executedQty === order.quantity) break;

            if (this.bids[i].price >= order.price) {

                const remainingAmount = Math.min(
                    order.quantity - executedQty,
                    this.bids[i].quantity - this.bids[i].filled
                );

                executedQty += remainingAmount;
                this.bids[i].filled += remainingAmount;

                fills.push({
                    price: this.bids[i].price.toString(),
                    qty: remainingAmount,
                    tradeId: this.lastTradeId++,
                    otherUserId: this.bids[i].userId,
                    markerOrderId: this.bids[i].orderId
                });
            }
        }

        for (let i = 0; i < this.bids.length; i++) {
            if (this.bids[i].filled === this.bids[i].quantity) {
                this.bids.splice(i, 1);
                i--;
            }
        }

        return { fills, executedQty };
    }

    matchBid(order) {
        const fills = [];
        let executedQty = 0;

        for (let i = 0; i < this.asks.length; i++) {

            if (executedQty === order.quantity) break;

            if (this.asks[i].price <= order.price) {

                const filledQty = Math.min(
                    order.quantity - executedQty,
                    this.asks[i].quantity - this.asks[i].filled
                );

                executedQty += filledQty;
                this.asks[i].filled += filledQty;

                fills.push({
                    price: this.asks[i].price.toString(),
                    qty: filledQty,
                    tradeId: this.lastTradeId++,
                    otherUserId: this.asks[i].userId,
                    markerOrderId: this.asks[i].orderId
                });
            }
        }


        for (let i = 0; i < this.asks.length; i++) {
            if (this.asks[i].filled === this.asks[i].quantity) {
                this.asks.splice(i, 1);
                i--;
            }
        }

        return { fills, executedQty };
    }

    getDepth() {
        const bids = [];
        const asks = [];

        const bidsObj = {};
        const asksObj = {};

        for (let i = 0; i < this.bids.length; i++) {
            const order = this.bids[i];

            if (!bidsObj[order.price]) {
                bidsObj[order.price] = 0;
            }

            bidsObj[order.price] += order.quantity;
        }

        for (let i = 0; i < this.asks.length; i++) {
            const order = this.asks[i];

            if (!asksObj[order.price]) {
                asksObj[order.price] = 0;
            }

            asksObj[order.price] += order.quantity;
        }

        for (const price in bidsObj) {
            bids.push([price, bidsObj[price].toString()]);
        }

        for (const price in asksObj) {
            asks.push([price, asksObj[price].toString()]);
        }

        return {
            bids,
            asks
        };
    }

    cancelask(order){
        const index = this.asks.findIndex(x=>x.orderId === order.orderId);
        if(index !== -1){
            const price = this.asks[index].price;
            this.asks.splice(index, 1);
            return price
        }
    }

    cancelbid(order){
        const index = this.bids.findIndex(x=>x.orderId === order.orderId);
        if(index !== -1){
            const price = this.asks[index].price;
            this.bids.splice(index,1);
            return price;
        }
    }
}