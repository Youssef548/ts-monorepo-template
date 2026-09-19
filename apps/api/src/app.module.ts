import { Module } from '@nestjs/common';
import { HealthController } from './modules/health/health.controller';
import { PrismaModule } from './prisma/prisma.module';

/**
 * The composition root. It stays thin on purpose: it wires infrastructure and
 * lists modules, nothing more.
 *
 * Add your feature modules to `imports` — one module per resource, each owning
 * its own controllers, services and DTOs. Cross-module access goes through the
 * owning module's exported service, never through its Prisma models directly.
 */
@Module({
  imports: [PrismaModule],
  controllers: [HealthController],
})
export class AppModule {}
