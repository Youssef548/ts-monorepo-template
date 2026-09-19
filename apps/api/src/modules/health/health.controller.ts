import { Controller, Get } from '@nestjs/common';

/**
 * Liveness only — deliberately does not touch the database, so it stays useful
 * as a container/load-balancer check even when Postgres is down.
 */
@Controller('health')
export class HealthController {
  @Get()
  check() {
    return { status: 'ok' };
  }
}
