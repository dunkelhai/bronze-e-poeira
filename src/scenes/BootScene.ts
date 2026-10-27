import Phaser from 'phaser';
import { generateTextures } from '../entities/textures';
import { generateValley } from '../entities/Valley';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    generateTextures(this);
    generateValley(this);
    this.scene.start('Title');
  }
}
