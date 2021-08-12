interface Item {
  productId: string | null;
  quantity: number;
}

class CartItemAdded {
  event = "CartItemAdded";

  payload: Item = {
    productId: null,
    quantity: 0,
  };

  constructor(payload: Item) {
    this.payload = payload;
  }
}

export default CartItemAdded;
