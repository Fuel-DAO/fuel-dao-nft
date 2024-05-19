import { tokenActor, initTestSuite } from "../utils/pocket-ic";

describe("ICRC61 Standard", () => {
  let actor: tokenActor;
  const suite = initTestSuite();

  beforeAll(async () => {
    await suite.setup();
    actor = (await suite.deployTokenCanister({})).actor;
  });

  afterAll(suite.teardown);

  it("icrc61_supported_standards", async () => {
    const standards = await actor.icrc61_supported_standards();

    expect(standards).toHaveLength(2);
    expect(standards).toContainEqual({
      url: "https://github.com/dfinity/ICRC/ICRCs/ICRC-7",
      name: "ICRC-7",
    });
    expect(standards).toContainEqual({
      url: "https://github.com/dfinity/ICRC/ICRCs/ICRC-61",
      name: "ICRC-61",
    });
  });
});
