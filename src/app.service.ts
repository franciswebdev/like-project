import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
} from '@aws-sdk/lib-dynamodb';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);

  private readonly LIKES_TABLE = process.env.LIKES_TABLE;
  private readonly USERS_TABLE = process.env.USERS_TABLE;
  private readonly client: DynamoDBClient;
  private readonly docClient: DynamoDBDocumentClient;

  constructor() {
    this.client = new DynamoDBClient();
    this.docClient = DynamoDBDocumentClient.from(this.client);
  }

  getHello(): string {
    return 'Like project is OK!';
  }

  public async getSongLikes(songId: string) {
    let res = null;

    try {
      const params = {
        TableName: this.LIKES_TABLE,
        Key: {
          songId,
        },
      };
      this.logger.log(`Table ${params.TableName} and Key ${params.Key} --`);
      const command = new GetCommand(params);
      const { Item } = await this.docClient.send(command);
      if (Item) {
        const { songId, likes } = Item;
        res = { songId, likes };
      }
    } catch (error) {
      throw new NotFoundException(
        `Error on ${this.LIKES_TABLE}: ${error.message}`,
      );
    }

    return res;
  }

  public async getUser(
    userId: string,
  ): Promise<{ userId: string; songs: string[] }> {
    let res = null;

    try {
      const params = {
        TableName: this.USERS_TABLE,
        Key: {
          userId,
        },
      };
      this.logger.log(`Table ${params.TableName} and Key ${params.Key} --`);
      const command = new GetCommand(params);
      const { Item } = await this.docClient.send(command);
      if (Item) {
        const { userId, songs } = Item;
        res = { userId, songs };
      }
    } catch (error) {
      throw new NotFoundException(
        `Error on ${this.USERS_TABLE}: ${error.message}`,
      );
    }

    return res;
  }

  public updateUser(userData) {
    const usersParams = {
      TableName: this.USERS_TABLE,
      Item: userData,
    };
    
    return this.docClient.send(new PutCommand(usersParams));
  }

  public updateSongLikes(likesData) {
    const likesParams = {
      TableName: this.LIKES_TABLE,
      Item: likesData,
    };
    return this.docClient.send(new PutCommand(likesParams));
  }
}
