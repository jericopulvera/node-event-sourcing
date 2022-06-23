import AggregateRoot from "../../src/AggregateRoot";
import CartItemAdded from "./Events/CartItemAdded";
import { Item } from "./Dto";
import CartIsFullException from "./Exceptions/CartIsFullException";

class CartAggregateRoot extends AggregateRoot {
  public items: Item[] = [];
  public snapshotIn = 0;

  public async addItemToCart(item: Item): Promise<void> {
    if (this.items.length > 10) {
      throw new CartIsFullException();
    }

    await this.createEvent(new CartItemAdded(item));
  }

  public applyCartItemAdded(item: Item): void {
    const existingItem = this.items.find((i) => i.productId === item.productId);

    if (existingItem) {
      existingItem.quantity = existingItem.quantity + item.quantity;
    } else {
      this.items.push(item);
    }
  }

  public applySnapshot(currentState: { items: Item[] }): void {
    this.items = currentState.items;
  }
}

export default CartAggregateRoot;
