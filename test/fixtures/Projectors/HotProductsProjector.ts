export default class HotProductsProjector {
  public async onCartItemAdded(payload: {
    productId: string;
    quantity: number;
  }): Promise<void> {
    console.log("HotProductsProjector.cartItemAdded");
    if (!payload.productId) return;
  }

  public async onCartItemRemoved(payload: {
    productId: string;
    quantity: number;
  }): Promise<void> {
    console.log({ payload }, "Cart Item Removed");
    if (!payload.productId) return;
  }
}
