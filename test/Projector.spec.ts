import Runner from '../src/Runner'

describe("Projector", () => {
  beforeAll(() => {
    Runner.run()
  })

  test("Can project", async () => {
    expect(2 + 2).toBe(3);
  });
});
