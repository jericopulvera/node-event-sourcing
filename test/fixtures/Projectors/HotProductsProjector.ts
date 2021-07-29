class HotProductsProjector {
  public async onCartItemAdded(payload) {
    if (!payload.productId) return;
  }

  public async onCartItemRemoved(payload) {
    if (!payload.productId) return;
  }

  public async ontest() {
    console.log("ON TEST");
  }
}

export default HotProductsProjector;
