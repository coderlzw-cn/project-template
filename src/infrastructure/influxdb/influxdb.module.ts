import { Module } from '@nestjs/common';
import { ConfigurableInfluxdbModule } from './influxdb.module-definition';
import { InfluxdbService } from './influxdb.service';

@Module({
  providers: [InfluxdbService],
  exports: [InfluxdbService],
})
export class InfluxdbModule extends ConfigurableInfluxdbModule {}
