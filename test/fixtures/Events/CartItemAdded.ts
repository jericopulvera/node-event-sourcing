interface Item {
  productId: string | null;
  quantity: number;
}

export default class CartItemAdded {
  event = "CartItemAdded";

  payload: Item = {
    productId: null,
    quantity: 0,
  };

  constructor(payload: Item) {
    this.payload = payload;
  }
}
