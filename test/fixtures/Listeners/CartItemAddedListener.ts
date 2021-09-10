import { EventDto } from "../../../src/Dto";

export default class CartItemAddedListener {
  public async handle(eventData: EventDto): Promise<void> {
    console.log("CartItemAddedListener");
  }
}
