import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/**
 * Global so feature modules never have to import it explicitly. It is the only
 * bridge between apps/api and @app/database.
 */
@Global()
@Module({ providers: [PrismaService], exports: [PrismaService] })
export class PrismaModule {}
