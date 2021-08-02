class HotProductsProjector {
  public async onCartItemAdded(payload: {
    productId: string;
    quantity: number;
  }): Promise<void> {
    if (!payload.productId) return;
  }

  public async onCartItemRemoved(payload: {
    productId: string;
    quantity: number;
  }): Promise<void> {
    if (!payload.productId) return;
  }
}

export default HotProductsProjector;
