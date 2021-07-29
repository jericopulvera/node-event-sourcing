interface Item {
  productId: string;
  quantity: number;
}

class CartItemAdded {
  public event = "CartItemAdded";

  public payload: Item = {
    productId: null,
    quantity: 0,
  };

  constructor(payload) {
    this.payload = payload;
  }
}

export default CartItemAdded;
