import { KafkaOptions, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';

export const getKafkaConfig = (configService: ConfigService): KafkaOptions => ({
  transport: Transport.KAFKA,
  options: {
    client: {
      brokers: configService.get('KAFKA_BROKERS').split(','),
    },
    consumer: {
      groupId: 'user-service-consumer',
    },
  },
});
