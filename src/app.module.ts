import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RecipesModule } from './recipes/recipes.module';
import { CrawlerModule } from './crawler/crawler.module';
import { Recipe } from './recipes/recipe.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DB_HOST', 'localhost'),
        port: config.get<number>('DB_PORT', 5432),
        username: config.get<string>('DB_USER'),
        password: config.get<string>('DB_PASSWORD'),
        database: config.get<string>('DB_NAME'),
        entities: [Recipe],
        synchronize: config.get<string>('NODE_ENV') !== 'production',
      }),
    }),
    RecipesModule,
    CrawlerModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
