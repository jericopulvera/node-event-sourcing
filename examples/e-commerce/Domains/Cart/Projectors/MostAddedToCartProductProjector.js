class MostAddedToCartProductProjector {
  async onCartItemAdded(event) {
    console.log(event, "onCartItemAdded");
  }
}

module.exports = MostAddedToCartProductProjector;
