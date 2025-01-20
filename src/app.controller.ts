import { Body, Controller, Get, Logger, Post, Response } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  private readonly logger = new Logger(AppController.name);

  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
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
      let userData = await this.appService.getUser(userId);
      let songFound = false;
      if (!userData) {
        this.logger.log(`User not found, creating one for ${userId}`);
        userData = { userId, songs: [songId] };
      } else {
        this.logger.log(`User found, updating for ${userId}`);
        const foundSong = userData.songs.find((song) => song === songId);
        if (!foundSong) {
          this.logger.log(`Adding song ${songId}`);
          userData.songs.push(songId);
        } else {
          this.logger.log(`Removing song ${songId}`);
          userData.songs = userData.songs.filter((song) => song !== songId);
          songFound = true;
        }
      }

      // Save changes to user!
      postPromises.push(this.appService.updateUser(userData));

      // likes table is for saving all likes from users for a song ONLY
      let likesData = await this.appService.getSongLikes(songId);
      if (!likesData) {
        this.logger.log(`Song not found, creating one for ${songId}`);
        likesData = { songId, likes: 1 };
      } else {
        this.logger.log(`Song found, updating for ${songId}`);
        likesData = {
          songId,
          likes: likesData.likes + (!songFound ? 1 : -1),
        };
      }

      // Save changes if any to liked songs!
      postPromises.push(this.appService.updateSongLikes(likesData));

      const settled = await Promise.allSettled(postPromises);
      res.json({ userData, likesData, results: settled });
    } catch (error) {
      this.logger.error(error);
      res.status(500).json({ error: 'Could not create user' });
    }
  }
}
