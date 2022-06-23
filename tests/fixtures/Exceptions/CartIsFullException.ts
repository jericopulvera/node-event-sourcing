class CartIsFullException extends Error {
  message = "Cart is limited to 10 items.";
}

export default CartIsFullException;
