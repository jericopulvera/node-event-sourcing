import AggregateRoot from "../../src/AggregateRoot";
import CartItemAdded from "./Events/CartItemAdded";

interface Item {
  productId: string;
  quantity: number;
}

class CartAggregateRoot extends AggregateRoot {
  public items: Item[] = [];
  public snapshotIn = 0;

  constructor() {
    super();
  }

  public async addItemToCart(item: Item) {
    await this.createEvent(new CartItemAdded(item));
  }

  public async applyCartItemAdded(item: Item) {
    const existingItem = this.items.find((i) => i.productId === item.productId);

    if (existingItem) {
      existingItem.quantity = existingItem.quantity + item.quantity;
    } else {
      this.items.push(item);
    }
  }

  public async applySnapshot(currentState) {
    this.items = currentState.items;
  }
}

export default CartAggregateRoot;
