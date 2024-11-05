import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Kafka, Consumer } from 'kafkajs';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ConsumerService implements OnModuleInit, OnModuleDestroy {
  private readonly consumer: Consumer;

  constructor(private configService: ConfigService) {
    const kafka = new Kafka({
      brokers: this.configService.get('KAFKA_BROKERS').split(','),
    });

    this.consumer = kafka.consumer({ groupId: 'user-service-consumer' });
  }

  async onModuleInit() {
    await this.consumer.connect();
    await this.consumer.subscribe({
      topic: 'user-events',
      fromBeginning: false,
    });

    await this.consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const value = JSON.parse(message.value.toString());
          console.log(`Processed message from topic ${topic}:`, value);
          // Implement your message handling logic here
        } catch (error) {
          console.error('Error processing Kafka message:', error);
        }
      },
    });
  }

  async onModuleDestroy() {
    await this.consumer.disconnect();
  }
}
