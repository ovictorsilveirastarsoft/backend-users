import { Injectable, NotFoundException } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cache } from 'cache-manager';
import { Inject } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ProducerService } from '../kafka/producer.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
    private readonly producerService: ProducerService,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
    const user = this.userRepository.create({
      ...createUserDto,
      password: hashedPassword,
    });

    const savedUser = await this.userRepository.save(user);

    await this.producerService.produce({
      topic: 'user-events',
      messages: [
        {
          value: JSON.stringify({
            type: 'USER_CREATED',
            user: { ...savedUser, password: undefined },
          }),
        },
      ],
    });

    await this.clearCache();
    return savedUser;
  }

  async findAll(): Promise<User[]> {
    const cachedUsers = await this.cacheManager.get<User[]>('users:all');
    if (cachedUsers) {
      return cachedUsers;
    }

    const users = await this.userRepository.find({
      select: [
        'id',
        'firstName',
        'lastName',
        'email',
        'isActive',
        'createdAt',
        'updatedAt',
      ],
    });

    await this.cacheManager.set('users:all', users, { ttl: 300 });
    return users;
  }

  async findOne(id: string): Promise<User> {
    const cachedUser = await this.cacheManager.get<User>(`user:${id}`);
    if (cachedUser) {
      return cachedUser;
    }

    const user = await this.userRepository.findOne({
      where: { id },
      select: [
        'id',
        'firstName',
        'lastName',
        'email',
        'isActive',
        'createdAt',
        'updatedAt',
      ],
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    await this.cacheManager.set(`user:${id}`, user, { ttl: 300 });
    return user;
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);

    if (updateUserDto.password) {
      updateUserDto.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    const updatedUser = await this.userRepository.save({
      ...user,
      ...updateUserDto,
    });

    await this.producerService.produce({
      topic: 'user-events',
      messages: [
        {
          value: JSON.stringify({
            type: 'USER_UPDATED',
            user: { ...updatedUser, password: undefined },
          }),
        },
      ],
    });

    await this.clearCache();
    return updatedUser;
  }

  async remove(id: string): Promise<void> {
    const user = await this.findOne(id);
    await this.userRepository.remove(user);

    await this.producerService.produce({
      topic: 'user-events',
      messages: [
        {
          value: JSON.stringify({
            type: 'USER_DELETED',
            userId: id,
          }),
        },
      ],
    });

    await this.clearCache();
  }

  private async clearCache(): Promise<void> {
    await this.cacheManager.del('users:all');
    // You might want to implement a more sophisticated cache clearing strategy
  }
}
