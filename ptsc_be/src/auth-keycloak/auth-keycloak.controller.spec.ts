import { Test, TestingModule } from '@nestjs/testing';
import { AuthKeycloakController } from './auth-keycloak.controller';
import { AuthKeycloakService } from './auth-keycloak.service';

describe('AuthKeycloakController', () => {
  let controller: AuthKeycloakController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthKeycloakController],
      providers: [AuthKeycloakService],
    }).compile();

    controller = module.get<AuthKeycloakController>(AuthKeycloakController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
