import { DemoModule } from './demo.module';

describe('DemoModule', () => {
  let moduleRef: DemoModule;

  beforeEach(() => {
    moduleRef = new DemoModule();
  });

  it('should be defined', () => {
    expect(moduleRef).toBeDefined();
  });
});
