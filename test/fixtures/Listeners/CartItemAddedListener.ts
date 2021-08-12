import { EventDto } from "../../../src/Dto";

class CartItemAddedListener {
  public async handle(eventData: EventDto): Promise<void> {
    console.log({ eventData });
  }
}

export default CartItemAddedListener;
