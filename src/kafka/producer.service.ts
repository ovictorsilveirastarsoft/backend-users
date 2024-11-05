import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Kafka, Producer, ProducerRecord } from 'kafkajs';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ProducerService implements OnModuleInit, OnModuleDestroy {
  private readonly producer: Producer;

  constructor(private configService: ConfigService) {
    const kafka = new Kafka({
      brokers: this.configService.get('KAFKA_BROKERS').split(','),
    });

    this.producer = kafka.producer();
  }

  async onModuleInit() {
    await this.producer.connect();
  }

  async onModuleDestroy() {
    await this.producer.disconnect();
  }

  async produce(record: ProducerRecord) {
    try {
      await this.producer.send(record);
    } catch (error) {
      console.error('Error producing Kafka message:', error);
      throw error;
    }
  }
}
