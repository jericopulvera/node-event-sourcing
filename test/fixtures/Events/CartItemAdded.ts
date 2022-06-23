import { Item } from "../Dto";

export default class CartItemAdded {
  event = "CartItemAdded";
  payload: Item;

  constructor(payload: Item) {
    this.payload = payload;
  }
}
