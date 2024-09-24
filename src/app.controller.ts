import {
  Body,
  Controller,
  Get,
  Logger,
  NotFoundException,
  Param,
  Post,
  Put,
  Response,
} from '@nestjs/common';
import { AppService } from './app.service';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
} from '@aws-sdk/lib-dynamodb';
import {
  DynamoDBClient,
  GetItemCommand,
  QueryCommand,
  ScanCommand,
} from '@aws-sdk/client-dynamodb';

@Controller()
export class AppController {
  private readonly logger = new Logger(AppController.name);
  private readonly LIKES_TABLE = process.env.LIKES_TABLE;
  private readonly USERS_TABLE = process.env.USERS_TABLE;
  private readonly client: DynamoDBClient;
  private readonly docClient: DynamoDBDocumentClient;

  constructor(private readonly appService: AppService) {
    this.client = new DynamoDBClient();
    this.docClient = DynamoDBDocumentClient.from(this.client);
  }

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('/like/:userId/:songId')
  async getLikes(
    @Param('userId') userId,
    @Param('songId') songId,
    @Response() res,
  ) {
    const user = await this.getUserAndSongs(userId, songId);
    res.json({ user });
  }

  private async getUserAndSongs(userId: string, songId: string) {
    let res = null;

    try {
      const command = new QueryCommand({
        TableName: this.USERS_TABLE,
        KeyConditionExpression: '#user_id = :user_id_value',
        ExpressionAttributeNames: {
          '#user_id': 'userId',
        },
        ExpressionAttributeValues: {
          ':user_id_value': { S: userId },
        },
      });
      const { Items, Count } = await this.docClient.send(command);
      this.logger.log(`Count of items = ${Count} for ${userId} and ${songId}`);
      if (Items.length > 0) {
        this.logger.log(Items);
        res = Items.find((item) => item.songId.S === songId);
      } else {
        this.logger.error(`No items found for ${userId}`);
      }
    } catch (error) {
      throw new NotFoundException(
        `Error on ${this.USERS_TABLE}: ${error.message}`,
      );
    }

    return res;
  }

  private async getSongLikes(songId: string) {
    let res = null;

    try {
      const command = new GetCommand({
        TableName: this.LIKES_TABLE,
        Key: {
          songId,
        },
      });
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

  @Post('/like')
  async postLikes(@Body() body, @Response() res) {
    const { userId, songTitle: songId, ...rest } = body;
    const postPromises = [];

    try {
      // users table is for saving what a user has saved
      // users table needs a unique id for a device
      // - option 1 is using a device id that may get disabled if user disables tracking
      // - option 2 is mac address but is also not ideal
      // - option 3 or default is anything generated perhaps the timestamp the app is installed

      //  find if existing user with liked songs
      let userData = await this.getUserAndSongs(userId, songId);
      if (!userData) {
        this.logger.log(`User not found, creating one for ${userId}`);
        userData = { userId, songId, ...rest };
      } else {
        this.logger.log(`User found, updating ${userId}`, userData);
      }
      const usersParams = {
        TableName: this.USERS_TABLE,
        Item: userData,
      };
      postPromises.push(this.docClient.send(new PutCommand(usersParams)));

      // likes table is for saving all likes from users for a song, users are not saved
      // this is an INDEX table
      let likesData = await this.getSongLikes(songId);
      if (!likesData) {
        this.logger.log(`Song not found, creating one for ${songId}`);
        likesData = { songId, likes: 1 };
      } else {
        this.logger.log(`Song found, updating for ${songId}`);
        likesData = { songId, likes: likesData.likes + 1 };
      }

      const likesParams = {
        TableName: this.LIKES_TABLE,
        Item: likesData,
      };
      postPromises.push(this.docClient.send(new PutCommand(likesParams)));

      const settled = await Promise.allSettled(postPromises);
      res.json({ userId, user: userData, results: settled });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Could not create user' });
    }
  }
}
